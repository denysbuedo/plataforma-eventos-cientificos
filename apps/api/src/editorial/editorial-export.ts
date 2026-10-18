import type {PublicationSnapshot} from '@sep/contracts';
const bib=(v:string)=>v.replace(/[\\{}%&#_$]/g,c=>c==='\\'?'\\textbackslash{}':'\\'+c).replace(/[\r\n]/g,' ');
const line=(v:string)=>v.replace(/[\r\n]/g,' ');
export function exportPublication(s:PublicationSnapshot,format:'json'|'csl'|'bib'|'ris',paperId?:string){
 const papers=paperId?s.papers.filter(p=>p.id===paperId):s.papers,year=new Date(s.publishedAt).getUTCFullYear(),book=s.content.locale==='es'?s.content.titleEs:s.content.titleEn;
 const url=(id:string)=>{const u=new URL(s.canonicalUrl);u.pathname+='/papers/'+id;return u.href;};
 if(format==='json')return JSON.stringify({...s,papers},null,2);
 if(format==='csl')return JSON.stringify(papers.map(p=>({id:`sep:${s.eventId}:${p.id}:edition:${s.id}`,type:'paper-conference',title:p.title,author:p.authors.map(a=>({literal:a.fullName})),'container-title':book,'event-title':s.content.locale==='es'?s.eventNameEs:s.eventNameEn,publisher:s.content.publisher,issued:{'date-parts':[[year,new Date(s.publishedAt).getUTCMonth()+1,new Date(s.publishedAt).getUTCDate()]]},page:p.firstPage+'-'+p.lastPage,language:p.language,abstract:p.abstract,keyword:p.keywords.join('; '),URL:url(p.id),rights:p.license})),null,2);
 if(format==='bib')return papers.map(p=>`@inproceedings{sep_${p.id.replaceAll('-','')}_${s.id.replaceAll('-','')},\n  title = {${bib(p.title)}},\n  author = {${p.authors.map(a=>'{'+bib(a.fullName)+'}').join(' and ')}},\n  booktitle = {${bib(book)}},\n  publisher = {${bib(s.content.publisher)}},\n  year = {${year}},\n  pages = {${p.firstPage}--${p.lastPage}},\n  language = {${p.language}},\n  url = {${bib(url(p.id))}},\n  note = {${bib(p.license)}}\n}`).join('\n\n')+'\n';
 return papers.map(p=>['TY  - CPAPER','TI  - '+line(p.title),...p.authors.map(a=>'AU  - '+line(a.fullName)),'T2  - '+line(book),'PB  - '+line(s.content.publisher),'PY  - '+year,'SP  - '+p.firstPage,'EP  - '+p.lastPage,'LA  - '+p.language,'AB  - '+line(p.abstract),...p.keywords.map(k=>'KW  - '+line(k)),'UR  - '+url(p.id),'N1  - '+p.license,'ER  - '].join('\r\n')).join('\r\n\r\n')+'\r\n';
}
