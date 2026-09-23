type PagesContext={request:Request;params:Record<string,string|string[]>;env:{ASSETS:{fetch(request:Request):Promise<Response>};VITE_API_BASE_URL?:string};};
const escape=(value:string)=>value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
export async function renderPublicProfile(context:PagesContext,kind:'mechanics'|'shops'){
 const raw=context.params.slug,slug=Array.isArray(raw)?raw[0]:raw;
 if(!slug||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))return new Response('Not found',{status:404});
 const base=context.env.VITE_API_BASE_URL??'https://api.cnmechanic.com',response=await fetch(`${base}/api/v1/${kind}/${slug}`,{headers:{Accept:'application/json'}});
 if(response.status===404){const page=await context.env.ASSETS.fetch(new Request(new URL('/404.html',context.request.url)));return new Response(page.body,{status:404,headers:page.headers});}
 if(!response.ok)return new Response('Public profile temporarily unavailable.',{status:503,headers:{'Retry-After':'60'}});
 const payload=await response.json() as {data:{name?:string;publicName?:string;description?:string|null;headline?:string|null;verified:boolean;slug:string}};
 const profile=payload.data,name=profile.publicName??profile.name??'CNMechanic profile',description=profile.headline??profile.description??'Public automotive professional profile on CNMechanic';
 const shell=await context.env.ASSETS.fetch(new Request(new URL('/index.html',context.request.url))),canonical=`https://www.cnmechanic.com/${kind}/${slug}`;
 let html=await shell.text();html=html.replace(/<title>.*?<\/title>/,`<title>${escape(name)} | CNMechanic</title>`).replace('<link rel="canonical" href="https://www.cnmechanic.com/"/>',`<link rel="canonical" href="${canonical}"/>`).replace(/<meta name="description" content="[^"]*"\/>/,`<meta name="description" content="${escape(description)}"/>`).replace(/<meta name="robots" content="[^"]*"\/>/,'<meta name="robots" content="index, follow"/>');
 const json=JSON.stringify({'@context':'https://schema.org','@type':kind==='mechanics'?'Person':'AutoRepair',name,description,url:canonical,...(profile.verified?{award:'CN Verified'}:{})}).replaceAll('<','\\u003c');
 html=html.replace('</head>',`<script id="cn-jsonld" data-canonical="${canonical}" type="application/ld+json">${json}</script></head>`);return new Response(html,{status:200,headers:{...Object.fromEntries(shell.headers),'Content-Type':'text/html; charset=utf-8','Cache-Control':'public, max-age=300'}});
}
