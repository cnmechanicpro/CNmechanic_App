export interface RequestLog {requestId:string;route:string;method:string;status:number;durationMs:number;environment:string;}
export function logRequest(event:RequestLog){console.log(JSON.stringify({event:'api_request',...event}));}
