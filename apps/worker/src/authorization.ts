import { can,type Capability } from '@cnmechanic/domain';
import type { OrganizationRole } from '@cnmechanic/schemas';
import { AppError } from './errors';
export function authorize(roles:OrganizationRole[],capability:Capability){if(!can(roles,capability))throw new AppError('FORBIDDEN',403,'This action is not permitted.');}
