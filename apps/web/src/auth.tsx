import { createContext,useContext,useEffect,useState,type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './services';
const AuthContext=createContext<{session:Session|null;loading:boolean;error:string|null}>({session:null,loading:true,error:null});
export function AuthProvider({children}:{children:ReactNode}){
 const [session,setSession]=useState<Session|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState<string|null>(null);
 useEffect(()=>{
  let live=true;
  if(!supabase){queueMicrotask(()=>{if(live)setLoading(false);});return ()=>{live=false;};}
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,next)=>{if(live){setSession(next);setLoading(false);}});
  void supabase.auth.getSession().then(({data,error:failure})=>{if(live){setSession(data.session);setError(failure?'Unable to restore your session. Sign in again.':null);setLoading(false);}}).catch(()=>{if(live){setError('Unable to restore your session.');setLoading(false);}});
  return ()=>{live=false;subscription.unsubscribe();};
 },[]);
 return <AuthContext.Provider value={{session,loading,error}}>{children}</AuthContext.Provider>;
}
export function useAuth(){return useContext(AuthContext);}
