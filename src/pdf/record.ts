import {object} from '../settings/settings.ts';
import {frontmatter,localDay} from '../vault/workspace.ts';
import {contentHash} from '../vault/scope.ts';
import {pdfPath} from './scope.ts';
export const PDF_PARSER='pdfjs-dist@6.4.299',PDF_EXTRACTION='thread-pdf-1';
export const PDF_LIMITS=Object.freeze({bytes:16*1048576,totalPages:200,pages:40,pageChars:8000,chars:100000,timeoutMs:30000});
export interface PdfPage {page:number;text:string;shortened:boolean;}
export interface PdfExtraction {totalPages:number;pages:PdfPage[];}
export interface PdfRecord {schemaVersion:1;path:string;hash:string;parser:typeof PDF_PARSER;extraction:typeof PDF_EXTRACTION;totalPages:number;pages:{page:number;chars:number;hash:string;shortened:boolean}[];}
const digest=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
function exactKeys(data:Record<string,unknown>,keys:string[]):void{if(Object.keys(data).sort().join('|')!==[...keys].sort().join('|'))throw Error('Unsupported PDF extraction fields.');}
export function validateExtraction(value:unknown):PdfExtraction{
 const data=object(value);exactKeys(data,['totalPages','pages']);if(!Number.isInteger(data.totalPages)||Number(data.totalPages)<1||Number(data.totalPages)>PDF_LIMITS.totalPages||!Array.isArray(data.pages)||!data.pages.length||data.pages.length>Math.min(Number(data.totalPages),PDF_LIMITS.pages))throw Error('Unsupported PDF page count.');
 let chars=0;const pages=data.pages.map((value,i)=>{const page=object(value);exactKeys(page,['page','text','shortened']);if(page.page!==i+1||typeof page.text!=='string'||page.text.length>PDF_LIMITS.pageChars||typeof page.shortened!=='boolean'||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(page.text))throw Error('Invalid PDF page text or mapping.');chars+=page.text.length;return{page:i+1,text:page.text,shortened:page.shortened};});if(chars>PDF_LIMITS.chars)throw Error('PDF text exceeds the finite extraction budget.');if(!pages.some(p=>p.text.trim()))throw Error('No selectable text was found in examined pages. Image-only PDFs require OCR, which Thread does not provide.');return{totalPages:Number(data.totalPages),pages};
}
function quote(text:string):string{return text.split('\n').map(line=>'> '+line.replace(/([\\`*_{}\[\]()<>#!|~])/g,'\\$1')).join('\n');}
/** Only machine-assigned page headings may identify PDF passages. */
export function pdfEvidenceText(extraction:PdfExtraction):string{return extraction.pages.filter(p=>p.text.trim()).map(p=>`## PDF page ${p.page}\n\n${quote(p.text)}\n`).join('\n');}
function body(extraction:PdfExtraction):string{
 return '# Local PDF extraction\n\nSelectable text extracted locally. Original PDF remains unchanged. Text order, missing fonts, complex layouts and examined-page/text limits can omit or reorder content. This is extracted text, not an AI summary.\n\n'+extraction.pages.map(page=>`## PDF page ${page.page}\n\n${quote(page.text)}\n`).join('\n')+'\n## Extraction coverage\n\n'+`${extraction.pages.length} of ${extraction.totalPages} pages examined; ${extraction.pages.filter(p=>p.shortened).length} shortened pages; ${extraction.pages.filter(p=>!p.text.trim()).length} empty examined pages. Limits: ${PDF_LIMITS.pages} pages, ${PDF_LIMITS.pageChars} characters/page, ${PDF_LIMITS.chars} total characters. Omitted page content is unknown.\n`;
}
export async function pdfSource(extractionInput:unknown,path:string,hash:string):Promise<string>{
 const extraction=validateExtraction(extractionInput);pdfPath(path);if(!digest(hash))throw Error('PDF original hash is invalid.');
 const record:PdfRecord={schemaVersion:1,path,hash,parser:PDF_PARSER,extraction:PDF_EXTRACTION,totalPages:extraction.totalPages,pages:await Promise.all(extraction.pages.map(async p=>({page:p.page,chars:p.text.length,hash:await contentHash(p.text),shortened:p.shortened})))};
 return frontmatter({id:crypto.randomUUID(),type:'source',captured_on:localDay(),thread_pdf_version:'1',thread_pdf:JSON.stringify(record)})+body(extraction);
}
/** Exact canonical quoted text makes document contents inert and keeps page mapping reviewable. */
export async function readPdfSource(text:string,metadata:Record<string,unknown>):Promise<{record:PdfRecord;extraction:PdfExtraction}>{
 if(text.length>400000||metadata.type!=='source'||metadata.thread_pdf_version!=='1'||typeof metadata.id!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(metadata.id)||typeof metadata.thread_pdf!=='string'||metadata.thread_pdf.length>30000||['thread_sources','thread_model','thread_question_version','thread_review_version','thread_review_key','thread_review_snapshot'].some(k=>metadata[k]!==undefined))throw Error('Unsupported PDF extraction record.');
 let record:Record<string,unknown>;try{record=object(JSON.parse(metadata.thread_pdf));}catch{throw Error('Malformed PDF extraction provenance.');}exactKeys(record,['schemaVersion','path','hash','parser','extraction','totalPages','pages']);pdfPath(record.path);if(record.schemaVersion!==1||!digest(record.hash)||record.parser!==PDF_PARSER||record.extraction!==PDF_EXTRACTION||!Number.isInteger(record.totalPages)||Number(record.totalPages)<1||Number(record.totalPages)>PDF_LIMITS.totalPages||!Array.isArray(record.pages)||!record.pages.length||record.pages.length>PDF_LIMITS.pages)throw Error('Unsupported PDF extraction version or pages.');
 const header=/^(?:\uFEFF)?---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.exec(text);if(!header||text.includes('\r'))throw Error('PDF extraction formatting changed. Extract a new source explicitly.');
 const rawBody=text.slice(header[0].length),chunks=[...rawBody.matchAll(/^## PDF page (\d+)\n\n((?:>[^\n]*\n)+)/gm)];if(chunks.length!==record.pages.length)throw Error('PDF page sections changed.');
 const pages=await Promise.all(record.pages.map(async(value,i)=>{const p=object(value),chunk=chunks[i]!;exactKeys(p,['page','chars','hash','shortened']);if(p.page!==i+1||Number(chunk[1])!==p.page||!Number.isInteger(p.chars)||!digest(p.hash)||typeof p.shortened!=='boolean')throw Error('Invalid PDF page provenance.');const pageText=chunk[2]!.slice(0,-1).split('\n').map(line=>{if(!line.startsWith('> '))throw Error('Invalid quoted PDF text.');return line.slice(2).replace(/\\([\\`*_{}\[\]()<>#!|~])/g,'$1');}).join('\n');if(pageText.length!==p.chars||await contentHash(pageText)!==p.hash)throw Error('Extracted page text changed. Extract a new source explicitly.');return{page:i+1,text:pageText,shortened:p.shortened};}));
 const extraction=validateExtraction({totalPages:record.totalPages,pages});if(rawBody!=='\n'+body(extraction))throw Error('PDF extraction body changed. Extract a new source explicitly.');return{record:record as unknown as PdfRecord,extraction};
}
