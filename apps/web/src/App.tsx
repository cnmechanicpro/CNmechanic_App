import { useEffect,useId,useState,type FormEvent,type ReactNode } from 'react';
import { Link,NavLink,Route,Routes,useLocation,useNavigate,useParams,useSearchParams } from 'react-router-dom';
import { ApiError } from '@cnmechanic/api-client';
import type { Profile,Vehicle } from '@cnmechanic/schemas';
import { publicMechanicSchema,publicShopSchema } from '@cnmechanic/schemas';
import { Button,Card,Input,Status } from './components';
import { useAuth } from './auth';
import { api,supabase } from './services';
import brandArtwork from '../../../CNMechanic_Premium European Auto Mechanic Logo.png';
import {applyProviderMetadata,applyRouteMetadata,resolveRouteMetadata} from './metadata';
import {makeSlug,serviceTaxonomy as services,vehicleMakes as makes} from './marketplace-content';

function Icon({name,size=24}:{name:string;size?:number}){
  const paths:Record<string,ReactNode>={
    shield:<><path d="M12 3 4.8 6v5.2c0 4.7 2.8 8 7.2 9.8 4.4-1.8 7.2-5.1 7.2-9.8V6L12 3Z"/><path d="m9 12 2 2 4-4"/></>,
    car:<><path d="m5 11 1.4-4.1A2 2 0 0 1 8.3 5h7.4a2 2 0 0 1 1.9 1.9L19 11"/><path d="M4 11h16v7H4zM7 18v2m10-2v2M7 14h.01M17 14h.01"/></>,
    search:<><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/></>,
    file:<><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v5h4M10 12h5m-5 4h5"/></>,
    diagnostics:<><path d="M5 8h3l2-2h5l2 2h2v9h-2l-1 2H8l-1-2H5z"/><path d="M9 10v4m4-4v4"/></>,
    maintenance:<><path d="M14 6a4 4 0 0 0-5 5L3 17l4 4 6-6a4 4 0 0 0 5-5l-3 3-4-4 3-3Z"/></>,
    brakes:<><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 4v3m0 10v3m8-8h-3M7 12H4"/></>,
    electrical:<><path d="m13 2-8 12h7l-1 8 8-12h-7z"/></>,
    inspection:<><rect x="6" y="4" width="12" height="17" rx="1"/><path d="M9 4V2h6v2m-6 5h6m-6 4h6m-6 4h4"/></>,
    tires:<><path d="M9 3h6l2 3v12l-2 3H9l-2-3V6z"/><path d="m9 6 6 3-6 3 6 3-6 3"/></>,
    users:<><circle cx="9" cy="9" r="3"/><circle cx="17" cy="10" r="2"/><path d="M3 20c.4-4 2.4-6 6-6s5.6 2 6 6m0-5c3.5.1 5.4 1.8 6 5"/></>,
    arrow:<path d="M5 12h14m-5-5 5 5-5 5"/>,
  };
  return <svg aria-hidden="true" className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]??paths.arrow}</svg>;
}

function Metadata(){
  const location=useLocation();
  useEffect(()=>{applyRouteMetadata(document,resolveRouteMetadata(location.pathname,Boolean(location.search)));window.scrollTo({top:0,behavior:'instant'});},[location.pathname,location.search]);
  return null;
}

function Brand({footer=false}:{footer?:boolean}){
  return <Link className={footer?'brand brand-footer':'brand'} to="/" aria-label="CNMechanic home"><span className="brand-cn">CN</span><span>MECHANIC</span><i aria-hidden="true"/></Link>;
}

function SearchModule(){
  const navigate=useNavigate();
  function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const data=new FormData(e.currentTarget),params=new URLSearchParams();for(const key of ['city','vehicleMake','service']){const value=String(data.get(key)??'').trim();if(value)params.set(key,value);}void navigate(`/mechanics${params.size?`?${params}`:''}`);}
  return <form className="search-module" id="find" onSubmit={submit}>
    <div className="search-heading"><div><span className="section-kicker">PUBLIC DISCOVERY</span><h2>Find the right specialist.</h2></div><p>Search verified public profiles by location, vehicle make, service, and expertise.</p></div>
    <div className="search-fields">
      <label><span>City</span><input name="city" placeholder="City" autoComplete="address-level2"/></label>
      <label><span>Vehicle</span><select name="vehicleMake" defaultValue=""><option value="">Any make</option>{makes.map(make=><option value={make.toLowerCase().replaceAll(' ','-')} key={make}>{make}</option>)}</select></label>
      <label><span>Service</span><select name="service" defaultValue=""><option value="">Any service</option>{services.map(([slug,name])=><option value={slug} key={name}>{name}</option>)}</select></label>
      <Button type="submit">Search mechanics <Icon name="search" size={18}/></Button>
    </div>
  </form>;
}

