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
export const platformRoleSchema = z.enum(['CUSTOMER','CN_SUPPORT','CN_VERIFICATION_AGENT','CN_ADMIN','SUPER_ADMIN']);
export const organizationSchema = z.object({id:idSchema,name:z.string(),roles:z.array(organizationRoleSchema)});
export const paginationSchema = z.strictObject({limit:z.coerce.number().int().min(1).max(100).default(20),cursor:idSchema.optional()});
export const emptyInputSchema = z.strictObject({});
export type ErrorCode = z.infer<typeof errorCodeSchema>;
export type Profile = z.infer<typeof profileSchema>;
export type OrganizationRole = z.infer<typeof organizationRoleSchema>;
export type Organization = z.infer<typeof organizationSchema>;
export const contracts = {
 health:{method:'GET',path:'/api/v1/health',auth:false,response:healthSchema},
 version:{method:'GET',path:'/api/v1/version',auth:false,response:versionSchema},
 me:{method:'GET',path:'/api/v1/me',auth:true,response:profileSchema},
 updateMe:{method:'PATCH',path:'/api/v1/me',auth:true,input:profileUpdateSchema,response:profileSchema},
 organization:{method:'GET',path:'/api/v1/organizations/{id}',auth:true,response:organizationSchema},
} as const;
