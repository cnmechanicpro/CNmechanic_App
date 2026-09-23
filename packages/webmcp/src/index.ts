import { z } from 'zod';
import { mechanicSearchInputSchema,shopSearchInputSchema,serviceSearchInputSchema,mechanicSearchResultSchema,shopSearchResultSchema,serviceSearchResultSchema,publicMechanicSchema,publicShopSchema,slugSchema } from '@cnmechanic/schemas';
import type { ApiClient } from '@cnmechanic/api-client';
export type ToolRisk='READ_SAFE'|'WRITE_LOW_RISK'|'WRITE_CONFIRMATION_REQUIRED'|'FINANCIAL_CONFIRMATION_REQUIRED'|'ADMIN_PROHIBITED_FOR_AGENTS';
export interface ToolMetadata {name:string;version:string;description:string;authentication:'PUBLIC'|'AUTHENTICATED';authorization:string[];risk:ToolRisk;classification:'READ'|'WRITE';confirmationRequired:boolean;auditRequired:boolean;rateLimit:{requests:number;windowSeconds:number};}
export interface ToolDefinition {metadata:ToolMetadata;input:z.ZodType;output:z.ZodType;execute:(input:unknown,signal?:AbortSignal)=>Promise<unknown>;}
export class ToolRegistry {
 private tools=new Map<string,ToolDefinition>();
 register(tool:ToolDefinition){if(!/^[a-zA-Z0-9_.-]{1,128}$/.test(tool.metadata.name) || this.tools.has(tool.metadata.name))throw new Error('Invalid or duplicate tool');if(tool.metadata.risk!=='READ_SAFE'||tool.metadata.authentication!=='PUBLIC'||tool.metadata.classification!=='READ'||tool.metadata.confirmationRequired)throw new Error('Only public read tools are enabled');this.tools.set(tool.metadata.name,tool);}
 list(){return [...this.tools.values()];}
 async execute(name:string,input:unknown,signal?:AbortSignal){const tool=this.tools.get(name);if(!tool)throw new Error('Unknown tool');if(signal?.aborted)throw new Error('Cancelled');return tool.output.parse(await tool.execute(tool.input.parse(input),signal));}
}
const metadata=(name:string,description:string):ToolMetadata=>({name,version:'1',description,authentication:'PUBLIC',authorization:[],risk:'READ_SAFE',classification:'READ',confirmationRequired:false,auditRequired:true,rateLimit:{requests:60,windowSeconds:60}});
export function marketplaceRegistry(client:ApiClient){const registry=new ToolRegistry();
 registry.register({metadata:metadata('search_mechanics','Search verified, publicly listed CNMechanic professionals by service, vehicle make, specialty, mobile capability, or service area.'),input:mechanicSearchInputSchema,output:mechanicSearchResultSchema,execute:(input,signal)=>client.searchMechanics(mechanicSearchInputSchema.parse(input),signal)});
 registry.register({metadata:metadata('search_shops','Search public CNMechanic repair businesses by service, vehicle make, verification, or location.'),input:shopSearchInputSchema,output:shopSearchResultSchema,execute:(input,signal)=>client.searchShops(shopSearchInputSchema.parse(input),signal)});
 registry.register({metadata:metadata('get_mechanic_profile','Retrieve one verified public mechanic profile by slug. Private identity and account data are never returned.'),input:z.strictObject({slug:slugSchema}),output:publicMechanicSchema,execute:(input,signal)=>client.mechanic(z.strictObject({slug:slugSchema}).parse(input).slug,signal)});
 registry.register({metadata:metadata('get_shop_profile','Retrieve one public repair business profile by slug. Private membership and claim data are never returned.'),input:z.strictObject({slug:slugSchema}),output:publicShopSchema,execute:(input,signal)=>client.shop(z.strictObject({slug:slugSchema}).parse(input).slug,signal)});
 registry.register({metadata:metadata('search_services','Search the public CNMechanic service taxonomy. This tool does not create a booking or service request.'),input:serviceSearchInputSchema,output:serviceSearchResultSchema,execute:(input,signal)=>client.searchServices(serviceSearchInputSchema.parse(input),signal)});
 return registry;
}
interface NativeTool {name:string;description:string;inputSchema:unknown;annotations:{readOnlyHint:boolean;untrustedContentHint:boolean};execute:(input:unknown,context?:{signal?:AbortSignal})=>Promise<unknown>;}
interface ModelContext {registerTool:(tool:NativeTool,options:{signal:AbortSignal})=>unknown;}
function isContext(value:unknown):value is ModelContext {return typeof value==='object'&&value!==null&&'registerTool' in value&&typeof value.registerTool==='function';}
export async function registerBrowserTools(registry:ToolRegistry,surface:unknown,signal:AbortSignal):Promise<'unsupported'|'registered'|'failed'> {
 try {
  if(!surface || typeof surface!=='object' || !('modelContext' in surface) || !isContext(surface.modelContext))return 'unsupported';
  const context=surface.modelContext;
  const controller=new AbortController();const abort=()=>controller.abort();signal.addEventListener('abort',abort,{once:true});if(signal.aborted)controller.abort();
  try{for(const tool of registry.list()){if(controller.signal.aborted)return 'failed';await context.registerTool({name:tool.metadata.name,description:tool.metadata.description,inputSchema:z.toJSONSchema(tool.input),annotations:{readOnlyHint:true,untrustedContentHint:false},execute:(input,execution)=>registry.execute(tool.metadata.name,input,execution?.signal)},{signal:controller.signal});}return 'registered';}
  catch{controller.abort();signal.removeEventListener('abort',abort);return 'failed';}
 }catch{return 'failed';}
}
