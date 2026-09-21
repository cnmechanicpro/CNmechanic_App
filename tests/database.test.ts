import { PGlite } from '@electric-sql/pglite';
import { readFileSync,readdirSync } from 'node:fs';
import { beforeAll,afterAll,describe,it,expect } from 'vitest';
const a='10000000-0000-4000-8000-000000000001',b='10000000-0000-4000-8000-000000000002';
const orgA='20000000-0000-4000-8000-000000000001',orgB='20000000-0000-4000-8000-000000000002';
const make='70000000-0000-4000-8000-000000000001', model='70000000-0000-4000-8000-000000000002';
const category='70000000-0000-4000-8000-000000000003', serviceX='70000000-0000-4000-8000-000000000004',serviceY='70000000-0000-4000-8000-000000000005',serviceB='70000000-0000-4000-8000-000000000006';
const locationA='70000000-0000-4000-8000-000000000007',locationB='70000000-0000-4000-8000-000000000008',vehicleB='70000000-0000-4000-8000-000000000009';
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
 await db.exec(`insert into auth.users values ('${a}'),('${b}'); insert into public.organizations(id,name,legal_name,slug) values ('${orgA}','A','A LLC','a'),('${orgB}','B','B LLC','b');insert into public.organization_memberships(organization_id,user_id,role) values ('${orgA}','${a}','SHOP_OWNER'),('${orgA}','${a}','TECHNICIAN'),('${orgB}','${b}','SHOP_OWNER');`);
 await db.exec(`insert into public.vehicle_makes(id,name,slug) values ('${make}','Saab','saab');
 insert into public.vehicle_models(id,make_id,name,slug) values ('${model}','${make}','9-3','9-3');
 insert into public.service_categories(id,name,slug) values ('${category}','Certification','certification');
 insert into public.services(id,category_id,name,slug) values ('${serviceX}','${category}','Service X','service-x'),('${serviceY}','${category}','Service Y','service-y'),('${serviceB}','${category}','Service B','service-b');
 insert into public.locations(id,organization_id,name,slug,location_type) values ('${locationA}','${orgA}','A Mobile','a-mobile','MOBILE'),('${locationB}','${orgB}','B Mobile','b-mobile','MOBILE');
 insert into public.organization_services(organization_id,service_id) values ('${orgA}','${serviceX}'),('${orgA}','${serviceY}'),('${orgB}','${serviceB}');
 insert into public.location_services(location_id,service_id) values ('${locationA}','${serviceX}'),('${locationB}','${serviceB}');
 insert into public.vehicles(id,model_id,model_year,propulsion_type) values ('${vehicleB}','${model}',2023,'ICE_GASOLINE');
 insert into public.vehicle_ownerships(vehicle_id,owner_profile_id) values ('${vehicleB}','${b}');`);
},30000);
afterAll(async()=>{await db.close();});
async function asUser<T>(id:string,work:()=>Promise<T>){await db.exec(`set role authenticated;set request.jwt.claim.sub='${id}';`);try{return await work();}finally{await db.exec('reset role;reset request.jwt.claim.sub;');}}
async function rpcVehicle(modelId:string,vin:string|null=null){return db.query<{id:string}>('select public.create_vehicle_with_owner($1::uuid,2024::smallint,null::text,null::text,\'HYBRID\'::text,null::text,null::text,null::integer,$2::text) as id',[modelId,vin]);}
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
 it('enforces organization-to-location service capabilities in both directions',async()=>{const organization='50000000-0000-4000-8000-000000000001',location='50000000-0000-4000-8000-000000000002',category='50000000-0000-4000-8000-000000000003',x='50000000-0000-4000-8000-000000000004',y='50000000-0000-4000-8000-000000000005';await db.exec(`set role service_role;insert into public.organizations(id,name,legal_name,slug) values ('${organization}','Capability Shop','Capability Shop LLC','capability-shop');insert into public.locations(id,organization_id,name,slug,location_type) values ('${location}','${organization}','Main','main','MOBILE');insert into public.service_categories(id,name,slug) values ('${category}','Maintenance','maintenance');insert into public.services(id,category_id,name,slug) values ('${x}','${category}','Oil Change','oil-change'),('${y}','${category}','Brake Service','brake-service');insert into public.organization_services(organization_id,service_id) values ('${organization}','${x}');insert into public.location_services(location_id,service_id) values ('${location}','${x}');reset role;`);await db.exec('set role service_role');try{await expect(db.exec(`insert into public.location_services(location_id,service_id) values ('${location}','${y}')`)).rejects.toThrow(/must be enabled/);await expect(db.exec(`update public.organization_services set status='INACTIVE' where organization_id='${organization}' and service_id='${x}'`)).rejects.toThrow(/active location dependencies/);await expect(db.exec(`delete from public.organization_services where organization_id='${organization}' and service_id='${x}'`)).rejects.toThrow(/active location dependencies/);}finally{await db.exec('reset role');}});
 it('rejects anonymous vehicle creation and preserves ownership constraints',async()=>{const make='60000000-0000-4000-8000-000000000001',model='60000000-0000-4000-8000-000000000002',vehicle='60000000-0000-4000-8000-000000000003';await db.exec(`set role service_role;insert into public.vehicle_makes(id,name,slug) values ('${make}','Volvo','volvo');insert into public.vehicle_models(id,make_id,name,slug) values ('${model}','${make}','XC60','xc60');insert into public.vehicles(id,model_id,model_year,propulsion_type) values ('${vehicle}','${model}',2024,'HYBRID');insert into public.vehicle_ownerships(vehicle_id,owner_profile_id) values ('${vehicle}','${a}');reset role;`);await db.exec('set role anon');try{await expect(db.exec(`select public.create_vehicle_with_owner('${model}'::uuid,2024::smallint,null::text,null::text,'HYBRID'::text,null::text,null::text,null::integer,null::text)`)).rejects.toThrow(/permission denied/);}finally{await db.exec('reset role');}await db.exec('set role service_role');try{await expect(db.exec(`insert into public.vehicle_ownerships(vehicle_id,owner_profile_id) values ('${vehicle}','${b}')`)).rejects.toThrow(/duplicate/);await expect(db.exec(`insert into public.vehicle_ownerships(vehicle_id,owner_profile_id,ownership_status,ownership_ended_at) values ('${vehicle}','${b}','CURRENT',now())`)).rejects.toThrow();await expect(db.exec(`insert into public.vehicle_ownerships(vehicle_id,owner_profile_id,ownership_status) values ('${vehicle}','${b}','FORMER')`)).rejects.toThrow();}finally{await db.exec('reset role');}});
 let vehicleA:string;
 it('creates a vehicle and exactly one current owner from auth.uid, rejecting invalid references and VINs',async()=>{
  await asUser(a,async()=>{
   vehicleA=(await rpcVehicle(model,'YS3FD79Y276000001')).rows[0].id;
   expect((await db.query('select id from public.vehicles where id=$1',[vehicleA])).rows).toEqual([{id:vehicleA}]);
   expect((await db.query('select owner_profile_id,ownership_status from public.vehicle_ownerships where vehicle_id=$1',[vehicleA])).rows).toEqual([{owner_profile_id:a,ownership_status:'CURRENT'}]);
   await expect(rpcVehicle('70000000-0000-4000-8000-000000000099')).rejects.toThrow(/foreign key/);
   await expect(rpcVehicle(model,'INVALID')).rejects.toThrow(/check constraint/);
  });
 });
 it('isolates vehicle and ownership data across authenticated users',async()=>{
  await asUser(b,async()=>{
   expect((await db.query('select id from public.vehicles where id=$1',[vehicleA])).rows).toEqual([]);
   await expect(db.query('update public.vehicles set mileage=99 where id=$1',[vehicleA])).rejects.toThrow(/permission denied/);
   expect((await db.query('select id from public.vehicle_ownerships where vehicle_id=$1',[vehicleA])).rows).toEqual([]);
   await expect(db.query('insert into public.vehicle_ownerships(vehicle_id,owner_profile_id) values($1,$2)',[vehicleA,b])).rejects.toThrow(/permission denied/);
   await expect(db.query('update public.vehicle_ownerships set ownership_status=$1 where vehicle_id=$2',['FORMER',vehicleA])).rejects.toThrow(/permission denied/);
  });
 });
 it('rejects contradictory ownership records at the database layer',async()=>{
  await expect(db.query('insert into public.vehicle_ownerships(vehicle_id,owner_profile_id) values($1,$2)',[vehicleA,b])).rejects.toThrow(/duplicate/);
  await expect(db.query("insert into public.vehicle_ownerships(vehicle_id,owner_profile_id,ownership_status,ownership_ended_at) values($1,$2,'CURRENT',now())",[vehicleA,b])).rejects.toThrow(/check constraint/);
  await expect(db.query("insert into public.vehicle_ownerships(vehicle_id,owner_profile_id,ownership_status) values($1,$2,'FORMER')",[vehicleA,b])).rejects.toThrow(/check constraint/);
 });
 let requestA:string;
 it('authorizes a service request only for an owned vehicle and offered location service',async()=>{
  await asUser(a,async()=>{
   requestA=(await db.query<{id:string}>('insert into public.service_requests(customer_profile_id,vehicle_id,organization_id,location_id,service_id) values($1,$2,$3,$4,$5) returning id',[a,vehicleA,orgA,locationA,serviceX])).rows[0].id;
   expect(requestA).toBeTruthy();
   await expect(db.query('insert into public.service_requests(customer_profile_id,vehicle_id,organization_id,location_id,service_id) values($1,$2,$3,$4,$5)',[a,vehicleB,orgA,locationA,serviceX])).rejects.toThrow(/row-level security/);
   await expect(db.query('insert into public.service_requests(customer_profile_id,vehicle_id,organization_id,location_id,service_id) values($1,$2,$3,$4,$5)',[a,vehicleA,orgB,locationB,serviceX])).rejects.toThrow(/row-level security/);
   await expect(db.query('insert into public.service_requests(customer_profile_id,vehicle_id,organization_id,location_id,service_id) values($1,$2,$3,$4,$5)',[a,vehicleA,orgA,locationB,serviceX])).rejects.toThrow(/location does not belong/);
   await expect(db.query('insert into public.service_requests(customer_profile_id,vehicle_id,organization_id,location_id,service_id) values($1,$2,$3,$4,$5)',[a,vehicleA,orgA,locationA,serviceY])).rejects.toThrow(/row-level security/);
  });
  await asUser(b,async()=>{expect((await db.query("update public.service_requests set status='CANCELLED' where id=$1 returning id",[requestA])).rows).toEqual([]);});
 });
 it('enforces draft, submitted and terminal request transitions',async()=>{
  await asUser(a,async()=>{
   await expect(db.query("update public.service_requests set status='CLOSED' where id=$1",[requestA])).rejects.toThrow(/invalid service request transition/);
   expect((await db.query("update public.service_requests set status='SUBMITTED' where id=$1 returning status,submitted_at",[requestA])).rows[0]).toMatchObject({status:'SUBMITTED',submitted_at:expect.any(Date)});
   await expect(db.query("update public.service_requests set status='DRAFT' where id=$1",[requestA])).rejects.toThrow(/invalid service request transition/);
   expect((await db.query("update public.service_requests set status='CLOSED' where id=$1 returning status,closed_at",[requestA])).rows[0]).toMatchObject({status:'CLOSED',closed_at:expect.any(Date)});
   await expect(db.query("update public.service_requests set status='CANCELLED' where id=$1",[requestA])).rejects.toThrow(/invalid service request transition/);
   const cancelled=(await db.query<{id:string}>('insert into public.service_requests(customer_profile_id,vehicle_id,organization_id,location_id,service_id) values($1,$2,$3,$4,$5) returning id',[a,vehicleA,orgA,locationA,serviceX])).rows[0].id;
   expect((await db.query("update public.service_requests set status='CANCELLED' where id=$1 returning status",[cancelled])).rows).toEqual([{status:'CANCELLED'}]);
   await expect(db.query("update public.service_requests set status='SUBMITTED' where id=$1",[cancelled])).rejects.toThrow(/invalid service request transition/);
  });
 });
 it('validates professional assignments against active membership in each organization',async()=>{
  await db.query('insert into public.professional_profiles(profile_id) values($1)',[a]);
  await asUser(a,async()=>{
   await db.query('insert into public.professional_location_assignments(profile_id,location_id) values($1,$2)',[a,locationA]);
   await expect(db.query('insert into public.professional_location_assignments(profile_id,location_id) values($1,$2)',[a,locationB])).rejects.toThrow(/permission denied|row-level security|must belong/);
  });
  await expect(db.query('insert into public.professional_location_assignments(profile_id,location_id) values($1,$2)',[a,locationB])).rejects.toThrow(/professional must belong/);
  await db.query('insert into public.organization_memberships(organization_id,user_id,role) values($1,$2,$3)',[orgB,a,'SHOP_MANAGER']);
  await asUser(a,async()=>{await db.query('insert into public.professional_location_assignments(profile_id,location_id) values($1,$2)',[a,locationB]);expect((await db.query('select location_id from public.professional_location_assignments where profile_id=$1 and location_id=$2',[a,locationB])).rows).toEqual([{location_id:locationB}]);});
 });
 it('installs vehicle privacy policies and current-owner integrity',async()=>{const policies=await db.query<{policyname:string}>("select policyname from pg_policies where schemaname='public' and tablename in ('vehicles','vehicle_ownerships','service_requests')");expect(policies.rows.map(row=>row.policyname)).toEqual(expect.arrayContaining(['vehicles_read_authorized','ownerships_read_self_or_admin','service_requests_create_owner']));const indexes=await db.query<{indexname:string}>("select indexname from pg_indexes where schemaname='public' and tablename='vehicle_ownerships'");expect(indexes.rows.map(row=>row.indexname)).toContain('vehicle_ownerships_one_current_owner_idx');});
 it('enables RLS on every created public table',async()=>{expect((await db.query("select relname from pg_class join pg_namespace n on n.oid=relnamespace where n.nspname='public' and relkind='r' and not relrowsecurity")).rows).toEqual([]);});
});
