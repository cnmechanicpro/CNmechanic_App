import { idSchema,profileUpdateSchema,vehicleCreateSchema,serviceRequestCreateSchema } from '@cnmechanic/schemas';
import { platformInfo,IdentityService } from '@cnmechanic/domain';
import type { WorkerConfig } from '@cnmechanic/config';
import { authenticate } from './auth';
import { authorize } from './authorization';
import { identityRepository,getOrganization,listVehicleMakes,listVehicleModels,listVehicles,getVehicle,createVehicle,listOwnerships,listCategories,listServices,listLocations,listOrganizationServices,createServiceRequest } from './repository';
import { readJson } from './validation';
import { AppError } from './errors';
import { json } from './responses';
import { openapi } from './openapi';
export function routeName(path:string){if(/^\/api\/v1\/vehicles\/[^/]+\/ownerships$/.test(path))return '/api/v1/vehicles/:id/ownerships';if(/^\/api\/v1\/vehicles\/[^/]+$/.test(path))return '/api/v1/vehicles/:id';if(/^\/api\/v1\/organizations\/[^/]+\/(locations|services)$/.test(path))return path.endsWith('/locations')?'/api/v1/organizations/:id/locations':'/api/v1/organizations/:id/services';return /^\/api\/v1\/organizations\/[^/]+$/.test(path)?'/api/v1/organizations/:id':['/api/v1/health','/api/v1/version','/api/v1/me','/api/v1/vehicles','/api/v1/vehicle-makes','/api/v1/vehicle-models','/api/v1/service-categories','/api/v1/services','/api/v1/service-requests','/openapi.json','/mcp'].includes(path)?path:'unmatched';}
export async function route(request:Request,config:WorkerConfig,requestId:string){
 const url=new URL(request.url),path=url.pathname;
 const name=routeName(path);
 if(name==='unmatched' || path==='/mcp')throw new AppError('NOT_FOUND',404,'Endpoint not found.');
 const methods=path==='/api/v1/me'?['GET','PATCH']:['/api/v1/vehicles','/api/v1/service-requests'].includes(path)?['GET','POST']:['GET'];
 if(!methods.includes(request.method))throw new AppError('METHOD_NOT_ALLOWED',405,'Method not allowed.');
 if(url.search)throw new AppError('VALIDATION_ERROR',400,'Query parameters are not supported.');
 if(path==='/api/v1/health')return json({status:'ok',service:'cnmechanic-api',environment:config.ENVIRONMENT},requestId);
 if(path==='/api/v1/version')return json(platformInfo(),requestId);
 if(path==='/openapi.json')return Response.json(openapi);
 if(path==='/api/v1/vehicle-makes')return json(await listVehicleMakes(config),requestId);
 if(path==='/api/v1/vehicle-models')return json(await listVehicleModels(config),requestId);
 if(path==='/api/v1/service-categories')return json(await listCategories(config),requestId);
 if(path==='/api/v1/services')return json(await listServices(config),requestId);
 const identity=await authenticate(request,config);
 if(path==='/api/v1/me'){
  const service=new IdentityService(identityRepository(identity));
  if(request.method==='PATCH'){const input=await readJson(request,profileUpdateSchema);return json(await service.updateProfile(input.displayName),requestId);}
  return json(await service.getProfile(),requestId);
 }
 if(path==='/api/v1/vehicles'){if(request.method==='POST')return json(await createVehicle(identity,await readJson(request,vehicleCreateSchema)),requestId,201);return json(await listVehicles(identity),requestId);}
 if(path==='/api/v1/service-requests'){if(request.method!=='POST')throw new AppError('METHOD_NOT_ALLOWED',405,'Method not allowed.');return json(await createServiceRequest(identity,await readJson(request,serviceRequestCreateSchema)),requestId,201);}
 const identifier=path.split('/').at(path.includes('/ownerships')?-2:-1);const parsed=idSchema.safeParse(identifier);if(!parsed.success)throw new AppError('VALIDATION_ERROR',400,'Invalid resource identifier.');
 if(routeName(path)==='/api/v1/vehicles/:id/ownerships')return json(await listOwnerships(identity,parsed.data),requestId);
 if(routeName(path)==='/api/v1/vehicles/:id')return json(await getVehicle(identity,parsed.data),requestId);
 if(routeName(path)==='/api/v1/organizations/:id/locations')return json(await listLocations(identity,parsed.data),requestId);
 if(routeName(path)==='/api/v1/organizations/:id/services')return json(await listOrganizationServices(identity,parsed.data),requestId);
 const organization=await getOrganization(identity,parsed.data);authorize(organization.roles,'organization:read');return json(organization,requestId);
}
