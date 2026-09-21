import { PGlite } from '@electric-sql/pglite';
import { readFileSync,readdirSync } from 'node:fs';
import { beforeAll,afterAll,describe,it,expect } from 'vitest';
const a='10000000-0000-4000-8000-000000000001',b='10000000-0000-4000-8000-000000000002';
const orgA='20000000-0000-4000-8000-000000000001',orgB='20000000-0000-4000-8000-000000000002';
let db:PGlite;
beforeAll(async()=>{
 db=new PGlite();
 // Real PostgreSQL engine; emulate only Supabase's pre-existing auth schema/roles.
 await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth; create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth,public to anon,authenticated,service_role;
 grant execute on function auth.uid() to anon,authenticated,service_role;`);
 for(const file of readdirSync('supabase/migrations').sort())await db.exec(readFileSync(`supabase/migrations/${file}`,'utf8'));
 await db.exec(`insert into auth.users values ('${a}'),('${b}'); insert into public.organizations(id,name) values ('${orgA}','A'),('${orgB}','B');insert into public.organization_memberships(organization_id,user_id,role) values ('${orgA}','${a}','SHOP_OWNER'),('${orgA}','${a}','TECHNICIAN'),('${orgB}','${b}','SHOP_OWNER');`);
},30000);
afterAll(async()=>{await db.close();});
async function asUser<T>(id:string,work:()=>Promise<T>){await db.exec(`set role authenticated;set request.jwt.claim.sub='${id}';`);try{return await work();}finally{await db.exec('reset role;reset request.jwt.claim.sub;');}}
describe('migration replay and PostgreSQL RLS',()=>{
 it('provisions private profiles without metadata-derived privileges',async()=>{expect((await db.query('select * from public.profiles')).rows).toHaveLength(2);});
 it('only sees its own profile',async()=>{await asUser(a,async()=>{expect((await db.query('select id from public.profiles')).rows).toEqual([{id:a}]);});});
 it('cannot update another profile',async()=>{await asUser(a,async()=>{expect((await db.query('update public.profiles set display_name=$1 where id=$2 returning id',['attack',b])).rows).toEqual([]);});});
 it('can update only its own allowed field',async()=>{await asUser(a,async()=>{expect((await db.query('update public.profiles set display_name=$1 where id=$2 returning display_name',['Owner A',a])).rows).toEqual([{display_name:'Owner A'}]);});});
 it('cannot reassign ownership or creation timestamp',async()=>{await asUser(a,async()=>{await expect(db.query('update public.profiles set id=$1 where id=$2',[b,a])).rejects.toThrow(/permission denied/);await expect(db.exec('update public.profiles set created_at=now()')).rejects.toThrow(/permission denied/);});});
 it('denies anonymous reads and writes',async()=>{await db.exec('set role anon');try{await expect(db.exec('select * from public.profiles')).rejects.toThrow(/permission denied/);await expect(db.exec("update public.profiles set display_name='x'")).rejects.toThrow(/permission denied/);}finally{await db.exec('reset role');}});
 it('denies user inserts, deletes, role escalation and provisioning',async()=>{await asUser(a,async()=>{await expect(db.query('insert into public.profiles(id) values($1)',[a])).rejects.toThrow(/permission denied/);await expect(db.exec('delete from public.profiles')).rejects.toThrow(/permission denied/);await expect(db.exec("update public.organization_memberships set role='SHOP_OWNER'")).rejects.toThrow(/permission denied/);await expect(db.exec("insert into public.organizations(name) values('attack')")).rejects.toThrow(/permission denied/);});});
 it('supports multiple roles and isolates organizations and memberships',async()=>{await asUser(a,async()=>{expect((await db.query('select id from public.organizations')).rows).toEqual([{id:orgA}]);expect((await db.query('select * from public.organization_memberships')).rows).toHaveLength(2);});await asUser(b,async()=>{expect((await db.query('select id from public.organizations')).rows).toEqual([{id:orgB}]);});});
 it('revocation takes effect on the next query',async()=>{await db.query('update public.organization_memberships set active=false where user_id=$1',[b]);await asUser(b,async()=>{expect((await db.query('select * from public.organizations')).rows).toEqual([]);});});
 it('does not expose private provisioning function',async()=>{await asUser(a,async()=>{await expect(db.exec('select private.create_profile()')).rejects.toThrow(/permission denied/);});});
 it('enables RLS on every created public table',async()=>{expect((await db.query("select relname from pg_class join pg_namespace n on n.oid=relnamespace where n.nspname='public' and relkind='r' and not relrowsecurity")).rows).toEqual([]);});
});
