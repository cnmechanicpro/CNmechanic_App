import { z } from 'zod';
export const idSchema = z.uuid();
export const timestampSchema = z.iso.datetime();
export const environmentSchema = z.enum(['local','preview','production']);
export const errorCodeSchema = z.enum(['VALIDATION_ERROR','AUTHENTICATION_REQUIRED','FORBIDDEN','NOT_FOUND','CONFLICT','RATE_LIMITED','INTERNAL_ERROR','SERVICE_UNAVAILABLE','METHOD_NOT_ALLOWED','PAYLOAD_TOO_LARGE','UNSUPPORTED_MEDIA_TYPE']);
export const errorSchema = z.object({error:z.object({code:errorCodeSchema,message:z.string()}),requestId:z.uuid()});
export const envelope = <T extends z.ZodType>(schema:T) => z.object({data:schema,requestId:z.uuid()});
export const healthSchema = z.object({status:z.literal('ok'),service:z.literal('cnmechanic-api'),environment:environmentSchema});
export const versionSchema = z.object({name:z.literal('CNMechanic'),version:z.string(),apiVersion:z.literal('v1'),stage:z.literal('foundation')});
export const profileSchema = z.object({id:idSchema,displayName:z.string().max(100),createdAt:timestampSchema});
export const profileUpdateSchema = z.strictObject({displayName:z.string().trim().min(1).max(100)});
export const organizationRoleSchema = z.enum(['MECHANIC','TECHNICIAN','SHOP_MANAGER','SHOP_OWNER']);
export const customerRoleSchema = z.literal('CUSTOMER');
export const platformRoleSchema = z.enum(['CN_SUPPORT','CN_VERIFICATION_AGENT','CN_ADMIN','SUPER_ADMIN']);
export const organizationSchema = z.object({id:idSchema,name:z.string(),roles:z.array(organizationRoleSchema)});
export const vehicleMakeSchema=z.object({id:idSchema,name:z.string(),slug:z.string()});
export const vehicleModelSchema=z.object({id:idSchema,makeId:idSchema,name:z.string(),slug:z.string(),startYear:z.number().int().nullable(),endYear:z.number().int().nullable()});
export const vehicleSchema=z.object({id:idSchema,model:vehicleModelSchema,modelYear:z.number().int(),trim:z.string().nullable(),engineDescription:z.string().nullable(),propulsionType:z.enum(['ICE_GASOLINE','ICE_DIESEL','HYBRID','PLUG_IN_HYBRID','BATTERY_ELECTRIC','FUEL_CELL','OTHER']),drivetrain:z.enum(['FWD','RWD','AWD','FOUR_WD','OTHER']).nullable(),transmissionType:z.enum(['AUTOMATIC','MANUAL','CVT','DCT','SINGLE_SPEED','OTHER']).nullable(),mileage:z.number().int().nullable(),status:z.string(),createdAt:timestampSchema,updatedAt:timestampSchema});
export const vehicleCreateSchema=z.strictObject({modelId:idSchema,modelYear:z.number().int().min(1886).max(2200),trim:z.string().trim().max(100).optional(),engineDescription:z.string().trim().max(200).optional(),propulsionType:vehicleSchema.shape.propulsionType,drivetrain:vehicleSchema.shape.drivetrain.optional(),transmissionType:vehicleSchema.shape.transmissionType.optional(),mileage:z.number().int().min(0).optional(),vin:z.string().regex(/^[A-HJ-NPR-Z0-9]{17}$/).optional()});
export const ownershipSchema=z.object({id:idSchema,vehicleId:idSchema,ownershipStatus:z.enum(['PENDING','CURRENT','FORMER']),ownershipStartedAt:timestampSchema,ownershipEndedAt:timestampSchema.nullable(),sourceType:z.enum(['OWNER_DECLARED','ORGANIZATION_VERIFIED','EXTERNAL_VERIFIED','TRANSFERRED'])});
export const serviceCategorySchema=z.object({id:idSchema,name:z.string(),slug:z.string(),description:z.string().nullable()});
export const serviceSchema=z.object({id:idSchema,categoryId:idSchema,name:z.string(),slug:z.string(),description:z.string().nullable()});
export const locationSchema=z.object({id:idSchema,organizationId:idSchema,name:z.string(),slug:z.string(),locationType:z.enum(['STOREFRONT','MOBILE','SERVICE_AREA']),status:z.string(),city:z.string().nullable(),region:z.string().nullable(),countryCode:z.string(),timezone:z.string()});
export const serviceRequestStatusSchema=z.enum(['DRAFT','SUBMITTED','MATCHING','OFFERS_SENT','MECHANIC_RESPONDED','PENDING_CUSTOMER_CONFIRMATION','ASSIGNED','ACTIVE','CANCELLED','NO_MATCH','EXPIRED','REJECTED','CLOSED']);
export const serviceRequestSchema=z.object({id:idSchema,vehicleId:idSchema,organizationId:idSchema.nullable(),locationId:idSchema.nullable(),serviceId:idSchema,status:serviceRequestStatusSchema,customerNote:z.string().nullable(),serviceLocationText:z.string().nullable(),city:z.string().nullable(),region:z.string().nullable(),postalCode:z.string().nullable(),countryCode:z.string().length(2),mobileServicePreference:z.enum(['MOBILE','SHOP','EITHER']),preferredStartAt:timestampSchema.nullable(),preferredEndAt:timestampSchema.nullable(),urgency:z.enum(['ROUTINE','SOON','URGENT']),assignedMechanicId:idSchema.nullable(),createdAt:timestampSchema,updatedAt:timestampSchema});
export const serviceRequestCreateSchema=z.strictObject({vehicleId:idSchema,serviceId:idSchema,organizationId:idSchema.optional(),locationId:idSchema.optional(),customerNote:z.string().trim().max(2000).optional(),serviceLocationText:z.string().trim().max(300).optional(),city:z.string().trim().max(100).optional(),region:z.string().trim().max(100).optional(),postalCode:z.string().trim().max(20).optional(),countryCode:z.string().length(2).regex(/^[A-Z]{2}$/).default('US'),latitude:z.number().min(-90).max(90).optional(),longitude:z.number().min(-180).max(180).optional(),mobileServicePreference:z.enum(['MOBILE','SHOP','EITHER']).default('EITHER'),preferredStartAt:timestampSchema.optional(),preferredEndAt:timestampSchema.optional(),urgency:z.enum(['ROUTINE','SOON','URGENT']).default('ROUTINE'),submit:z.boolean().default(true),idempotencyKey:z.string().trim().min(8).max(100)}).superRefine((value,ctx)=>{if((value.latitude===undefined)!=(value.longitude===undefined))ctx.addIssue({code:'custom',message:'latitude and longitude must be provided together'});if(value.locationId&&!value.organizationId)ctx.addIssue({code:'custom',message:'organizationId is required with locationId'});if(value.preferredStartAt&&value.preferredEndAt&&value.preferredEndAt<=value.preferredStartAt)ctx.addIssue({code:'custom',message:'preferredEndAt must be after preferredStartAt'});});
export const jobOfferStatusSchema=z.enum(['OFFERED','VIEWED','ACCEPTED','DECLINED','EXPIRED','WITHDRAWN']);
export const mechanicSummarySchema=z.object({id:idSchema,slug:z.string().trim().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),publicName:z.string(),headline:z.string().nullable(),verified:z.literal(true)});
export const jobOfferSchema=z.object({id:idSchema,serviceRequestId:idSchema,status:jobOfferStatusSchema,offeredAt:timestampSchema,expiresAt:timestampSchema,respondedAt:timestampSchema.nullable(),declineReason:z.string().nullable(),mechanic:mechanicSummarySchema.optional()});
export const jobOfferResponseSchema=z.strictObject({accept:z.boolean(),declineReason:z.string().trim().min(1).max(500).optional()}).superRefine((v,ctx)=>{if(!v.accept&&!v.declineReason)ctx.addIssue({code:'custom',message:'declineReason is required when declining'});});
export const assignmentSchema=z.object({id:idSchema,serviceRequestId:idSchema,jobOfferId:idSchema,mechanicId:idSchema,status:z.enum(['ASSIGNED','ACTIVE','CANCELLED','CLOSED']),assignedAt:timestampSchema,activatedAt:timestampSchema.nullable(),mechanic:mechanicSummarySchema.optional()});
export const cancellationSchema=z.strictObject({reason:z.string().trim().min(1).max(500).optional()});
export const requestPageSchema=z.strictObject({items:z.array(serviceRequestSchema),page:z.object({limit:z.number().int(),offset:z.number().int(),hasMore:z.boolean()})});
export const offerPageSchema=z.strictObject({items:z.array(jobOfferSchema),page:z.object({limit:z.number().int(),offset:z.number().int(),hasMore:z.boolean()})});
export const paginationSchema = z.strictObject({limit:z.coerce.number().int().min(1).max(100).default(20),cursor:idSchema.optional()});
export const emptyInputSchema = z.strictObject({});
export const slugSchema = z.string().trim().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const publicReferenceSchema = z.strictObject({slug:slugSchema,name:z.string().trim().min(1).max(200)});
export const publicLocationSchema = z.strictObject({name:z.string(),slug:slugSchema,type:z.enum(['STOREFRONT','MOBILE','SERVICE_AREA']),city:z.string().nullable(),region:z.string().nullable(),postalCode:z.string().nullable(),countryCode:z.string().length(2)});
export const publicServiceAreaSchema = z.strictObject({label:z.string(),city:z.string().nullable(),region:z.string().nullable(),postalCode:z.string().nullable(),countryCode:z.string().length(2),radiusMiles:z.number().nonnegative().nullable()});
export const publicMechanicSchema = z.strictObject({id:idSchema,slug:slugSchema,publicName:z.string(),headline:z.string().nullable(),biography:z.string().nullable(),verified:z.boolean(),operationMode:z.enum(['INDEPENDENT','SHOP_ASSOCIATED','HYBRID']),mobileCapable:z.boolean(),services:z.array(publicReferenceSchema),vehicleMakes:z.array(publicReferenceSchema),specialties:z.array(publicReferenceSchema),serviceAreas:z.array(publicServiceAreaSchema),shops:z.array(publicReferenceSchema.extend({verified:z.boolean()}))});
export const publicShopSchema = z.strictObject({id:idSchema,slug:slugSchema,name:z.string(),description:z.string().nullable(),organizationType:z.enum(['REPAIR_SHOP','MOBILE_MECHANIC','DEALERSHIP','SPECIALTY_SHOP','SERVICE_NETWORK','OTHER']),verified:z.boolean(),websiteUrl:z.url().nullable(),publicPhone:z.string().nullable(),locations:z.array(publicLocationSchema),services:z.array(publicReferenceSchema),vehicleMakes:z.array(publicReferenceSchema),mechanics:z.array(publicReferenceSchema.extend({verified:z.boolean()}))});
export const publicServiceSchema = serviceSchema.extend({categoryName:z.string()});
export const pageMetaSchema = z.strictObject({limit:z.number().int().min(1).max(50),offset:z.number().int().nonnegative(),total:z.number().int().nonnegative(),hasMore:z.boolean()});
export const mechanicSearchInputSchema = z.strictObject({query:z.string().trim().min(1).max(120).optional(),city:z.string().trim().min(1).max(100).optional(),region:z.string().trim().min(1).max(100).optional(),postalCode:z.string().trim().min(2).max(20).optional(),latitude:z.number().min(-90).max(90).optional(),longitude:z.number().min(-180).max(180).optional(),radiusMiles:z.number().positive().max(500).optional(),service:z.string().trim().max(100).pipe(slugSchema).optional(),vehicleMake:z.string().trim().max(100).pipe(slugSchema).optional(),specialty:z.string().trim().max(100).pipe(slugSchema).optional(),mobile:z.boolean().optional(),verified:z.literal(true).default(true),limit:z.number().int().min(1).max(50).default(20),offset:z.number().int().min(0).max(10000).default(0)}).superRefine((v,ctx)=>{const geo=[v.latitude,v.longitude,v.radiusMiles];if(geo.some(x=>x!==undefined)&&geo.some(x=>x===undefined))ctx.addIssue({code:'custom',message:'latitude, longitude and radiusMiles must be provided together'});});
export const shopSearchInputSchema = z.strictObject({query:z.string().trim().min(1).max(120).optional(),city:z.string().trim().min(1).max(100).optional(),region:z.string().trim().min(1).max(100).optional(),postalCode:z.string().trim().min(2).max(20).optional(),service:z.string().trim().max(100).pipe(slugSchema).optional(),vehicleMake:z.string().trim().max(100).pipe(slugSchema).optional(),verified:z.boolean().optional(),limit:z.number().int().min(1).max(50).default(20),offset:z.number().int().min(0).max(10000).default(0)});
export const serviceSearchInputSchema = z.strictObject({query:z.string().trim().min(1).max(120).optional(),category:z.string().trim().max(100).pipe(slugSchema).optional(),limit:z.number().int().min(1).max(50).default(20),offset:z.number().int().min(0).max(10000).default(0)});
export const mechanicSearchResultSchema=z.strictObject({items:z.array(publicMechanicSchema),page:pageMetaSchema});
export const shopSearchResultSchema=z.strictObject({items:z.array(publicShopSchema),page:pageMetaSchema});
export const serviceSearchResultSchema=z.strictObject({items:z.array(publicServiceSchema),page:pageMetaSchema});
export type ErrorCode = z.infer<typeof errorCodeSchema>;
export type Profile = z.infer<typeof profileSchema>;
export type OrganizationRole = z.infer<typeof organizationRoleSchema>;
export type Organization = z.infer<typeof organizationSchema>;
export type Vehicle = z.infer<typeof vehicleSchema>;
export type ServiceRequest = z.infer<typeof serviceRequestSchema>;
export type JobOffer = z.infer<typeof jobOfferSchema>;
export type Assignment = z.infer<typeof assignmentSchema>;
export const contracts = {
 health:{method:'GET',path:'/api/v1/health',auth:false,response:healthSchema},
 version:{method:'GET',path:'/api/v1/version',auth:false,response:versionSchema},
 me:{method:'GET',path:'/api/v1/me',auth:true,response:profileSchema},
 updateMe:{method:'PATCH',path:'/api/v1/me',auth:true,input:profileUpdateSchema,response:profileSchema},
 organization:{method:'GET',path:'/api/v1/organizations/{id}',auth:true,response:organizationSchema},
 vehicleMakes:{method:'GET',path:'/api/v1/vehicle-makes',auth:false,response:z.array(vehicleMakeSchema)},
 vehicleModels:{method:'GET',path:'/api/v1/vehicle-models',auth:false,response:z.array(vehicleModelSchema)},
 vehicles:{method:'GET',path:'/api/v1/vehicles',auth:true,response:z.array(vehicleSchema)},
 createVehicle:{method:'POST',path:'/api/v1/vehicles',auth:true,input:vehicleCreateSchema,response:vehicleSchema},
 vehicle:{method:'GET',path:'/api/v1/vehicles/{id}',auth:true,response:vehicleSchema},
 vehicleOwnerships:{method:'GET',path:'/api/v1/vehicles/{id}/ownerships',auth:true,response:z.array(ownershipSchema)},
 serviceCategories:{method:'GET',path:'/api/v1/service-categories',auth:false,response:z.array(serviceCategorySchema)},
 services:{method:'GET',path:'/api/v1/services',auth:false,response:z.array(serviceSchema)},
 organizationLocations:{method:'GET',path:'/api/v1/organizations/{id}/locations',auth:true,response:z.array(locationSchema)},
 organizationServices:{method:'GET',path:'/api/v1/organizations/{id}/services',auth:true,response:z.array(serviceSchema)},
	 createServiceRequest:{method:'POST',path:'/api/v1/service-requests',auth:true,input:serviceRequestCreateSchema,response:serviceRequestSchema},
	 serviceRequests:{method:'GET',path:'/api/v1/service-requests',auth:true,response:requestPageSchema},
	 serviceRequest:{method:'GET',path:'/api/v1/service-requests/{id}',auth:true,response:serviceRequestSchema},
	 cancelServiceRequest:{method:'POST',path:'/api/v1/service-requests/{id}/cancel',auth:true,input:cancellationSchema,response:serviceRequestSchema},
	 requestOffers:{method:'GET',path:'/api/v1/service-requests/{id}/offers',auth:true,response:z.array(jobOfferSchema)},
	 confirmJobOffer:{method:'POST',path:'/api/v1/job-offers/{id}/confirm',auth:true,response:assignmentSchema},
	 jobOpportunities:{method:'GET',path:'/api/v1/mechanic/job-opportunities',auth:true,response:offerPageSchema},
	 assignedJobs:{method:'GET',path:'/api/v1/mechanic/jobs',auth:true,response:z.array(assignmentSchema)},
	 respondJobOffer:{method:'POST',path:'/api/v1/mechanic/job-offers/{id}/respond',auth:true,input:jobOfferResponseSchema,response:jobOfferSchema},
 searchMechanics:{method:'GET',path:'/api/v1/search/mechanics',auth:false,input:mechanicSearchInputSchema,response:mechanicSearchResultSchema},
 searchShops:{method:'GET',path:'/api/v1/search/shops',auth:false,input:shopSearchInputSchema,response:shopSearchResultSchema},
 searchServices:{method:'GET',path:'/api/v1/search/services',auth:false,input:serviceSearchInputSchema,response:serviceSearchResultSchema},
 publicMechanic:{method:'GET',path:'/api/v1/mechanics/{slug}',auth:false,response:publicMechanicSchema},
 publicShop:{method:'GET',path:'/api/v1/shops/{slug}',auth:false,response:publicShopSchema},
} as const;
