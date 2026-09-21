export function json(data:unknown,requestId:string,status=200){return Response.json({data,requestId},{status});}
export function secure(response:Response,requestId:string,origin:string|null,allowed:string[]){
 const h=response.headers;h.set('X-Request-ID',requestId);h.set('X-Content-Type-Options','nosniff');h.set('Cache-Control','no-store');h.set('Referrer-Policy','no-referrer');h.set('Content-Security-Policy',"default-src 'none'; frame-ancestors 'none'");h.set('Strict-Transport-Security','max-age=31536000; includeSubDomains');h.set('Vary','Origin');
 if(origin && allowed.includes(origin)){h.set('Access-Control-Allow-Origin',origin);h.set('Access-Control-Expose-Headers','X-Request-ID');}
 return response;
}
