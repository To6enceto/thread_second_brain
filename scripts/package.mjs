import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { verifiedPdfPackageFiles } from './pdf-assets.mjs';
import { releaseFiles, addUpdateMetadata, encodeRelease, digest } from '../src/desktop/update-package.ts';
const args=process.argv.slice(2);if(args.length&&!(args.length===2&&args[0]==='--out-dir'))throw Error('Usage: package.mjs [--out-dir directory]');
const out=args[1]??'dist',manifest=JSON.parse(readFileSync('manifest.json','utf8')),pkg=JSON.parse(readFileSync('package.json','utf8'));
if(manifest.version!==pkg.version)throw Error('Thread release versions disagree.');
const names=['main.js','manifest.json','styles.css',...verifiedPdfPackageFiles()];
if(JSON.stringify(names)!==JSON.stringify(releaseFiles))throw Error('Pinned release inventory changed. Review it before packaging.');
const files=addUpdateMetadata(new Map(names.map(path=>[path,readFileSync(path)]))),archive=encodeRelease(files),staging=`${out}/thread-${manifest.version}`;
mkdirSync(staging,{recursive:true});for(const[path,bytes]of files){const target=staging+'/'+path;mkdirSync(target.slice(0,target.lastIndexOf('/')),{recursive:true});writeFileSync(target,bytes);}
const path=`${out}/thread-${manifest.version}.zip`;writeFileSync(path,archive);console.log(`${path} | ${archive.length} bytes | SHA-256 ${digest(archive).sha256}`);
