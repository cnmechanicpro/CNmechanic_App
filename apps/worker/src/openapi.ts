import { z } from 'zod';
import { contracts,envelope,errorSchema } from '@cnmechanic/schemas';
const paths:Record<string,unknown>={};
for(const [name,c] of Object.entries(contracts)){
 const method=c.method.toLowerCase();
 const content=(schema:z.ZodType)=>({'application/json':{schema:z.toJSONSchema(schema)}});
 const responses:Record<string,unknown>={'200':{description:'Success',content:content(envelope(c.response))}};
 for(const code of ['400','401','403','404','405','413','415','429','500','503'])responses[code]={description:'Standard API error',content:content(errorSchema)};
 const existing=(paths[c.path]??{}) as Record<string,unknown>;
 paths[c.path]={...existing,[method]:{operationId:name,security:c.auth?[{bearerAuth:[]}]:[],...('input' in c?{requestBody:{required:true,content:content(c.input)}}:{}),...(c.path.includes('{id}')?{parameters:[{name:'id',in:'path',required:true,schema:{type:'string',format:'uuid'}}]}:{}),responses}};
}
export const openapi={openapi:'3.1.0',info:{title:'CNMechanic foundation API',version:'0.1.0',description:'Supabase access tokens are independently validated by the Worker. Health is liveness, not database readiness. MCP is not implemented.'},servers:[{url:'https://api.cnmechanic.com'},{url:'http://127.0.0.1:8787'}],components:{securitySchemes:{bearerAuth:{type:'http',scheme:'bearer',bearerFormat:'JWT'}}},paths};
