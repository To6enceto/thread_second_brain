import {readFileSync} from 'node:fs';
import {crc32} from 'node:zlib';
import {createHash} from 'node:crypto';
import {verifiedPdfPackageFiles} from './pdf-assets.mjs';
const path=process.argv[2];if(!path)throw Error('Usage: node scripts/verify-package.mjs path.zip');
const zip=readFileSync(path),end=zip.length-22,manifest=JSON.parse(readFileSync('manifest.json','utf8'));
const names=['main.js','manifest.json','styles.css',...verifiedPdfPackageFiles()].map(n=>'thread/'+n);
const check=(ok,message)=>{if(!ok)throw Error(message);};
check(end>=0&&zip.readUInt32LE(end)===0x06054b50,'Invalid ZIP end');check(zip.readUInt32LE(end+4)===0&&zip.readUInt16LE(end+20)===0,'Multipart/comments unsupported');
check(zip.readUInt16LE(end+8)===names.length&&zip.readUInt16LE(end+10)===names.length,'Wrong inventory count');
let at=0,central=zip.readUInt32LE(end+16);check(central+zip.readUInt32LE(end+12)===end,'Invalid directory bounds');const files=[];
for(const name of names){
 check(zip.readUInt32LE(at)===0x04034b50&&zip.readUInt32LE(central)===0x02014b50,'Invalid ZIP record');
 const length=Buffer.byteLength(name),size=zip.readUInt32LE(at+18),crc=zip.readUInt32LE(at+14),payload=at+30+length;
 check(zip.readUInt16LE(at+4)===20&&zip.readUInt32LE(at+6)===0&&zip.readUInt16LE(at+10)===0&&zip.readUInt16LE(at+12)===33,'Unsupported flags/compression/timestamp');
 check(zip.readUInt32LE(at+22)===size&&zip.readUInt16LE(at+26)===length&&zip.readUInt16LE(at+28)===0&&zip.subarray(at+30,payload).toString()===name,'Invalid local path/size');
 check(zip.readUInt16LE(central+4)===20&&zip.readUInt16LE(central+6)===20&&zip.readUInt32LE(central+8)===0&&zip.readUInt16LE(central+12)===0&&zip.readUInt16LE(central+14)===33,'Unsupported directory flags');
 check(zip.readUInt32LE(central+16)===crc&&zip.readUInt32LE(central+20)===size&&zip.readUInt32LE(central+24)===size&&zip.readUInt16LE(central+28)===length&&zip.readUInt16LE(central+30)===0&&zip.readUInt32LE(central+32)===0&&zip.readUInt16LE(central+36)===0&&zip.readUInt32LE(central+38)===0&&zip.readUInt32LE(central+42)===at&&zip.subarray(central+46,central+46+length).toString()===name,'Invalid central record');
 const bytes=zip.subarray(payload,payload+size);check(bytes.length===size&&crc32(bytes)===crc,'CRC mismatch');check(bytes.equals(readFileSync(name.slice(7))),'Package differs from verified production file');
 files.push({path:name,bytes:size,sha256:createHash('sha256').update(bytes).digest('hex')});at=payload+size;central+=46+length;
}
check(at===zip.readUInt32LE(end+16)&&central===end,'Unlisted ZIP bytes');
console.log(JSON.stringify({path,version:manifest.version,bytes:zip.length,sha256:createHash('sha256').update(zip).digest('hex'),files,verified:true},null,2));
