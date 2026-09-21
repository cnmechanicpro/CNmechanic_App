import { profileSchema,organizationRoleSchema,organizationSchema } from '@cnmechanic/schemas';
import type { IdentityRepository } from '@cnmechanic/domain';
import type { Identity } from './auth';
import { AppError } from './errors';
export function identityRepository(identity:Identity):IdentityRepository{
 async function profile(displayName?:string){
  const query=displayName===undefined?identity.client.from('profiles').select('id,display_name,created_at').eq('id',identity.userId):identity.client.from('profiles').update({display_name:displayName}).eq('id',identity.userId).select('id,display_name,created_at');
  const {data,error}=await query.single();if(error || !data)throw new AppError('SERVICE_UNAVAILABLE',503,'Profile is unavailable.');
  return profileSchema.parse({id:data.id,displayName:data.display_name,createdAt:new Date(data.created_at as string).toISOString()});
 }
 return {getProfile:()=>profile(),updateProfile:profile};
}
export async function getOrganization(identity:Identity,id:string){
 const {data:members,error:memberError}=await identity.client.from('organization_memberships').select('role').eq('organization_id',id).eq('user_id',identity.userId).eq('active',true);
 if(memberError)throw new AppError('SERVICE_UNAVAILABLE',503,'Membership service is unavailable.');
 const roles=organizationRoleSchema.array().parse((members??[]).map(m=>m.role));
 if(!roles.length)throw new AppError('FORBIDDEN',403,'Organization access is not permitted.');
 const {data,error}=await identity.client.from('organizations').select('id,name').eq('id',id).single();
 if(error || !data)throw new AppError('FORBIDDEN',403,'Organization access is not permitted.');
 return organizationSchema.parse({...data,roles});
}