function Home(){
  return <div className="marketing-home">
    <section className="hero-section">
      <div className="hero-copy">
        <p className="eyebrow line-label">TRUSTED NATIONWIDE. EUROPEAN FOCUSED.</p>
        <h1>Your car deserves<br/>the <em>right mechanic.</em></h1>
        <p className="lead">Find trusted specialists, keep your vehicle history in one place, and move through every service with clarity.</p>
        <div className="action-row"><Link className="button" to="/auth">Create your account <Icon name="arrow" size={18}/></Link><Link className="text-link" to="/for-mechanics">For mechanics <Icon name="arrow" size={17}/></Link></div>
        <div className="hero-proof"><span><Icon name="shield"/>Verified businesses</span><span><Icon name="diagnostics"/>Specialist expertise</span><span><Icon name="file"/>Private vehicle history</span></div>
      </div>
      <div className="hero-visual" aria-label="CNMechanic premium automotive network">
        <img src={brandArtwork} alt="CNMechanic European Auto Specialist emblem"/>
        <div className="hero-tech"><span>PRECISION</span><span>TRANSPARENCY</span><span>TRUST</span></div>
      </div>
    </section>
    <SearchModule/>
    <section className="light-section how" id="how-it-works">
      <div className="section-heading"><div><p className="section-kicker">SIMPLE BY DESIGN</p><h2>How <em>CNMechanic</em> works.</h2></div><p>One connected place for the people who own cars and the professionals who care for them.</p></div>
      <div className="steps">
        <article><span className="step-number">01</span><Icon name="car" size={34}/><h3>Add your vehicle</h3><p>Keep the details that matter organized in your private CN Garage.</p></article>
        <article><span className="step-number">02</span><Icon name="search" size={34}/><h3>Find the right specialist</h3><p>Connect with professionals matched to your vehicle and service needs.</p></article>
        <article><span className="step-number">03</span><Icon name="file" size={34}/><h3>Keep every record</h3><p>Build a clear service timeline you control with CN Passport.</p></article>
      </div>
    </section>
    <section className="verified-section">
      <div className="verified-mark"><span><Icon name="shield" size={54}/></span><div><p className="section-kicker">HIGHER STANDARDS. REAL EXPERTISE.</p><h2>CN <em>Verified</em></h2><p>Verification is designed to help you choose with confidence. Status is earned through real business and professional information, never assigned automatically by AI.</p></div></div>
      <div className="verified-list"><span><Icon name="shield"/><b>Identity reviewed</b><small>Real people. Real businesses.</small></span><span><Icon name="shield"/><b>Business reviewed</b><small>Registration and credentials.</small></span><span><Icon name="shield"/><b>Experience validated</b><small>Documented professional history.</small></span><span><Icon name="shield"/><b>Specialties confirmed</b><small>Vehicle makes and service expertise.</small></span></div>
    </section>
    <section className="makes-section light-section">
      <div className="section-heading compact"><div><p className="section-kicker">SPECIALIST KNOWLEDGE</p><h2>European expertise. <span>Built for every vehicle.</span></h2></div></div>
      <div className="makes" aria-label="Vehicle makes served">{makes.map(make=><span key={make}>{make}</span>)}</div>
    </section>
    <section className="services-section" id="services">
      <div className="section-heading"><div><p className="section-kicker">CARE THAT FITS YOUR CAR</p><h2>Everything your car needs.</h2></div><p>Discover specialists by service, vehicle, location, and expertise as the network opens.</p></div>
      <div className="service-grid">{services.map(([icon,name,copy])=><article key={name}><Icon name={icon} size={32}/><h3>{name}</h3><p>{copy}</p></article>)}</div>
    </section>
    <section className="products-section light-section">
      <article><div><p className="section-kicker">YOUR VEHICLES. ONE PLACE.</p><h2>CN <em>Garage</em></h2><p>Keep vehicle details, mileage, service documents, recommendations, and reminders organized around each car you own.</p><Link className="text-link dark-link" to="/auth">Open your account <Icon name="arrow" size={17}/></Link></div><div className="product-visual garage-visual"><Icon name="car" size={52}/><strong>My Garage</strong><span>Vehicles · Records · Reminders</span><div className="record-line"/><div className="record-line short"/><div className="record-line"/></div></article>
      <article><div><p className="section-kicker">A HISTORY YOU CONTROL.</p><h2>CN <em>Passport</em></h2><p>Build a private, persistent service timeline. Share only what you choose, and revoke access when you need to.</p><Link className="text-link dark-link" to="/auth">Start your history <Icon name="arrow" size={17}/></Link></div><div className="product-visual passport-visual"><Icon name="file" size={44}/><strong>Service timeline</strong><span className="timeline-row"><i/>Inspection</span><span className="timeline-row"><i/>Brake service</span><span className="timeline-row"><i/>Maintenance</span></div></article>
    </section>
    <section className="mechanics-cta">
      <div className="cta-image"><img src={brandArtwork} alt="CNMechanic brand emblem"/></div>
      <div><p className="section-kicker">FOR AUTOMOTIVE PROFESSIONALS</p><h2>Built for the people<br/>who keep <em>cars moving.</em></h2><p>Join a network built around quality, transparency, and long-term customer relationships.</p><div className="benefit-row"><span><Icon name="search"/><b>Get discovered</b></span><span><Icon name="shield"/><b>Build trust</b></span><span><Icon name="users"/><b>Keep customers</b></span></div><Link className="button" to="/for-mechanics">Explore the professional network <Icon name="arrow" size={18}/></Link></div>
    </section>
    <Faq/>
  </div>;
}

