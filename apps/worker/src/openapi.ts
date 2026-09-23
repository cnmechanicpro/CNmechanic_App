import { z } from 'zod';
import { contracts,envelope,errorSchema } from '@cnmechanic/schemas';
const paths:Record<string,unknown>={};
for(const [name,c] of Object.entries(contracts)){
 const method=c.method.toLowerCase();
 const content=(schema:z.ZodType)=>({'application/json':{schema:z.toJSONSchema(schema)}});
 const responses:Record<string,unknown>={'200':{description:'Success',content:content(envelope(c.response))}};
 for(const code of ['400','401','403','404','405','413','415','429','500','503'])responses[code]={description:'Standard API error',content:content(errorSchema)};
 const existing=(paths[c.path]??{}) as Record<string,unknown>;
 const pathParameter=c.path.includes('{id}')?{name:'id',in:'path',required:true,schema:{type:'string',format:'uuid'}}:c.path.includes('{slug}')?{name:'slug',in:'path',required:true,schema:{type:'string',pattern:'^[a-z0-9]+(?:-[a-z0-9]+)*$'}}:undefined;
 const queryParameters=c.method==='GET'&&'input' in c?Object.entries((z.toJSONSchema(c.input).properties??{}) as Record<string,unknown>).map(([key,schema])=>({name:key,in:'query',required:false,schema})):[];
 paths[c.path]={...existing,[method]:{operationId:name,security:c.auth?[{bearerAuth:[]}]:[],...('input' in c&&c.method!=='GET'?{requestBody:{required:true,content:content(c.input)}}:{}),...(pathParameter||queryParameters.length?{parameters:[...(pathParameter?[pathParameter]:[]),...queryParameters]}:{}),responses}};
}
export const openapi={openapi:'3.1.0',info:{title:'CNMechanic marketplace API',version:'0.3.0',description:'Public provider discovery and authenticated customer domain APIs. Search is read-only, bounded, rate-limited and enforced by Supabase RLS.'},servers:[{url:'https://api.cnmechanic.com'},{url:'http://127.0.0.1:8787'}],components:{securitySchemes:{bearerAuth:{type:'http',scheme:'bearer',bearerFormat:'JWT'}}},paths};
