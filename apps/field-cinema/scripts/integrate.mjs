import {cp,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const release=fileURLToPath(new URL('../dist/',import.meta.url));
const target=fileURLToPath(new URL('../../web/public/field-cinema/',import.meta.url));
await mkdir(target,{recursive:true});await cp(release,target,{recursive:true});console.log('Field Cinema static build copied into investor app.');
