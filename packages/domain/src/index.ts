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
