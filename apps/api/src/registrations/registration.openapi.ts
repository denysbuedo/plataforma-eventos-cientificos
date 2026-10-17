import type {SchemaObject} from '@nestjs/swagger';
const string:SchemaObject={type:'string'},integer:SchemaObject={type:'integer'},date:SchemaObject={type:'string',format:'date'},time:SchemaObject={type:'string',format:'date-time'},uuid:SchemaObject={type:'string',format:'uuid'},boolean:SchemaObject={type:'boolean'};
const object=(properties:Record<string,SchemaObject>):SchemaObject=>({type:'object',properties,required:Object.keys(properties)});
const array=(items:SchemaObject):SchemaObject=>({type:'array',items});
const nullable=(schema:SchemaObject):SchemaObject=>({...schema,nullable:true});
const affiliation=object({institution:string,countryCode:string});
const category=object({id:uuid,nameEs:string,nameEn:string,active:boolean});
const modality:SchemaObject={type:'string',enum:['in_person','virtual']};
const status:SchemaObject={type:'string',enum:['pending','confirmed','waitlisted','rejected','cancelled']};
const content=object({opensOn:nullable(date),closesOn:nullable(date),instructionsEs:string,instructionsEn:string,approvalRequired:boolean,capacityInPerson:nullable(integer),capacityVirtual:nullable(integer),modalities:array(modality),categories:array(category)});
const publication=object({id:uuid,content,timezone:string,revision:integer,publishedAt:time});
const counts=object({pending:integer,confirmed:integer,waitlisted:integer,inPerson:integer,virtual:integer,ownPosition:nullable(integer)});
const entry=object({id:uuid,personId:uuid,name:string,email:nullable(string),affiliations:array(affiliation),category,modality,status,revision:integer,requestedAt:time,updatedAt:time,policy:publication});
const summary=object({id:uuid,personId:uuid,name:string,category,modality,status,revision:integer,requestedAt:time,updatedAt:time});
const history=object({id:uuid,action:string,status,actorName:string,message:string,createdAt:time});
const detail=object({entry,history:array(history)});
const reception=object({publication,available:boolean,reason:{type:'string',enum:['open','upcoming','closed','inactive','timezone_changed']},counts});
export const registrationSchemas={
 settings:object({content,revision:integer,publication:nullable(publication),publishedActive:boolean,timezone:string,counts}),
 reception,detail,
 mine:object({registration:nullable(detail),reception:nullable(reception),profile:object({name:string,affiliations:array(affiliation),email:nullable(string)})}),
 page:object({data:array(summary),total:integer,limit:integer,offset:integer,counts}),
};
