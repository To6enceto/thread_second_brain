import { readFileSync } from 'node:fs';
import { verifiedPdfPackageFiles } from './pdf-assets.mjs';
import { releaseFiles, addUpdateMetadata, decodeRelease, digest } from '../src/desktop/update-package.ts';
const path=process.argv[2];if(!path)throw Error('Usage: node --experimental-strip-types scripts/verify-package.mjs path.zip');
const bytes=readFileSync(path),release=decodeRelease(bytes),names=['main.js','manifest.json','styles.css',...verifiedPdfPackageFiles()];
if(JSON.stringify(names)!==JSON.stringify(releaseFiles))throw Error('Pinned release inventory mismatch.');
const expected=addUpdateMetadata(new Map(names.map(name=>[name,readFileSync(name)])));
for(const[name,data]of release.files)if(!data.equals(expected.get(name)))throw Error('Package differs from verified production files.');
console.log(JSON.stringify({path,version:release.version,...digest(bytes),files:[...release.files].map(([path,bytes])=>({path:'thread/'+path,...digest(bytes)})),verified:true},null,2));
