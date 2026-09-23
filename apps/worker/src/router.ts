import { idSchema,profileUpdateSchema,vehicleCreateSchema,serviceRequestCreateSchema,jobOfferResponseSchema,cancellationSchema,mechanicSearchInputSchema,shopSearchInputSchema,serviceSearchInputSchema,slugSchema } from '@cnmechanic/schemas';
import { platformInfo,IdentityService,ProviderSearchService } from '@cnmechanic/domain';
import type { WorkerConfig } from '@cnmechanic/config';
import { authenticate } from './auth';
import { authorize } from './authorization';
import { identityRepository,getOrganization,listVehicleMakes,listVehicleModels,listVehicles,getVehicle,createVehicle,listOwnerships,listCategories,listServices,listLocations,listOrganizationServices,createServiceRequest,listServiceRequests,getServiceRequest,cancelServiceRequest,listRequestOffers,listJobOpportunities,respondJobOffer,confirmJobOffer,listAssignedJobs,searchMechanics,searchShops,searchPublicServices,getPublicMechanic,getPublicShop } from './repository';
import { readJson } from './validation';
import { AppError } from './errors';
import { json } from './responses';
import { openapi } from './openapi';

const fixed=['/api/v1/health','/api/v1/version','/api/v1/me','/api/v1/vehicles','/api/v1/vehicle-makes','/api/v1/vehicle-models','/api/v1/service-categories','/api/v1/services','/api/v1/service-requests','/api/v1/mechanic/job-opportunities','/api/v1/mechanic/jobs','/api/v1/search/mechanics','/api/v1/search/shops','/api/v1/search/services','/openapi.json','/mcp'];
export function routeName(path:string){
 if(/^\/api\/v1\/mechanics\/[^/]+$/.test(path))return '/api/v1/mechanics/:slug';
 if(/^\/api\/v1\/shops\/[^/]+$/.test(path))return '/api/v1/shops/:slug';
 if(/^\/api\/v1\/vehicles\/[^/]+\/ownerships$/.test(path))return '/api/v1/vehicles/:id/ownerships';
	if(/^\/api\/v1\/vehicles\/[^/]+$/.test(path))return '/api/v1/vehicles/:id';
	if(/^\/api\/v1\/service-requests\/[^/]+\/cancel$/.test(path))return '/api/v1/service-requests/:id/cancel';
	if(/^\/api\/v1\/service-requests\/[^/]+\/offers$/.test(path))return '/api/v1/service-requests/:id/offers';
	if(/^\/api\/v1\/service-requests\/[^/]+$/.test(path))return '/api/v1/service-requests/:id';
	if(/^\/api\/v1\/job-offers\/[^/]+\/confirm$/.test(path))return '/api/v1/job-offers/:id/confirm';
	if(/^\/api\/v1\/mechanic\/job-offers\/[^/]+\/respond$/.test(path))return '/api/v1/mechanic/job-offers/:id/respond';
 if(/^\/api\/v1\/organizations\/[^/]+\/(locations|services)$/.test(path))return path.endsWith('/locations')?'/api/v1/organizations/:id/locations':'/api/v1/organizations/:id/services';
 return /^\/api\/v1\/organizations\/[^/]+$/.test(path)?'/api/v1/organizations/:id':fixed.includes(path)?path:'unmatched';
}
function queryInput(url:URL){const value:Record<string,unknown>=Object.fromEntries(url.searchParams.entries());for(const key of ['latitude','longitude','radiusMiles','limit','offset'])if(typeof value[key]==='string')value[key]=Number(value[key]);for(const key of ['mobile','verified'])if(value[key]==='true'||value[key]==='false')value[key]=value[key]==='true';return value;}
export async function route(request:Request,config:WorkerConfig,requestId:string){
 const url=new URL(request.url),path=url.pathname,name=routeName(path);
 if(name==='unmatched'||path==='/mcp')throw new AppError('NOT_FOUND',404,'Endpoint not found.');
	const methods=path==='/api/v1/me'?['GET','PATCH']:['/api/v1/vehicles','/api/v1/service-requests'].includes(path)?['GET','POST']:name.endsWith('/cancel')||name.endsWith('/confirm')||name.endsWith('/respond')?['POST']:['GET'];
 if(!methods.includes(request.method))throw new AppError('METHOD_NOT_ALLOWED',405,'Method not allowed.');
	const queryRoutes=new Set(['/api/v1/search/mechanics','/api/v1/search/shops','/api/v1/search/services','/api/v1/service-requests','/api/v1/mechanic/job-opportunities']);
 if(url.search&&!queryRoutes.has(path))throw new AppError('VALIDATION_ERROR',400,'Query parameters are not supported.');
 if(path==='/api/v1/health')return json({status:'ok',service:'cnmechanic-api',environment:config.ENVIRONMENT},requestId);
 if(path==='/api/v1/version')return json(platformInfo(),requestId);
 if(path==='/openapi.json')return Response.json(openapi);
 if(path==='/api/v1/vehicle-makes')return json(await listVehicleMakes(config),requestId);
 if(path==='/api/v1/vehicle-models')return json(await listVehicleModels(config),requestId);
 if(path==='/api/v1/service-categories')return json(await listCategories(config),requestId);
 if(path==='/api/v1/services')return json(await listServices(config),requestId);
 const searchService=new ProviderSearchService({searchMechanics:(input:Parameters<typeof searchMechanics>[1])=>searchMechanics(config,input),searchShops:(input:Parameters<typeof searchShops>[1])=>searchShops(config,input)});
 if(path==='/api/v1/search/mechanics'){const parsed=mechanicSearchInputSchema.safeParse(queryInput(url));if(!parsed.success)throw new AppError('VALIDATION_ERROR',400,'Invalid mechanic search filters.');return json(await searchService.searchMechanics(parsed.data),requestId);}
 if(path==='/api/v1/search/shops'){const parsed=shopSearchInputSchema.safeParse(queryInput(url));if(!parsed.success)throw new AppError('VALIDATION_ERROR',400,'Invalid shop search filters.');return json(await searchService.searchShops(parsed.data),requestId);}
 if(path==='/api/v1/search/services'){const parsed=serviceSearchInputSchema.safeParse(queryInput(url));if(!parsed.success)throw new AppError('VALIDATION_ERROR',400,'Invalid service search filters.');return json(await searchPublicServices(config,parsed.data),requestId);}
 if(name==='/api/v1/mechanics/:slug'||name==='/api/v1/shops/:slug'){const parsed=slugSchema.safeParse(path.split('/').at(-1));if(!parsed.success)throw new AppError('VALIDATION_ERROR',400,'Invalid public profile slug.');return json(name.includes('mechanics')?await getPublicMechanic(config,parsed.data):await getPublicShop(config,parsed.data),requestId);}
 const identity=await authenticate(request,config);
 if(path==='/api/v1/me'){const service=new IdentityService(identityRepository(identity));if(request.method==='PATCH'){const input=await readJson(request,profileUpdateSchema);return json(await service.updateProfile(input.displayName),requestId);}return json(await service.getProfile(),requestId);}
 if(path==='/api/v1/vehicles'){if(request.method==='POST')return json(await createVehicle(identity,await readJson(request,vehicleCreateSchema)),requestId,201);return json(await listVehicles(identity),requestId);}
	if(path==='/api/v1/service-requests'){if(request.method==='POST')return json(await createServiceRequest(identity,await readJson(request,serviceRequestCreateSchema)),requestId,201);const input=queryInput(url),limit=Number(input.limit??20),offset=Number(input.offset??0);if(!Number.isInteger(limit)||limit<1||limit>50||!Number.isInteger(offset)||offset<0||offset>10000||Object.keys(input).some(k=>!['limit','offset'].includes(k)))throw new AppError('VALIDATION_ERROR',400,'Invalid pagination.');return json(await listServiceRequests(identity,limit,offset),requestId);}
	if(path==='/api/v1/mechanic/job-opportunities'){const input=queryInput(url),limit=Number(input.limit??20),offset=Number(input.offset??0);if(!Number.isInteger(limit)||limit<1||limit>50||!Number.isInteger(offset)||offset<0||offset>10000||Object.keys(input).some(k=>!['limit','offset'].includes(k)))throw new AppError('VALIDATION_ERROR',400,'Invalid pagination.');return json(await listJobOpportunities(identity,limit,offset),requestId);}
	if(path==='/api/v1/mechanic/jobs')return json(await listAssignedJobs(identity),requestId);
	if(name.startsWith('/api/v1/service-requests/:id')||name.startsWith('/api/v1/job-offers/:id')||name.startsWith('/api/v1/mechanic/job-offers/:id')){const raw=path.split('/').filter(Boolean).reverse().find((segment:string)=>idSchema.safeParse(segment).success),identifier=idSchema.safeParse(raw);if(!identifier.success)throw new AppError('VALIDATION_ERROR',400,'Invalid resource identifier.');if(name.endsWith('/cancel'))return json(await cancelServiceRequest(identity,identifier.data,(await readJson(request,cancellationSchema)).reason),requestId);if(name.endsWith('/offers'))return json(await listRequestOffers(identity,identifier.data),requestId);if(name.endsWith('/confirm'))return json(await confirmJobOffer(identity,identifier.data),requestId,201);if(name.endsWith('/respond'))return json(await respondJobOffer(identity,identifier.data,await readJson(request,jobOfferResponseSchema)),requestId);return json(await getServiceRequest(identity,identifier.data),requestId);}
 const identifier=path.split('/').at(path.includes('/ownerships')?-2:-1),parsed=idSchema.safeParse(identifier);if(!parsed.success)throw new AppError('VALIDATION_ERROR',400,'Invalid resource identifier.');
 if(name==='/api/v1/vehicles/:id/ownerships')return json(await listOwnerships(identity,parsed.data),requestId);
 if(name==='/api/v1/vehicles/:id')return json(await getVehicle(identity,parsed.data),requestId);
 if(name==='/api/v1/organizations/:id/locations')return json(await listLocations(identity,parsed.data),requestId);
 if(name==='/api/v1/organizations/:id/services')return json(await listOrganizationServices(identity,parsed.data),requestId);
 const organization=await getOrganization(identity,parsed.data);authorize(organization.roles,'organization:read');return json(organization,requestId);
}
