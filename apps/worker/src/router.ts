import { idSchema,profileUpdateSchema } from '@cnmechanic/schemas';
import { platformInfo,IdentityService } from '@cnmechanic/domain';
import type { WorkerConfig } from '@cnmechanic/config';
import { authenticate } from './auth';
import { authorize } from './authorization';
import { identityRepository,getOrganization } from './repository';
import { readJson } from './validation';
import { AppError } from './errors';
import { json } from './responses';
import { openapi } from './openapi';
export function routeName(path:string){return /^\/api\/v1\/organizations\/[^/]+$/.test(path)?'/api/v1/organizations/:id':['/api/v1/health','/api/v1/version','/api/v1/me','/openapi.json','/mcp'].includes(path)?path:'unmatched';}
export async function route(request:Request,config:WorkerConfig,requestId:string){
 const url=new URL(request.url),path=url.pathname;
 const name=routeName(path);
 if(name==='unmatched' || path==='/mcp')throw new AppError('NOT_FOUND',404,'Endpoint not found.');
 const methods=path==='/api/v1/me'?['GET','PATCH']:['GET'];
 if(!methods.includes(request.method))throw new AppError('METHOD_NOT_ALLOWED',405,'Method not allowed.');
 if(url.search)throw new AppError('VALIDATION_ERROR',400,'Query parameters are not supported.');
 if(path==='/api/v1/health')return json({status:'ok',service:'cnmechanic-api',environment:config.ENVIRONMENT},requestId);
 if(path==='/api/v1/version')return json(platformInfo(),requestId);
 if(path==='/openapi.json')return Response.json(openapi);
 const identity=await authenticate(request,config);
 if(path==='/api/v1/me'){
  const service=new IdentityService(identityRepository(identity));
  if(request.method==='PATCH'){const input=await readJson(request,profileUpdateSchema);return json(await service.updateProfile(input.displayName),requestId);}
  return json(await service.getProfile(),requestId);
 }
 const parsed=idSchema.safeParse(path.split('/').at(-1));if(!parsed.success)throw new AppError('VALIDATION_ERROR',400,'Invalid organization identifier.');
 const organization=await getOrganization(identity,parsed.data);authorize(organization.roles,'organization:read');return json(organization,requestId);
}
