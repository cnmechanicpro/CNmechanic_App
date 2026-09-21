import type { ErrorCode } from '@cnmechanic/schemas';
export class AppError extends Error {constructor(public code:ErrorCode,public status:number,message:string){super(message);}}
export function safeError(error:unknown){return error instanceof AppError?error:new AppError('INTERNAL_ERROR',500,'An unexpected error occurred.');}