function Faq(){
  const items=[
    ['Is CNMechanic free to join?','Customer accounts are free during early access. Business plans and marketplace terms will be published before paid features launch.'],
    ['When will search and booking be available?','The secure account and vehicle foundation is live now. Mechanic discovery and booking are the next product stage.'],
    ['How are mechanics verified?','CN Verified is designed to review identity, business information, experience, credentials, and declared specialties. Verification is not automated by AI.'],
    ['Can I add multiple vehicles?','The platform is built for multiple vehicles. Your private CN Garage will organize each vehicle and its records separately.'],
    ['Is CNMechanic available nationwide?','The architecture is national. Marketplace availability will expand by location as qualified professionals join the network.'],
  ];
  return <section className="faq-section light-section" id="faq"><div><p className="section-kicker">STRAIGHT ANSWERS</p><h2>Frequently asked<br/>questions.</h2></div><div>{items.map(([q,a])=><details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div></section>;
}

function MechanicsSearch(){
 const [params,setParams]=useSearchParams(),queryKey=params.toString(),[state,setState]=useState<{key:string;result:Awaited<ReturnType<typeof api.searchMechanics>>|null;error:string}>({key:'',result:null,error:''});
 useEffect(()=>{const controller=new AbortController(),filters=new URLSearchParams(queryKey),key=queryKey;void api.searchMechanics({query:filters.get('query')||undefined,city:filters.get('city')||undefined,region:filters.get('region')||undefined,postalCode:filters.get('postalCode')||undefined,service:filters.get('service')||undefined,vehicleMake:filters.get('vehicleMake')||undefined,specialty:filters.get('specialty')||undefined,mobile:filters.get('mobile')==='true'?true:undefined,verified:true,limit:20,offset:0},controller.signal).then(result=>setState({key,result,error:''})).catch(error=>{if(!(error instanceof ApiError&&error.code==='REQUEST_ABORTED'))setState({key,result:null,error:'Search is temporarily unavailable. Please try again.'});});return()=>controller.abort();},[queryKey]);
 const loading=state.key!==queryKey,result=loading?null:state.result,error=loading?'':state.error;
 function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const data=new FormData(e.currentTarget),next=new URLSearchParams();for(const key of ['query','city','region','service','vehicleMake']){const value=String(data.get(key)??'').trim();if(value)next.set(key,value);}setParams(next);}
 return <div className="directory-page"><div className="directory-intro"><p className="eyebrow line-label">VERIFIED PUBLIC PROFILES</p><h1>Find a mechanic for your vehicle.</h1><p>Results include only active professionals whose identity and profile have passed CNMechanic’s publication controls.</p></div><form className="directory-filters" onSubmit={submit}><Input id="search-query" name="query" label="Service or specialty" defaultValue={params.get('query')??''}/><Input id="search-city" name="city" label="City" defaultValue={params.get('city')??''}/><Input id="search-region" name="region" label="State or region" defaultValue={params.get('region')??''}/><label><span>Service</span><select name="service" defaultValue={params.get('service')??''}><option value="">Any service</option>{services.map(([slug,name])=><option value={slug} key={slug}>{name}</option>)}</select></label><label><span>Vehicle make</span><select name="vehicleMake" defaultValue={params.get('vehicleMake')??''}><option value="">Any make</option>{makes.map(name=><option value={makeSlug(name)} key={name}>{name}</option>)}</select></label><Button>Search</Button></form>{error?<Status error>{error}</Status>:loading?<Status>Searching verified profiles…</Status>:result?.items.length?<><p className="result-count">{result.page.total} verified professional{result.page.total===1?'':'s'} found</p><div className="directory-results">{result.items.map(item=><Card key={item.id}><span className="verified-pill"><Icon name="shield" size={16}/> CN Verified</span><h2><Link to={`/mechanics/${item.slug}`}>{item.publicName}</Link></h2><p>{item.headline??'Automotive professional'}</p><p>{item.serviceAreas.map(area=>[area.city,area.region].filter(Boolean).join(', ')).filter(Boolean).join(' · ')||'Service area available on profile'}</p><div className="tag-row">{item.services.slice(0,4).map(service=><span key={service.slug}>{service.name}</span>)}</div></Card>)}</div></>:<Card><Icon name="search" size={34}/><h2>No verified profiles match these filters yet.</h2><p>Try a nearby city or broader service. CNMechanic does not create placeholder listings.</p></Card>}</div>;
}

function MechanicProfile(){const {slug}=useParams(),[profile,setProfile]=useState<ReturnType<typeof publicMechanicSchema.parse>|null>(null),[error,setError]=useState('');useEffect(()=>{const controller=new AbortController();if(slug)void api.mechanic(slug,controller.signal).then(value=>{setProfile(value);applyProviderMetadata(document,{kind:'mechanic',slug:value.slug,name:value.publicName,description:value.headline??value.biography??'Verified automotive professional on CNMechanic',verified:value.verified});}).catch(()=>{setError('This verified mechanic profile is unavailable.');applyRouteMetadata(document,{mode:'set',metadata:{title:'Page not found | CNMechanic',description:'The requested mechanic profile was not found.',robots:'noindex, nofollow'}});});return()=>controller.abort();},[slug]);if(error)return <Status error>{error}</Status>;if(!profile)return <Status>Loading public profile…</Status>;return <div className="profile-page"><p className="eyebrow line-label">CN VERIFIED PROFESSIONAL</p><h1>{profile.publicName}</h1><p className="lead">{profile.headline??'Automotive professional'}</p>{profile.biography?<p>{profile.biography}</p>:null}<section><h2>Services</h2><div className="tag-row">{profile.services.map(item=><Link to={`/services/${item.slug}`} key={item.slug}>{item.name}</Link>)}</div></section><section><h2>Vehicle expertise</h2><div className="tag-row">{profile.vehicleMakes.map(item=><Link to={`/brands/${item.slug}`} key={item.slug}>{item.name}</Link>)}</div></section><section><h2>Service areas</h2>{profile.serviceAreas.map(area=><p key={`${area.label}-${area.postalCode}`}>{area.label}: {[area.city,area.region,area.postalCode].filter(Boolean).join(', ')}</p>)}</section><p className="privacy-note">This public profile excludes account identity, membership, claim, availability, and customer data.</p></div>}
function ShopProfile(){const {slug}=useParams(),[profile,setProfile]=useState<ReturnType<typeof publicShopSchema.parse>|null>(null),[error,setError]=useState('');useEffect(()=>{const controller=new AbortController();if(slug)void api.shop(slug,controller.signal).then(value=>{setProfile(value);applyProviderMetadata(document,{kind:'shop',slug:value.slug,name:value.name,description:value.description??'Public automotive service business on CNMechanic',verified:value.verified});}).catch(()=>{setError('This shop profile is unavailable.');applyRouteMetadata(document,{mode:'set',metadata:{title:'Page not found | CNMechanic',description:'The requested shop profile was not found.',robots:'noindex, nofollow'}});});return()=>controller.abort();},[slug]);if(error)return <Status error>{error}</Status>;if(!profile)return <Status>Loading public shop…</Status>;return <div className="profile-page"><p className="eyebrow line-label">PUBLIC REPAIR BUSINESS</p><h1>{profile.name}</h1>{profile.verified?<span className="verified-pill"><Icon name="shield" size={16}/> CN Verified</span>:null}<p className="lead">{profile.description??'Automotive service business'}</p><section><h2>Locations</h2>{profile.locations.map(location=><p key={location.slug}><b>{location.name}</b> · {[location.city,location.region].filter(Boolean).join(', ')}</p>)}</section><section><h2>Services</h2><div className="tag-row">{profile.services.map(item=><Link to={`/services/${item.slug}`} key={item.slug}>{item.name}</Link>)}</div></section></div>}
function TaxonomyLanding({kind}:{kind:'services'|'brands'}){const {slug}=useParams(),entry=kind==='services'?services.find(([value])=>value===slug):makes.map(name=>[makeSlug(name),name,''] as const).find(([value])=>value===slug);if(!entry)return <div className="narrow error-page"><h1>Page not found.</h1></div>;const [,name,copy]=entry;return <div className="profile-page"><p className="eyebrow line-label">{kind==='services'?'AUTOMOTIVE SERVICE':'VEHICLE EXPERTISE'}</p><h1>{kind==='services'?`${name} specialists`:`${name} mechanics`}</h1><p className="lead">{copy||`Find verified public professionals who declare and document experience servicing ${name} vehicles.`}</p><p>CNMechanic search connects vehicle owners with qualified repair professionals. Published results come from the same verified marketplace records used by the API.</p><Link className="button" to={`/mechanics?${kind==='services'?'service':'vehicleMake'}=${slug}`}>Search verified mechanics <Icon name="search" size={18}/></Link></div>}

function ForMechanics(){
  return <div className="pro-page">
    <section className="pro-hero"><div><p className="eyebrow line-label">THE PROFESSIONAL NETWORK</p><h1>Grow a stronger<br/><em>automotive business.</em></h1><p className="lead">Get discovered by the right customers, show what makes your work different, and build lasting trust around every vehicle you service.</p><div className="action-row"><Link className="button" to="/auth">Join early access <Icon name="arrow" size={18}/></Link><a className="text-link" href="#professional-benefits">See the benefits <Icon name="arrow" size={17}/></a></div></div><div className="pro-panel"><span className="section-kicker">CNMECHANIC FOR PROFESSIONALS</span><h2>Your expertise deserves a better platform.</h2><p>Built for individual mechanics, mobile specialists, independent shops, and multi-location organizations.</p><div className="pro-metrics"><span><b>01</b>Get discovered</span><span><b>02</b>Build trust</span><span><b>03</b>Run the relationship</span></div></div></section>
    <section className="light-section pro-benefits" id="professional-benefits"><div className="section-heading"><div><p className="section-kicker">ONE CONNECTED PLATFORM</p><h2>More than a listing.</h2></div><p>CNMechanic is being built to connect your public reputation with the tools that help customers return.</p></div><div className="benefit-grid"><article><Icon name="search"/><h3>Be easier to find</h3><p>Present your locations, vehicle expertise, services, and availability in structured search.</p></article><article><Icon name="shield"/><h3>Show earned trust</h3><p>Build a verifiable profile around your real business, credentials, specialties, and completed work.</p></article><article><Icon name="file"/><h3>Keep work connected</h3><p>Bring requests, inspections, records, recommendations, and customer history into one clear flow.</p></article></div></section>
    <section className="join-band"><p className="section-kicker">EARLY ACCESS</p><h2>Help shape the network<br/>your work deserves.</h2><p>Create an account now. Professional onboarding opens in a future release.</p><Link className="button" to="/auth">Create your account <Icon name="arrow" size={18}/></Link></section>
  </div>;
}

function AuthPage(){const {session,loading,error:sessionError}=useAuth();const [signup,setSignup]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[failed,setFailed]=useState(false);const formId=useId();
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!supabase)return;const form=e.currentTarget;const data=new FormData(form);const email=String(data.get('email')),password=String(data.get('password'));setBusy(true);setMessage('');setFailed(false);try{const result=signup?await supabase.auth.signUp({email,password,options:{emailRedirectTo:`${window.location.origin}/auth`}}):await supabase.auth.signInWithPassword({email,password});if(result.error){setFailed(true);setMessage(signup?'Unable to create an account. Check your details and try again.':'Unable to sign in. Check your email and password.');}else{form.reset();setMessage(signup&&!result.data.session?'Check your email to confirm your account.':'You are signed in.');}}catch{setFailed(true);setMessage('Unable to reach the authentication service.');}finally{setBusy(false);}}
 if(loading)return <Status>Restoring session…</Status>;
 if(session)return <Card><h1>You’re signed in.</h1><p>Your secure CNMechanic account is ready.</p><Link className="button" to="/account">View account</Link></Card>;
 return <div className="auth-layout"><div className="auth-story"><p className="eyebrow line-label">YOUR CNMECHANIC ACCOUNT</p><h1>Your car’s story,<br/><em>kept together.</em></h1><p>Start your private garage and be ready when trusted specialist search and service tools open.</p><div className="auth-points"><span><Icon name="car"/>Vehicle details in one place</span><span><Icon name="shield"/>Private by default</span><span><Icon name="file"/>A service history you control</span></div></div><div className="auth-panel"><p className="section-kicker">{signup?'CREATE YOUR ACCOUNT':'WELCOME BACK'}</p><h2>{signup?'Join CNMechanic':'Sign in'}</h2><p>{signup?'Create your secure account to start your CN Garage.':'Access your CN Garage and account settings.'}</p>{sessionError?<Status error>{sessionError}</Status>:null}{!supabase?<Status>Account access is not configured in this environment.</Status>:<form id={formId} onSubmit={e=>void submit(e)}><Input id={`${formId}-email`} label="Email address" name="email" type="email" autoComplete="email" required maxLength={254}/><Input id={`${formId}-password`} label="Password" name="password" type="password" autoComplete={signup?'new-password':'current-password'} minLength={signup?12:1} maxLength={128} required/>{signup?<p className="muted">Use at least 12 characters.</p>:null}<Button disabled={busy} type="submit">{busy?'Please wait…':signup?'Create account':'Sign in'} <Icon name="arrow" size={18}/></Button></form>}{message?<Status error={failed}>{message}</Status>:null}<Button className="text-button" disabled={busy} onClick={()=>{setSignup(!signup);setMessage('');}}>{signup?'Already have an account? Sign in':'New to CNMechanic? Create an account'}</Button></div></div>;
}

