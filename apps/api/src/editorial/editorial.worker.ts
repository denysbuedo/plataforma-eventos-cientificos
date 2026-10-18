import {parentPort,workerData} from 'node:worker_threads';
import {readFile} from 'node:fs/promises';
import {PDFDocument,rgb,type PDFPage} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type {PublicationSnapshot} from '@sep/contracts';
interface Input {snapshot:PublicationSnapshot;files:{workId:string;data:Uint8Array}[];preview:boolean}
async function render({snapshot:s,files,preview}:Input){
 const doc=await PDFDocument.create();doc.registerFontkit(fontkit);
 const font=await doc.embedFont(await readFile(new URL('../../assets/fonts/NotoSans-Regular.ttf',import.meta.url)),{subset:true}),supported=new Set(font.getCharacterSet()),es=s.content.locale==='es',ink=rgb(.1,.2,.17),green=rgb(.13,.35,.29);
 let page!:PDFPage,y=0;const width=495;
 const clean=(text:string)=>{const v=text.replace(/\r\n?/g,'\n').replace(/\t/g,' ');for(const ch of Array.from(v))if(ch!=='\n'&&!supported.has(ch.codePointAt(0)!))throw new Error('unsupported glyph');return v;};
 function newPage(){if(doc.getPageCount()>=1000)throw new Error('page limit');page=doc.addPage([595,842]);y=786;}
 function wrap(value:string,size:number,w=width){const out:string[]=[];for(const paragraph of clean(value).split('\n')){let line='';for(const word of paragraph.split(/\s+/u).filter(Boolean)){if(font.widthOfTextAtSize(line?line+' '+word:word,size)<=w){line=line?line+' '+word:word;continue;}if(line)out.push(line);line='';for(const char of Array.from(word)){if(font.widthOfTextAtSize(line+char,size)>w){out.push(line);line='';}line+=char;}}out.push(line);}return out;}
 function text(value:string,size=11,gap=6){for(const line of wrap(value,size)){if(y<size+62)newPage();page.drawText(line,{x:50,y,size,font,color:ink});y-=size+gap;}y-=gap;}
 const heading=(value:string)=>{y-=10;text(value,16,7);};
 newPage();page.drawLine({start:{x:50,y:767},end:{x:545,y:767},thickness:2,color:green});y=720;
 text(es?s.content.titleEs:s.content.titleEn,25,10);text(es?s.eventNameEs:s.eventNameEn,16,8);y-=20;
 text(`${es?'Edición':'Edition'} ${s.edition} · ${new Date(s.publishedAt).getUTCFullYear()}`,12);
 text(s.content.publisher,14);if(s.content.editors.length){heading(es?'Edición científica':'Scientific editors');text(s.content.editors.join('; '),12);}
 if(preview){y-=20;text(es?'PRUEBA EDITORIAL · NO PUBLICADA':'EDITORIAL PROOF · UNPUBLISHED',14);}
 newPage();heading(es?'Créditos y comité':'Credits and committee');text(es?s.content.creditsEs:s.content.creditsEn);if((es?s.content.committeeEs:s.content.committeeEn).trim()){heading(es?'Comité científico':'Scientific committee');text(es?s.content.committeeEs:s.content.committeeEn);}
 text(es?'Cada contribución conserva la licencia indicada en su ficha.':'Each contribution retains the license stated in its record.');text(es?'Los resúmenes y trabajos se conservan en su idioma original.':'Abstracts and papers retain their original language.');text(s.canonicalUrl,8,4);
 const preface=es?s.content.prefaceEs:s.content.prefaceEn;if(preface.trim()){newPage();heading(es?'Presentación':'Preface');text(preface);}
 newPage();heading(es?'Índice de contribuciones':'Table of contents');let group='';
 const toc:{page:PDFPage;y:number;paper:PublicationSnapshot['papers'][number]}[]=[];
 for(const paper of s.papers){const next=es?paper.groupEs:paper.groupEn;if(next!==group){if(y<140)newPage();heading(next);group=next;}
  const lines=wrap(paper.title,10,450),height=lines.length*16+12;if(y-height<64)newPage();toc.push({page,y,paper});for(const line of lines){page.drawText(line,{x:50,y,font,size:10,color:ink});y-=16;}y-=12;
 }
 group='';
 for(const paper of s.papers){newPage();paper.firstPage=doc.getPageCount();const next=es?paper.groupEs:paper.groupEn;if(next!==group){text(next,12);group=next;}
  heading(paper.title);text(paper.authors.map(a=>a.fullName).join('; '),11);
  for(const author of paper.authors){const affiliation=author.affiliations.map(a=>a.institution+(a.countryCode?' · '+a.countryCode:'')).join('; ');text(author.fullName+(affiliation?' — '+affiliation:'')+(author.orcid?' · ORCID '+author.orcid+(author.orcidVerified?(es?' (verificado)':' (verified)'):''):''),9,4);}
  text(`${es?'Versión':'Version'} ${paper.versionNumber} · ${paper.license==='all-rights-reserved'?(es?'Todos los derechos reservados':'All rights reserved'):paper.license}`,9,4);
  if(paper.demoUnscanned)text(es?'DEMOSTRACIÓN: archivo sin análisis antivirus; sin valor editorial real.':'DEMONSTRATION: file not virus-scanned; no actual editorial validity.',9);
  heading(es?'Resumen':'Abstract');text(paper.abstract,11,6);text(`${es?'Palabras clave':'Keywords'}: ${paper.keywords.join('; ')}`,10);
  if(s.kind==='proceedings'){
   const file=files.find(f=>f.workId===paper.id);if(!file)throw new Error('missing paper');
   const source=await PDFDocument.load(file.data,{updateMetadata:false,throwOnInvalidObject:true});if(source.isEncrypted)throw new Error('encrypted');
   const embeddedPages=await doc.embedPages(source.getPages());for(const embedded of embeddedPages){newPage();const scale=Math.min(495/embedded.width,730/embedded.height);page.drawPage(embedded,{x:(595-embedded.width*scale)/2,y:55+(730-embedded.height*scale)/2,width:embedded.width*scale,height:embedded.height*scale});}
  }
  paper.lastPage=doc.getPageCount();
 }
 for(const entry of toc){const number=String(entry.paper.firstPage);entry.page.drawText(number,{x:545-font.widthOfTextAtSize(number,10),y:entry.y,font,size:10,color:ink});}
 newPage();heading(es?'Índice de autores':'Author index');const authors=new Map<string,number[]>();
 for(const paper of s.papers)for(const a of paper.authors){const list=authors.get(a.fullName)??[];if(!list.includes(paper.firstPage))list.push(paper.firstPage);authors.set(a.fullName,list);}
 for(const [name,pages]of [...authors].sort(([a],[b])=>a.localeCompare(b,s.content.locale)))text(name+' · '+pages.join(', '),10,5);
 const pages=doc.getPageCount();for(let index=0;index<pages;index++){const p=doc.getPage(index);p.drawText(`${index+1} / ${pages}${preview?' · '+(es?'PRUEBA':'PROOF'):''}`,{x:50,y:25,font,size:8,color:ink});}
 s.pages=pages;doc.setTitle(es?s.content.titleEs:s.content.titleEn);doc.setAuthor(s.content.editors.join('; ')||s.content.publisher);doc.setSubject(es?s.eventNameEs:s.eventNameEn);doc.setCreator('SEP');doc.setLanguage(s.content.locale);doc.setCreationDate(new Date(s.publishedAt));doc.setModificationDate(new Date(s.publishedAt));const bytes=await doc.save();if(bytes.length>50*1024*1024)throw new Error('byte limit');return {pdf:bytes,snapshot:s};
}
void render(workerData as Input).then(value=>parentPort?.postMessage(value)).catch(()=>parentPort?.postMessage({error:true}));
