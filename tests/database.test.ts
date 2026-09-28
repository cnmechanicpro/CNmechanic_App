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
	  requestA=(await db.query<{id:string}>("select public.create_marketplace_service_request(p_vehicle_id=>$1,p_service_id=>$2,p_organization_id=>$3,p_location_id=>$4,p_submit=>false,p_idempotency_key=>'request-a') as id",[vehicleA,serviceX,orgA,locationA])).rows[0].id;
	  expect(requestA).toBeTruthy();
	  await expect(db.query("select public.create_marketplace_service_request(p_vehicle_id=>$1,p_service_id=>$2,p_idempotency_key=>'wrong-owner')",[vehicleB,serviceX])).rejects.toThrow(/vehicle access denied/);
	  await expect(db.query("select public.create_marketplace_service_request(p_vehicle_id=>$1,p_service_id=>$2,p_organization_id=>$3,p_location_id=>$4,p_idempotency_key=>'wrong-service')",[vehicleA,serviceX,orgB,locationB])).rejects.toThrow(/does not offer service/);
	  await expect(db.query("select public.create_marketplace_service_request(p_vehicle_id=>$1,p_service_id=>$2,p_organization_id=>$3,p_location_id=>$4,p_idempotency_key=>'wrong-location')",[vehicleA,serviceX,orgA,locationB])).rejects.toThrow(/location does not belong/);
	  await expect(db.query("select public.create_marketplace_service_request(p_vehicle_id=>$1,p_service_id=>$2,p_organization_id=>$3,p_location_id=>$4,p_idempotency_key=>'location-mismatch')",[vehicleA,serviceY,orgA,locationA])).rejects.toThrow(/does not offer service/);
	 });
	 await asUser(b,async()=>{await expect(db.query('select public.cancel_service_request($1,$2)',[requestA,'attack'])).rejects.toThrow(/request access denied/);expect((await db.query('select id from public.service_requests where id=$1',[requestA])).rows).toEqual([]);});
	});
	it('enforces the Phase 4 request transition graph and terminal states',async()=>{
	 await db.exec('set role service_role');try{
	  await expect(db.query("update public.service_requests set status='ASSIGNED' where id=$1",[requestA])).rejects.toThrow(/invalid service request transition/);
	  expect((await db.query("update public.service_requests set status='SUBMITTED' where id=$1 returning status,submitted_at",[requestA])).rows[0]).toMatchObject({status:'SUBMITTED',submitted_at:expect.any(Date)});
	  expect((await db.query("update public.service_requests set status='MATCHING' where id=$1 returning status,matching_started_at",[requestA])).rows[0]).toMatchObject({status:'MATCHING',matching_started_at:expect.any(Date)});
	  await expect(db.query("update public.service_requests set status='DRAFT' where id=$1",[requestA])).rejects.toThrow(/invalid service request transition/);
	  expect((await db.query("update public.service_requests set status='NO_MATCH' where id=$1 returning status",[requestA])).rows).toEqual([{status:'NO_MATCH'}]);
	  await expect(db.query("update public.service_requests set status='SUBMITTED' where id=$1",[requestA])).rejects.toThrow(/invalid service request transition/);
	 }finally{await db.exec('reset role');}
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
	it('installs vehicle and marketplace privacy policies with current-owner integrity',async()=>{const policies=await db.query<{policyname:string}>("select policyname from pg_policies where schemaname='public' and tablename in ('vehicles','vehicle_ownerships','service_requests','job_offers','service_request_assignments')");expect(policies.rows.map(row=>row.policyname)).toEqual(expect.arrayContaining(['vehicles_read_authorized','ownerships_read_self_or_admin','service_requests_read_authorized','job_offers_read_authorized','assignments_read_authorized']));const indexes=await db.query<{indexname:string}>("select indexname from pg_indexes where schemaname='public' and tablename='vehicle_ownerships'");expect(indexes.rows.map(row=>row.indexname)).toContain('vehicle_ownerships_one_current_owner_idx');});
 it('publishes only authoritative mechanic and shop marketplace records',async()=>{
  const specialty='80000000-0000-4000-8000-000000000001';
  await db.exec(`set role service_role;
   update public.organizations set status='CN_VERIFIED',public_visibility='PUBLISHED',description='European repair specialists' where id='${orgA}';
   update public.locations set public_visibility='PUBLISHED',city='Boston',region='MA',postal_code='02108' where id='${locationA}';
   insert into public.professional_profiles(profile_id,public_name,headline,slug,lifecycle_status,verification_status,verified_at,operation_mode,mobile_capable,public_visibility)
    values ('${a}','Alex Technician','European diagnostics','alex-technician','ELIGIBLE_FOR_JOBS','VERIFIED',now(),'HYBRID',true,'PUBLISHED')
    on conflict(profile_id) do update set public_name=excluded.public_name,headline=excluded.headline,slug=excluded.slug,lifecycle_status=excluded.lifecycle_status,verification_status=excluded.verification_status,verified_at=excluded.verified_at,operation_mode=excluded.operation_mode,mobile_capable=excluded.mobile_capable,public_visibility=excluded.public_visibility;
   insert into public.specialties(id,name,slug) values ('${specialty}','European diagnostics','european-diagnostics');
   insert into public.professional_services(mechanic_id,service_id) select id,'${serviceX}' from public.professional_profiles where profile_id='${a}';
   insert into public.organization_vehicle_makes(organization_id,vehicle_make_id) values ('${orgA}','${make}');
   insert into public.professional_vehicle_makes(mechanic_id,vehicle_make_id) select id,'${make}' from public.professional_profiles where profile_id='${a}';
   insert into public.professional_specialties(mechanic_id,specialty_id) select id,'${specialty}' from public.professional_profiles where profile_id='${a}';
   insert into public.mechanic_service_areas(mechanic_id,label,city,region,postal_code,latitude,longitude,radius_miles) select id,'Metro service area','Boston','MA','02108',42.3601,-71.0589,35 from public.professional_profiles where profile_id='${a}';
   reset role;`);
  await db.exec('set role anon');try{
   const mechanics=await db.query<{slug:string;public_name:string;total_count:bigint}>("select slug,public_name,total_count from public.search_public_mechanics(p_service_slug=>'service-x',p_vehicle_make_slug=>'saab',p_specialty_slug=>'european-diagnostics',p_city=>'Boston')");
   expect(mechanics.rows).toHaveLength(1);expect(mechanics.rows[0]).toMatchObject({slug:'alex-technician',public_name:'Alex Technician'});
   expect((await db.query("select slug from public.search_public_mechanics(p_slug=>'alex-technician',p_limit=>1)")).rows).toEqual([{slug:'alex-technician'}]);
   const shops=await db.query<{slug:string;total_count:bigint}>("select slug,total_count from public.search_public_shops(p_service_slug=>'service-x',p_vehicle_make_slug=>'saab',p_city=>'Boston')");expect(shops.rows).toHaveLength(1);expect(shops.rows[0].slug).toBe('a');
   await expect(db.exec('select profile_id from public.professional_profiles')).rejects.toThrow(/permission denied/);
  }finally{await db.exec('reset role');}
 });
	it('rejects self-verification and hides non-public providers',async()=>{
  await asUser(a,async()=>{await expect(db.exec("update public.professional_profiles set verification_status='VERIFIED' where profile_id=auth.uid()")).rejects.toThrow(/permission denied/);await expect(db.exec("update public.professional_profiles set lifecycle_status='ELIGIBLE_FOR_JOBS' where profile_id=auth.uid()")).rejects.toThrow(/permission denied/);});
  await db.exec(`set role service_role;update public.professional_profiles set public_visibility='HIDDEN' where profile_id='${a}';reset role;set role anon;`);try{expect((await db.query('select * from public.search_public_mechanics()')).rows).toEqual([]);}finally{await db.exec('reset role');await db.exec(`set role service_role;update public.professional_profiles set public_visibility='PUBLISHED' where profile_id='${a}';reset role;`);}
	});
	it('matches only eligible providers, creates bounded offers, and isolates mechanics',async()=>{
	 const mechanicB='80000000-0000-4000-8000-000000000020';
	 await db.exec(`set role service_role;
	  insert into public.professional_profiles(id,profile_id,public_name,headline,slug,lifecycle_status,verification_status,verified_at,operation_mode,mobile_capable,public_visibility)
	   values ('${mechanicB}','${b}','Blair Mechanic','Mobile Saab specialist','blair-mechanic','ELIGIBLE_FOR_JOBS','VERIFIED',now(),'INDEPENDENT',true,'PUBLISHED');
	  insert into public.professional_services(mechanic_id,service_id) values ('${mechanicB}','${serviceX}');
	  insert into public.professional_vehicle_makes(mechanic_id,vehicle_make_id) values ('${mechanicB}','${make}');
	  insert into public.mechanic_service_areas(mechanic_id,label,city,region,postal_code) values ('${mechanicB}','Boston','Boston','MA','02108');
	  reset role;`);
	 let requestId='';
	 await asUser(a,async()=>{requestId=(await db.query<{id:string}>("select public.create_marketplace_service_request(p_vehicle_id=>$1,p_service_id=>$2,p_city=>'Boston',p_region=>'MA',p_mobile_service_preference=>'MOBILE',p_idempotency_key=>'phase4-match') as id",[vehicleA,serviceX])).rows[0].id;});
	 await db.exec('set role service_role');try{
	  const candidates=await db.query<{mechanic_id:string}>('select mechanic_id from private.find_eligible_providers($1,10)',[requestId]);expect(candidates.rows.map(row=>row.mechanic_id)).toContain(mechanicB);
	  expect((await db.query<{count:number}>("select private.create_job_offers($1,array[$2]::uuid[],now()+interval '1 hour') as count",[requestId,mechanicB])).rows).toEqual([{count:1}]);
	 }finally{await db.exec('reset role');}
	 const offer=(await db.query<{id:string}>('select id from public.job_offers where service_request_id=$1 and mechanic_id=$2',[requestId,mechanicB])).rows[0].id;
	 await asUser(a,async()=>{expect((await db.query('select id from public.job_offers where id=$1',[offer])).rows).toEqual([]);await expect(db.query("insert into public.job_offers(service_request_id,mechanic_id,expires_at) values($1,$2,now()+interval '1 hour')",[requestId,mechanicB])).rejects.toThrow(/permission denied/);});
	 await asUser(b,async()=>{expect((await db.query('select id,status from public.job_offers where id=$1',[offer])).rows).toEqual([{id:offer,status:'OFFERED'}]);});
	 await asUser(a,async()=>{await expect(db.query('select public.respond_to_job_offer($1,true)',[offer])).rejects.toThrow(/offer access denied/);});
	 return {requestId,offer,mechanicB};
	});
	it('separates acceptance from customer confirmation and creates exactly one assignment',async()=>{
	 const row=(await db.query<{id:string;service_request_id:string;mechanic_id:string}>("select id,service_request_id,mechanic_id from public.job_offers where status='OFFERED' order by created_at desc limit 1")).rows[0];
	 await asUser(b,async()=>{expect((await db.query('select public.respond_to_job_offer($1,true) as request_id',[row.id])).rows).toEqual([{request_id:row.service_request_id}]);});
	 expect((await db.query('select status from public.service_requests where id=$1',[row.service_request_id])).rows).toEqual([{status:'PENDING_CUSTOMER_CONFIRMATION'}]);
	 await asUser(a,async()=>{const assigned=await db.query<{id:string}>('select public.confirm_job_offer($1) as id',[row.id]);expect(assigned.rows[0].id).toBeTruthy();await expect(db.query('select public.confirm_job_offer($1)',[row.id])).rejects.toThrow(/cannot be confirmed/);});
	 expect((await db.query('select mechanic_id,status from public.service_request_assignments where service_request_id=$1',[row.service_request_id])).rows).toEqual([{mechanic_id:row.mechanic_id,status:'ASSIGNED'}]);
	 expect((await db.query('select count(*)::int as count from public.service_request_assignments where service_request_id=$1',[row.service_request_id])).rows).toEqual([{count:1}]);
	});
	it('rejects expired offers, cancelled-request acceptance, and ineligible dispatch',async()=>{
	 const mechanicB='80000000-0000-4000-8000-000000000020';let expiredRequest='',cancelledRequest='';
	 await asUser(a,async()=>{expiredRequest=(await db.query<{id:string}>("select public.create_marketplace_service_request(p_vehicle_id=>$1,p_service_id=>$2,p_idempotency_key=>'phase4-expired') as id",[vehicleA,serviceX])).rows[0].id;cancelledRequest=(await db.query<{id:string}>("select public.create_marketplace_service_request(p_vehicle_id=>$1,p_service_id=>$2,p_idempotency_key=>'phase4-cancel') as id",[vehicleA,serviceX])).rows[0].id;});
	 let expiredOffer='',cancelledOffer='';await db.exec('set role service_role');try{
	  await db.query("update public.service_requests set status='MATCHING' where id in ($1,$2)",[expiredRequest,cancelledRequest]);await db.query("update public.service_requests set status='OFFERS_SENT' where id in ($1,$2)",[expiredRequest,cancelledRequest]);
	  expiredOffer=(await db.query<{id:string}>("insert into public.job_offers(service_request_id,mechanic_id,offered_at,expires_at) values($1,$2,now()-interval '2 hours',now()-interval '1 hour') returning id",[expiredRequest,mechanicB])).rows[0].id;
	  cancelledOffer=(await db.query<{id:string}>("insert into public.job_offers(service_request_id,mechanic_id,expires_at) values($1,$2,now()+interval '1 hour') returning id",[cancelledRequest,mechanicB])).rows[0].id;
	 }finally{await db.exec('reset role');}
	 await asUser(a,async()=>{await db.query("select public.cancel_service_request($1,'no longer needed')",[cancelledRequest]);});
	 await asUser(b,async()=>{await expect(db.query('select public.respond_to_job_offer($1,true)',[expiredOffer])).rejects.toThrow(/no longer available/);await expect(db.query('select public.respond_to_job_offer($1,true)',[cancelledOffer])).rejects.toThrow(/no longer available/);});
	 await db.exec(`set role service_role;update public.professional_profiles set verification_status='UNDER_REVIEW',verified_at=null,public_visibility='HIDDEN' where id='${mechanicB}';reset role;`);
	 const request=(await db.query<{id:string}>('select id from public.service_requests where status=$1 limit 1',['SUBMITTED'])).rows[0]?.id;if(request){await db.exec('set role service_role');try{await expect(db.query("select private.create_job_offers($1,array[$2]::uuid[],now()+interval '1 hour')",[request,mechanicB])).rejects.toThrow(/ineligible mechanic/);}finally{await db.exec('reset role');}}
	});
 it('allows an owner-scoped claim without exposing claim or duplicate-review internals',async()=>{
  await db.exec(`set role service_role;update public.organizations set status='UNCLAIMED',public_visibility='PUBLISHED' where id='${orgB}';reset role;`);
  await asUser(a,async()=>{const claim=await db.query('insert into public.business_claims(organization_id,claimant_profile_id,claim_type) values($1,$2,$3) returning status',[orgB,a,'OWNER']);expect(claim.rows).toEqual([{status:'SUBMITTED'}]);await expect(db.query('insert into public.business_claims(organization_id,claimant_profile_id,claim_type) values($1,$2,$3)',[orgB,b,'OWNER'])).rejects.toThrow(/row-level security/);});
  await asUser(b,async()=>{expect((await db.query('select id from public.business_claims')).rows).toEqual([]);await expect(db.exec('select * from private.organization_duplicate_candidates')).rejects.toThrow(/permission denied/);});
 });
 it('enables RLS on every created public table',async()=>{expect((await db.query("select relname from pg_class join pg_namespace n on n.oid=relnamespace where n.nspname='public' and relkind='r' and not relrowsecurity")).rows).toEqual([]);});
});