function Account(){const {session,loading}=useAuth();const [profile,setProfile]=useState<Profile|null>(null),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{let live=true;if(session)void api.me().then(p=>{if(live)setProfile(p);}).catch(()=>{if(live)setError('Unable to load your profile.');});return ()=>{live=false;};},[session]);
 async function save(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError('');setMessage('');try{const next=await api.updateMe({displayName:String(new FormData(e.currentTarget).get('displayName'))});setProfile(next);setMessage('Profile saved.');}catch(err){setError(err instanceof ApiError?err.message:'Unable to save your profile.');}finally{setBusy(false);}}
 async function signOut(){setBusy(true);setError('');try{const result=await supabase?.auth.signOut();if(result?.error)setError('Unable to sign out. Please try again.');}catch{setError('Unable to sign out. Please try again.');}finally{setBusy(false);}}
 if(loading)return <Status>Restoring session…</Status>;if(!session)return <Card><h1>Sign in to your account.</h1><Link className="button" to="/auth">Sign in</Link></Card>;
 return <div className="narrow"><p className="eyebrow line-label">YOUR ACCOUNT</p><h1>Account settings.</h1><p>Manage your profile while the CNMechanic marketplace tools are prepared for release.</p>{profile?<form onSubmit={e=>void save(e)}><Input id="displayName" label="Display name" name="displayName" defaultValue={profile.displayName} maxLength={100} required/><Button disabled={busy}>Save profile</Button></form>:!error?<Status>Loading profile…</Status>:null}{error?<Status error>{error}</Status>:null}{message?<Status>{message}</Status>:null}<div className="account-actions"><Link className="button secondary" to="/vehicles">View your vehicles</Link><Button className="secondary" disabled={busy} onClick={()=>void signOut()}>Sign out</Button></div></div>;
}

