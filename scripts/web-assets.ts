import { readFileSync,writeFileSync,mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnv } from 'vite';
import { canonicalOrigin,webConfigSchema } from '@cnmechanic/config';
const root=process.cwd(),dist=resolve(root,'dist');
const env=webConfigSchema.parse({...loadEnv('production',root,'VITE_'),...Object.fromEntries(Object.entries(process.env).filter(([k])=>k.startsWith('VITE_')))});
const index=readFileSync(resolve(dist,'index.html'),'utf8');
// Explicit known routes preserve real HTTP 404s on Pages (no wildcard SPA rewrite).
for(const route of ['auth','account']){mkdirSync(resolve(dist,route),{recursive:true});writeFileSync(resolve(dist,route,'index.html'),index.replace('<link rel="canonical" href="https://www.cnmechanic.com/"/>',`<link rel="canonical" href="${canonicalOrigin}/${route}"/>`));}
writeFileSync(resolve(dist,'404.html'),index);
writeFileSync(resolve(dist,'robots.txt'),'User-agent: *\nDisallow: /\n');
writeFileSync(resolve(dist,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>\n');
writeFileSync(resolve(dist,'llms.txt'),'# CNMechanic\n\nThe platform is under development. No mechanic search or booking is available.\n\n- OpenAPI: /openapi.json\n- WebMCP: get_platform_info, public read only, when supported.\n- Remote MCP: planned, not available.\n');
const connect=[env.VITE_API_BASE_URL,env.VITE_SUPABASE_URL].filter(Boolean).join(' ');
writeFileSync(resolve(dist,'_headers'),`/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: DENY\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  Strict-Transport-Security: max-age=31536000; includeSubDomains\n  X-Robots-Tag: noindex, nofollow\n  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self' ${connect}; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'\n`);
writeFileSync(resolve(dist,'_redirects'),`https://cnmechanic.com/* ${canonicalOrigin}/:splat 301\n`);
