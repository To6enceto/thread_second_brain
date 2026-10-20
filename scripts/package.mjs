import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {crc32} from 'node:zlib';
import {createHash} from 'node:crypto';
import {verifiedPdfPackageFiles} from './pdf-assets.mjs';
const manifest=JSON.parse(readFileSync('manifest.json','utf8'));
const pkg=JSON.parse(readFileSync('package.json','utf8'));
if(manifest.id!=='thread'||manifest.version!==pkg.version||!/^\d+\.\d+\.\d+$/.test(manifest.version)||manifest.isDesktopOnly!==true)throw new Error('Thread release metadata is inconsistent.');
const names=['main.js','manifest.json','styles.css',...verifiedPdfPackageFiles()];
const entries=names.map(name=>{const bytes=readFileSync(name);if(!bytes.length)throw new Error(`Empty release file: ${name}`);return {name:Buffer.from('thread/'+name),bytes};});
// ZIP STORE, fixed 1980-01-01 timestamps and fixed ordering: reproducible bytes,
// no platform archiver dependency and no recursive inclusion of vault data.
const local=[],central=[];let offset=0;
for(const {name,bytes} of entries){
 const crc=crc32(bytes);const header=Buffer.alloc(30);header.writeUInt32LE(0x04034b50);header.writeUInt16LE(20,4);header.writeUInt16LE(33,12);header.writeUInt32LE(crc,14);header.writeUInt32LE(bytes.length,18);header.writeUInt32LE(bytes.length,22);header.writeUInt16LE(name.length,26);
 local.push(header,name,bytes);
 const directory=Buffer.alloc(46);directory.writeUInt32LE(0x02014b50);directory.writeUInt16LE(20,4);directory.writeUInt16LE(20,6);directory.writeUInt16LE(33,14);directory.writeUInt32LE(crc,16);directory.writeUInt32LE(bytes.length,20);directory.writeUInt32LE(bytes.length,24);directory.writeUInt16LE(name.length,28);directory.writeUInt32LE(offset,42);central.push(directory,name);offset+=header.length+name.length+bytes.length;
}
const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);
const archive=Buffer.concat([...local,directory,end]);mkdirSync('dist/thread',{recursive:true});for(let i=0;i<names.length;i++){const target='dist/thread/'+names[i];mkdirSync(target.slice(0,target.lastIndexOf('/')),{recursive:true});writeFileSync(target,entries[i].bytes);}
const path=`dist/thread-${manifest.version}.zip`;writeFileSync(path,archive);console.log(`${path} | ${archive.length} bytes | SHA-256 ${createHash('sha256').update(archive).digest('hex')}`);
