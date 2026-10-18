import type {SchemaObject} from '@nestjs/swagger';
const text:SchemaObject={type:'string'},nullable:SchemaObject={type:'string',nullable:true},integer:SchemaObject={type:'integer'},boolean:SchemaObject={type:'boolean'},uuid:SchemaObject={type:'string',format:'uuid'},date:SchemaObject={type:'string',format:'date-time'};
const object=(properties:Record<string,SchemaObject>):SchemaObject=>({type:'object',required:Object.keys(properties),properties});
const array=(items:SchemaObject):SchemaObject=>({type:'array',items});
const notice=object({id:uuid,kind:text,title:text,message:text,target:text,resourceId:{...uuid,nullable:true},category:{type:'string',enum:['operational','optional']},createdAt:date,readAt:{...date,nullable:true}});
const delivery=object({personName:text,id:uuid,notificationId:uuid,title:text,recipient:nullable,status:{type:'string',enum:['pending','processing','retry','sent','failed','suppressed','blocked']},attempts:integer,errorCode:nullable,createdAt:date,nextAttemptAt:{...date,nullable:true},deliveredAt:{...date,nullable:true}});
export const communicationSchemas={
 templates:object({data:array(object({kind:text,titleEs:text,titleEn:text}))}),
 inbox:object({data:array(notice),total:integer,unread:integer,offset:integer,limit:integer}),
 preferences:object({emailEnabled:boolean,optionalEmail:boolean,locale:{type:'string',enum:['es','en']},revision:integer,verifiedEmail:nullable,mailAvailable:boolean}),
 deliveries:object({data:array(delivery),total:integer,offset:integer,limit:integer,mailAvailable:boolean,counts:object({pending:integer,processing:integer,retry:integer,sent:integer,failed:integer,suppressed:integer,blocked:integer})}),
 attempts:object({data:array(object({id:uuid,status:text,errorCode:nullable,createdAt:date}))}),
 announcements:object({data:array(object({id:uuid,messageEs:text,messageEn:text,audience:{type:'string',enum:['registrants','reviewers']},category:{type:'string',enum:['operational','optional']},createdAt:date,recipientCount:integer}))}),
 updated:object({updated:boolean}),queued:object({queued:boolean}),created:object({id:uuid}),
};