function Vehicles(){const {session,loading}=useAuth();const [vehicles,setVehicles]=useState<Vehicle[]|null>(null),[error,setError]=useState('');useEffect(()=>{if(session)void api.vehicles().then(setVehicles).catch(()=>setError('Unable to load your vehicles.'));},[session]);if(loading)return <Status>Restoring session…</Status>;if(!session)return <Card><h1>Sign in to view your vehicles.</h1><Link className="button" to="/auth">Sign in</Link></Card>;return <div className="narrow wide-narrow"><p className="eyebrow line-label">CN GARAGE</p><h1>Your vehicles.</h1><p>Vehicles are private to their owners and authorized service organizations. VINs are never displayed here.</p>{error?<Status error>{error}</Status>:vehicles===null?<Status>Loading vehicles…</Status>:vehicles.length===0?<Card><Icon name="car" size={36}/><h2>Your garage is ready.</h2><p>Your vehicles will appear here when they are securely added through the authenticated service.</p></Card>:<div className="vehicle-grid">{vehicles.map(v=><Card key={v.id}><Icon name="car"/><h2>{v.modelYear} {v.model.name}</h2><p>{v.trim??'Trim not recorded'} · {v.propulsionType.replaceAll('_',' ')}</p></Card>)}</div>}</div>}

