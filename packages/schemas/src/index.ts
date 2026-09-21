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
export const serviceRequestSchema=z.object({id:idSchema,vehicleId:idSchema,organizationId:idSchema,locationId:idSchema.nullable(),serviceId:idSchema,status:z.enum(['DRAFT','SUBMITTED','CANCELLED','CLOSED']),customerNote:z.string().nullable(),createdAt:timestampSchema,updatedAt:timestampSchema});
export const serviceRequestCreateSchema=z.strictObject({vehicleId:idSchema,organizationId:idSchema,locationId:idSchema.optional(),serviceId:idSchema,customerNote:z.string().trim().max(2000).optional()});
export const paginationSchema = z.strictObject({limit:z.coerce.number().int().min(1).max(100).default(20),cursor:idSchema.optional()});
export const emptyInputSchema = z.strictObject({});
export type ErrorCode = z.infer<typeof errorCodeSchema>;
export type Profile = z.infer<typeof profileSchema>;
export type OrganizationRole = z.infer<typeof organizationRoleSchema>;
export type Organization = z.infer<typeof organizationSchema>;
export type Vehicle = z.infer<typeof vehicleSchema>;
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
} as const;
