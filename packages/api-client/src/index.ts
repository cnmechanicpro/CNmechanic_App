import { z } from 'zod';
import { contracts,envelope,errorSchema,profileUpdateSchema } from '@cnmechanic/schemas';
export class ApiError extends Error {constructor(public code:string,message:string,public status:number,public requestId?:string){super(message);this.name='ApiError';}}
export function createApiClient(options:{baseUrl:string;getToken?:()=>Promise<string|undefined>;fetch?:typeof fetch;timeoutMs?:number}) {
 const transport=options.fetch??fetch;
 async function request<T extends z.ZodType>(path:string,schema:T,method='GET',body?:unknown,signal?:AbortSignal):Promise<z.infer<T>> {
  const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),options.timeoutMs??10000);
  const abort=()=>controller.abort(); signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)controller.abort();
  try {
   const token=await options.getToken?.();
   const response=await transport(`${options.baseUrl}${path}`,{method,signal:controller.signal,headers:{Accept:'application/json',...(token?{Authorization:`Bearer ${token}`} : {}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
   let json:unknown;try{json=await response.json();}catch{throw new ApiError('INVALID_RESPONSE','The service returned an invalid response.',response.status);}
   if(!response.ok){const parsed=errorSchema.safeParse(json);if(parsed.success)throw new ApiError(parsed.data.error.code,parsed.data.error.message,response.status,parsed.data.requestId);throw new ApiError('INVALID_RESPONSE','The service is unavailable.',response.status);}
   const parsed=envelope(z.unknown()).safeParse(json);if(!parsed.success)throw new ApiError('INVALID_RESPONSE','The service returned an invalid response.',response.status);
   return schema.parse(parsed.data.data);
  }catch(error){if(error instanceof ApiError)throw error;if(controller.signal.aborted)throw new ApiError('REQUEST_ABORTED','The request timed out or was cancelled.',0);throw new ApiError('NETWORK_ERROR','Unable to connect to CNMechanic.',0);}
  finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
 }
 return {health:()=>request(contracts.health.path,contracts.health.response),version:(signal?:AbortSignal)=>request(contracts.version.path,contracts.version.response,'GET',undefined,signal),me:()=>request(contracts.me.path,contracts.me.response),updateMe:(input:z.infer<typeof profileUpdateSchema>)=>request(contracts.updateMe.path,contracts.updateMe.response,'PATCH',profileUpdateSchema.parse(input)),organization:(id:string)=>request(`/api/v1/organizations/${z.uuid().parse(id)}`,contracts.organization.response)};
}
export type ApiClient=ReturnType<typeof createApiClient>;