function SiteFooter(){return <footer className="site-footer"><div className="footer-inner"><div><Brand footer/><p>A higher standard for automotive care.</p></div><div><strong>Explore</strong><Link to="/mechanics">Find a mechanic</Link><a href="/#how-it-works">How it works</a><Link to="/for-mechanics">For mechanics</Link></div><div><strong>Your account</strong><Link to="/auth">Sign in</Link><Link to="/vehicles">CN Garage</Link><Link to="/account">Account settings</Link></div><div><strong>Foundation status</strong><span>Accounts and private vehicle access are live.</span><span>Verified public discovery is live. Booking is not yet available.</span></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} CNMechanic. All rights reserved.</span><span>Better cars. Brighter journeys.</span></div></footer>}

export default function App(){const [menu,setMenu]=useState(false);const {session}=useAuth();const closeMenu=()=>setMenu(false);return <><Metadata/><a className="skip-link" href="#main">Skip to content</a><header className="site-header"><div className="nav"><Brand/><button className="menu-button" aria-expanded={menu} aria-controls="primary-nav" onClick={()=>setMenu(!menu)}>Menu</button><nav id="primary-nav" aria-label="Primary" className={menu?'open':''}><NavLink to="/mechanics" onClick={closeMenu}>Find a mechanic</NavLink><a href="/#how-it-works" onClick={closeMenu}>How it works</a><NavLink to="/for-mechanics" onClick={closeMenu}>For mechanics</NavLink></nav><div className="nav-actions"><NavLink className="nav-signin" to={session?'/account':'/auth'}>{session?'Account':'Sign in'}</NavLink><Link className="button nav-cta" to={session?'/vehicles':'/auth'}>{session?'My garage':'Create account'}</Link></div></div></header><main id="main" tabIndex={-1}><Routes><Route path="/" element={<Home/>}/><Route path="/mechanics" element={<MechanicsSearch/>}/><Route path="/mechanics/:slug" element={<MechanicProfile/>}/><Route path="/shops/:slug" element={<ShopProfile/>}/><Route path="/services/:slug" element={<TaxonomyLanding kind="services"/>}/><Route path="/brands/:slug" element={<TaxonomyLanding kind="brands"/>}/><Route path="/for-mechanics" element={<ForMechanics/>}/><Route path="/auth" element={<AuthPage/>}/><Route path="/account" element={<Account/>}/><Route path="/vehicles" element={<Vehicles/>}/><Route path="*" element={<div className="narrow error-page"><p className="eyebrow line-label">404 / LOST ROAD</p><h1>Page not found.</h1><p>The page you’re looking for does not exist.</p><Link className="button" to="/">Return home <Icon name="arrow" size={18}/></Link></div>}/></Routes></main><SiteFooter/></>}
