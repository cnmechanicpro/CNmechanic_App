import { AppError } from './errors';
import type { z } from 'zod';
export async function readJson<T extends z.ZodType>(request:Request,schema:T):Promise<z.infer<T>> {
 if(request.headers.get('content-type')?.split(';')[0].trim()!=='application/json')throw new AppError('UNSUPPORTED_MEDIA_TYPE',415,'Use application/json.');
 const reader=request.body?.getReader();if(!reader)throw new AppError('VALIDATION_ERROR',400,'A JSON body is required.');
 let length=0;const chunks:Uint8Array[]=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>4096){await reader.cancel();throw new AppError('PAYLOAD_TOO_LARGE',413,'Request body is too large.');}chunks.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 let data:unknown;try{data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw new AppError('VALIDATION_ERROR',400,'Invalid JSON.');}
 const result=schema.safeParse(data);if(!result.success)throw new AppError('VALIDATION_ERROR',400,'Invalid request fields.');return result.data;
}
