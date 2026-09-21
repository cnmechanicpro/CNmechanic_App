import { writeFileSync,mkdirSync } from 'node:fs';
import { openapi } from '../apps/worker/src/openapi';
mkdirSync('apps/web/public',{recursive:true});
writeFileSync('apps/web/public/openapi.json',JSON.stringify(openapi,null,2)+'\n');
