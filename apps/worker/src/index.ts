import { config } from './config';
import { route,routeName } from './router';
import { safeError,AppError } from './errors';
import { secure } from './responses';
import { logRequest } from './logging';
export default {async fetch(request:Request,env:Env):Promise<Response>{
 const started=performance.now(),requestId=crypto.randomUUID(),origin=request.headers.get('origin');let allowed:string[]=[];let environment='unknown';let response:Response;
 try{
  const settings=config(env);environment=settings.ENVIRONMENT;allowed=settings.ALLOWED_ORIGINS.split(',');
  if(origin && !allowed.includes(origin))throw new AppError('FORBIDDEN',403,'Origin is not permitted.');
  if(request.method==='OPTIONS'){
   const method=request.headers.get('access-control-request-method');const headers=(request.headers.get('access-control-request-headers')??'').toLowerCase().split(',').map(h=>h.trim()).filter(Boolean);
   if(!origin || !method || !['GET','POST','PATCH'].includes(method) || headers.some(h=>!['authorization','content-type'].includes(h)))throw new AppError('FORBIDDEN',403,'Preflight is not permitted.');
   response=new Response(null,{status:204,headers:{'Access-Control-Allow-Methods':'GET, POST, PATCH','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Max-Age':'600'}});
  }else response=await route(request,settings,requestId);
 }catch(error){const e=safeError(error);response=Response.json({error:{code:e.code,message:e.message},requestId},{status:e.status});}
 logRequest({requestId,route:routeName(new URL(request.url).pathname),method:request.method,status:response.status,durationMs:Math.round(performance.now()-started),environment});
 return secure(response,requestId,origin,allowed);
}};
