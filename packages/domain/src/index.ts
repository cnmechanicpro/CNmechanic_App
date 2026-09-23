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

export type ProviderLifecycle='PROFILE_INCOMPLETE'|'VERIFICATION_REQUIRED'|'VERIFICATION_SUBMITTED'|'VERIFICATION_PENDING'|'VERIFIED'|'ACTIVE'|'ELIGIBLE_FOR_JOBS'|'REJECTED'|'SUSPENDED'|'REVERIFICATION_REQUIRED'|'INACTIVE';
export interface ProviderEligibilityCandidate {lifecycleStatus:ProviderLifecycle;verificationStatus:'UNVERIFIED'|'APPLICATION_SUBMITTED'|'UNDER_REVIEW'|'MORE_INFORMATION_REQUIRED'|'VERIFIED'|'SUSPENDED'|'REMOVED';publicVisibility:'DRAFT'|'PUBLISHED'|'HIDDEN';active:boolean;}
export class ProviderEligibilityService {
 isDiscoverable(candidate:ProviderEligibilityCandidate){return candidate.active&&candidate.publicVisibility==='PUBLISHED'&&candidate.verificationStatus==='VERIFIED'&&['ACTIVE','ELIGIBLE_FOR_JOBS'].includes(candidate.lifecycleStatus);}
 isJobEligible(candidate:ProviderEligibilityCandidate){return this.isDiscoverable(candidate)&&candidate.lifecycleStatus==='ELIGIBLE_FOR_JOBS';}
}
export interface RankedProvider {id:string;verified:boolean;relevance:number;distanceMiles?:number|null;}
/** Ranking receives only already-eligible providers. It never decides authorization or visibility. */
export class ProviderRankingService {
 rank<T extends RankedProvider>(providers:T[]){return [...providers].sort((a,b)=>Number(b.verified)-Number(a.verified)||b.relevance-a.relevance||(a.distanceMiles??Number.MAX_SAFE_INTEGER)-(b.distanceMiles??Number.MAX_SAFE_INTEGER)||a.id.localeCompare(b.id));}
}
export interface MarketplaceCandidate extends ProviderEligibilityCandidate,RankedProvider {serviceMatch:boolean;vehicleMakeMatch:boolean;geographyMatch:boolean;mobileCapable:boolean;shopCapable:boolean;}
export type ServiceMode='MOBILE'|'SHOP'|'EITHER';
/** Candidate generation filters first. Ranking never receives an ineligible provider. */
export class CandidateGenerationService {
 constructor(private readonly eligibility=new ProviderEligibilityService(),private readonly ranking=new ProviderRankingService()){}
 generate<T extends MarketplaceCandidate>(providers:T[],mode:ServiceMode,limit=10){
  const bounded=Math.min(Math.max(limit,1),10);
  const eligible=providers.filter(candidate=>this.eligibility.isJobEligible(candidate)&&candidate.serviceMatch&&candidate.vehicleMakeMatch&&candidate.geographyMatch&&(mode!=='MOBILE'||candidate.mobileCapable)&&(mode!=='SHOP'||candidate.shopCapable));
  return this.ranking.rank(eligible).slice(0,bounded);
 }
}
export interface ProviderSearchRepository<TMechanic,TShop,TMechanicInput,TShopInput>{searchMechanics(input:TMechanicInput):Promise<TMechanic>;searchShops(input:TShopInput):Promise<TShop>;}
export class ProviderSearchService<TMechanic,TShop,TMechanicInput,TShopInput>{constructor(private readonly repository:ProviderSearchRepository<TMechanic,TShop,TMechanicInput,TShopInput>){}searchMechanics(input:TMechanicInput){return this.repository.searchMechanics(input);}searchShops(input:TShopInput){return this.repository.searchShops(input);}}
