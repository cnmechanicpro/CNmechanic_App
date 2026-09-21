import { workerConfigSchema } from '@cnmechanic/config';
import { AppError } from './errors';
export function config(env:unknown){const result=workerConfigSchema.safeParse(env);if(!result.success)throw new AppError('SERVICE_UNAVAILABLE',503,'Service configuration is unavailable.');return result.data;}
