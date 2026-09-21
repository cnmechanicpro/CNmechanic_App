import { createClient } from '@supabase/supabase-js';
import { createApiClient } from '@cnmechanic/api-client';
import { webConfigSchema } from '@cnmechanic/config';
export const settings=webConfigSchema.parse(import.meta.env);
// Tab-scoped storage restores reloads while avoiding indefinite localStorage persistence.
export const supabase=settings.VITE_SUPABASE_URL&&settings.VITE_SUPABASE_PUBLISHABLE_KEY?createClient(settings.VITE_SUPABASE_URL,settings.VITE_SUPABASE_PUBLISHABLE_KEY,{auth:{flowType:'pkce',storage:sessionStorage,persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
export const api=createApiClient({baseUrl:settings.VITE_API_BASE_URL,getToken:async()=>{if(!supabase)return undefined;const {data}=await supabase.auth.getSession();return data.session?.access_token;}});
