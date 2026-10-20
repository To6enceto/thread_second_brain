import{readFileSync,writeFileSync,mkdirSync,readdirSync,copyFileSync}from'node:fs';
import{join}from'node:path';
import{createHash}from'node:crypto';
const root='node_modules/pdfjs-dist',parser='pdfjs-dist@6.4.299';
export function copyPdfResources(){
 if(JSON.parse(readFileSync(join(root,'package.json'),'utf8')).version!=='6.4.299')throw Error('PDF parser pin mismatch.');
 mkdirSync('pdf-resources',{recursive:true});copyFileSync(join(root,'LICENSE'),'pdf-resources/pdfjs-LICENSE.txt');
 for(const folder of['cmaps','standard_fonts']){mkdirSync('pdf-resources/'+folder,{recursive:true});for(const file of readdirSync(join(root,folder),{withFileTypes:true})){if(!file.isFile()||!/^[A-Za-z0-9_][A-Za-z0-9_.-]{0,99}$/.test(file.name))throw Error('Unexpected upstream PDF asset.');copyFileSync(join(root,folder,file.name),'pdf-resources/'+folder+'/'+file.name);}}
}
export function writePdfInventory(){
 const names=['pdf-extract-worker.js','pdf-resources/pdfjs-LICENSE.txt',...['cmaps','standard_fonts'].flatMap(folder=>readdirSync('pdf-resources/'+folder).sort().map(name=>'pdf-resources/'+folder+'/'+name))];
 const files=names.map(path=>{const data=readFileSync(path);return{path,bytes:data.length,hash:createHash('sha256').update(data).digest('hex')};});writeFileSync('pdf-assets.json',JSON.stringify({schemaVersion:1,parser,files},null,2)+'\n');
}
export function verifiedPdfPackageFiles(){
 const manifest=JSON.parse(readFileSync('pdf-assets.json','utf8'));if(manifest.schemaVersion!==1||manifest.parser!==parser||!Array.isArray(manifest.files)||manifest.files.length>300)throw Error('Invalid PDF release inventory.');
 const names=new Set();let total=0;for(const file of manifest.files){if(typeof file.path!=='string'||!(file.path==='pdf-extract-worker.js'||/^pdf-resources\/(?:cmaps|standard_fonts)\/[A-Za-z0-9_][A-Za-z0-9_.-]{0,99}$/.test(file.path)||file.path==='pdf-resources/pdfjs-LICENSE.txt')||names.has(file.path))throw Error('Unsafe PDF release path.');const data=readFileSync(file.path);if(data.length!==file.bytes||data.length>12*1048576||createHash('sha256').update(data).digest('hex')!==file.hash)throw Error('Changed PDF release asset.');names.add(file.path);total+=data.length;}
 if(total>16*1048576||!names.has('pdf-extract-worker.js')||!names.has('pdf-resources/pdfjs-LICENSE.txt')||!names.has('pdf-resources/cmaps/LICENSE')||!names.has('pdf-resources/standard_fonts/LICENSE_FOXIT')||!names.has('pdf-resources/standard_fonts/LICENSE_LIBERATION'))throw Error('Missing PDF resources/license inventory.');return['pdf-assets.json',...names];
}
