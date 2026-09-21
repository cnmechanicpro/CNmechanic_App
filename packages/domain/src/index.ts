import type { OrganizationRole, Profile } from '@cnmechanic/schemas';
export const platformInfo = () => ({name:'CNMechanic' as const,version:'0.1.0',apiVersion:'v1' as const,stage:'foundation' as const});
export type Capability = 'organization:read' | 'organization:manage';
export function can(roles:OrganizationRole[],capability:Capability) {
 return capability==='organization:read' ? roles.length>0 : roles.some(r=>r==='SHOP_OWNER'||r==='SHOP_MANAGER');
}
export interface IdentityRepository {
 getProfile():Promise<Profile>;
 updateProfile(displayName:string):Promise<Profile>;
}
export class IdentityService {
 constructor(private readonly repository:IdentityRepository){}
 getProfile(){return this.repository.getProfile();}
 updateProfile(displayName:string){return this.repository.updateProfile(displayName);}
}
/** Domain boundary for the stable vehicle/ownership aggregate. Database RLS remains authoritative. */
export interface VehicleRepository<TVehicle,TCreate>{list():Promise<TVehicle[]>;get(id:string):Promise<TVehicle>;create(input:TCreate):Promise<TVehicle>;}
export class VehicleService<TVehicle,TCreate>{constructor(private readonly repository:VehicleRepository<TVehicle,TCreate>){}list(){return this.repository.list();}get(id:string){return this.repository.get(id);}create(input:TCreate){return this.repository.create(input);}}
export interface ServiceRequestRepository<TRequest,TCreate>{create(input:TCreate):Promise<TRequest>;}
export class ServiceRequestService<TRequest,TCreate>{constructor(private readonly repository:ServiceRequestRepository<TRequest,TCreate>){}create(input:TCreate){return this.repository.create(input);}}
