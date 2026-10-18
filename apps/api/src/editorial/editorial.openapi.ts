import type {SchemaObject} from '@nestjs/swagger';
const str:SchemaObject={type:'string'},num:SchemaObject={type:'integer'},bool:SchemaObject={type:'boolean'},uuid:SchemaObject={type:'string',format:'uuid'},date:SchemaObject={type:'string',format:'date-time'};
const object=(properties:Record<string,SchemaObject>):SchemaObject=>({type:'object',properties,required:Object.keys(properties)}),array=(items:SchemaObject):SchemaObject=>({type:'array',items}),nullable=(v:SchemaObject):SchemaObject=>({...v,nullable:true});
const kind:SchemaObject={type:'string',enum:['abstracts','proceedings']},license:SchemaObject={type:'string',enum:['CC-BY-4.0','CC-BY-SA-4.0','CC-BY-NC-4.0','all-rights-reserved']};
const content=object({titleEs:str,titleEn:str,publisher:str,editors:array(str),creditsEs:str,creditsEn:str,committeeEs:str,committeeEn:str,prefaceEs:str,prefaceEn:str,groupBy:{type:'string',enum:['track','activity']},locale:{type:'string',enum:['es','en']},publicOrigin:str});
const permission=object({revision:num,abstractAllowed:bool,fullTextAllowed:bool,license,updatedAt:nullable(date)});
const summary=object({revision:num,id:uuid,kind,edition:num,titleEs:str,titleEn:str,status:{type:'string',enum:['published','withdrawn']},publishedAt:date,withdrawnAt:nullable(date),withdrawReason:nullable(str),sha256:str,pages:num,paperCount:num,canonicalUrl:str});
const author=object({fullName:str,affiliations:array(object({institution:str,countryCode:str}))});author.properties!.orcid=str;author.properties!.orcidVerified=bool;
const paper=object({id:uuid,title:str,abstract:str,keywords:array(str),language:{type:'string',enum:['es','en']},authors:array(author),versionNumber:num,groupEs:str,groupEn:str,license,firstPage:num,lastPage:num,fileSha256:nullable(str),demoUnscanned:bool});
const snapshot=object({id:uuid,kind,edition:num,eventId:uuid,eventNameEs:str,eventNameEn:str,content,publishedAt:date,papers:array(paper),canonicalUrl:str,pages:num});
const history=object({id:uuid,action:str,actorName:str,reason:str,createdAt:date,workId:nullable(uuid)});
export const editorialSchemas={
 workspace:object({proof:str,kind,content,revision:num,items:array(object({workId:uuid,title:str,versionId:uuid,versionNumber:num,versionKind:{type:'string',enum:['submission','final']},status:str,included:bool,ready:bool,order:num,revision:num,note:str,permission,issues:array(str)})),releases:array(summary)}),
 candidates:object({data:array(object({workId:uuid,title:str,status:str,versionId:uuid,versionNumber:num,versionKind:str,eligible:bool})),total:num,offset:num,limit:num}),
 mine:object({requests:array(object({workId:uuid,title:str,versionId:uuid,versionNumber:num,versionKind:str,requestedFor:array(kind),current:bool,permission,fileId:nullable(uuid),fileName:nullable(str)})),publications:array(summary),history:array(history)}),
 summary,detail:object({...summary.properties,snapshot:nullable(snapshot)}),list:object({data:array(summary)}),history:object({data:array(history)}),updated:object({updated:bool}),withdrawn:object({withdrawn:bool}),pdf:{type:'string',format:'binary'} as SchemaObject,
};
