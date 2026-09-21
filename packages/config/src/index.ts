import { z } from 'zod';
export const canonicalOrigin = 'https://www.cnmechanic.com';
const mode = z.enum(['local','preview','production']);
const origin = z.url().refine((value) => {
 try {
  const parsed = new URL(value);
  return parsed.origin === value && !parsed.username && !parsed.password;
 } catch {
  return false;
 }
}, 'Expected an origin without path or credentials');
function secureOrigin(value:string,env:string) {
 try {
  const parsed = new URL(value);
  return parsed.protocol==='https:' || (env==='local' && parsed.protocol==='http:' && ['localhost','127.0.0.1'].includes(parsed.hostname));
 } catch {
  return false;
 }
}
const publicKey = z.string().min(10).refine(k=>{
 if (k.startsWith('sb_secret_')) return false;
 if(k.split('.').length===3){try{return JSON.parse(atob(k.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).role==='anon';}catch{return false;}}
 return k.startsWith('sb_publishable_');
},'Expected a Supabase publishable or legacy anon key');
export const workerConfigSchema = z.object({ENVIRONMENT:mode,ALLOWED_ORIGINS:z.string().min(1),SUPABASE_URL:origin.optional(),SUPABASE_PUBLISHABLE_KEY:publicKey.optional()}).superRefine((c,ctx)=>{
 const origins=c.ALLOWED_ORIGINS.split(',');
 if(origins.some(o=>!origin.safeParse(o).success || !secureOrigin(o,c.ENVIRONMENT)))ctx.addIssue({code:'custom',message:'Invalid allowed origins'});
 if(c.ENVIRONMENT==='production' && c.ALLOWED_ORIGINS!==canonicalOrigin)ctx.addIssue({code:'custom',message:'Production origin must be canonical'});
 if(Boolean(c.SUPABASE_URL)!==Boolean(c.SUPABASE_PUBLISHABLE_KEY))ctx.addIssue({code:'custom',message:'Auth configuration must be complete'});
 if(c.SUPABASE_URL && !secureOrigin(c.SUPABASE_URL,c.ENVIRONMENT))ctx.addIssue({code:'custom',message:'Invalid auth origin'});
 if(c.ENVIRONMENT!=='local' && !c.SUPABASE_URL)ctx.addIssue({code:'custom',message:'Hosted environments require auth configuration'});
});
export const webConfigSchema = z.object({VITE_ENVIRONMENT:mode.default('local'),VITE_API_BASE_URL:origin.default('http://127.0.0.1:8787'),VITE_SUPABASE_URL:origin.optional(),VITE_SUPABASE_PUBLISHABLE_KEY:publicKey.optional()}).superRefine((c,ctx)=>{
 if(!secureOrigin(c.VITE_API_BASE_URL,c.VITE_ENVIRONMENT))ctx.addIssue({code:'custom',message:'Invalid API origin'});
 if(c.VITE_ENVIRONMENT==='production' && c.VITE_API_BASE_URL!=='https://api.cnmechanic.com')ctx.addIssue({code:'custom',message:'Production API origin must be canonical'});
 if(Boolean(c.VITE_SUPABASE_URL)!==Boolean(c.VITE_SUPABASE_PUBLISHABLE_KEY))ctx.addIssue({code:'custom',message:'Auth configuration must be complete'});
 if(c.VITE_SUPABASE_URL && !secureOrigin(c.VITE_SUPABASE_URL,c.VITE_ENVIRONMENT))ctx.addIssue({code:'custom',message:'Invalid auth origin'});
 if(c.VITE_ENVIRONMENT!=='local' && !c.VITE_SUPABASE_URL)ctx.addIssue({code:'custom',message:'Hosted environments require auth configuration'});
});
export type WorkerConfig = z.infer<typeof workerConfigSchema>;
export function canonicalUrl(path='/') { if(!path.startsWith('/') || path.startsWith('//'))throw new Error('Expected a relative path');const u=new URL(path,canonicalOrigin);u.search='';u.hash='';return u.href; }
export function structuredDataJson(value:Record<string,unknown>) {return JSON.stringify(value).replace(/</g,'\\u003c');}
