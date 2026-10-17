import {Body,Controller,Get,HttpCode,Param,Post,Put,Req,Res} from '@nestjs/common';
import {ApiBearerAuth,ApiOkResponse,ApiTags} from '@nestjs/swagger';
import {isUUID} from 'class-validator';
import type {Response} from 'express';
import {ApiErrors} from '../common/openapi.js';
import {ApiException,type SepRequest} from '../common/http.js';
import {Access} from '../platform/context.guard.js';
import {PeerReviewService} from './reviews.service.js';
import {AssignReviewerDto,CreateReviewRoundDto,InviteReviewerDto,MemberResponseDto,ReviewResponseDto,SaveReviewDto,SubmitReviewDto,WorkMessageDto,ReviewWorkspaceDto,ReviewMemberDto,ReviewAssignmentDto,WorkReviewFileDto} from './reviews.dto.js';
const uuid=(...ids:string[])=>{if(ids.some(id=>!isUUID(id)))throw new ApiException(400,'VALIDATION_FAILED');};
@ApiTags('peer-review') @ApiBearerAuth() @ApiErrors() @Controller('events/:eventId/peer-review')
export class PeerReviewController {
 constructor(private readonly service:PeerReviewService){}
 @Get('committee') @Access('submissions-manage') @ApiOkResponse({type:ReviewWorkspaceDto}) roster(@Req()req:SepRequest){return this.service.roster(req.security);}
 @Post('committee') @HttpCode(200) @Access('submissions-manage') @ApiOkResponse({type:ReviewMemberDto}) nominate(@Req()req:SepRequest,@Body()dto:InviteReviewerDto){return this.service.nominate(req.security,dto);}
 @Post('committee/:personId/revoke') @HttpCode(200) @Access('submissions-manage') @ApiOkResponse({type:ReviewMemberDto}) revoke(@Req()req:SepRequest,@Param('personId')id:string,@Body()dto:WorkMessageDto){uuid(id);return this.service.revokeMember(req.security,id,dto);}
 @Get('mine') @Access('author-work') @ApiOkResponse({type:ReviewWorkspaceDto}) mine(@Req()req:SepRequest){return this.service.mine(req.security);}
 @Post('mine/membership') @HttpCode(200) @Access('author-work') @ApiOkResponse({type:ReviewMemberDto}) membership(@Req()req:SepRequest,@Body()dto:MemberResponseDto){return this.service.memberResponse(req.security,dto);}
 @Get('mine/status') @Access('author-work') @ApiOkResponse({schema:{type:'object',required:['count'],properties:{count:{type:'integer',minimum:0}}}}) status(@Req()req:SepRequest){return this.service.mineStatus(req.security);}
 @Get('mine/:assignmentId') @Access('author-work') @ApiOkResponse({type:ReviewAssignmentDto}) read(@Req()req:SepRequest,@Param('assignmentId')id:string){uuid(id);return this.service.read(req.security,id);}
 @Post('mine/:assignmentId/respond') @HttpCode(200) @Access('author-work') @ApiOkResponse({type:ReviewAssignmentDto}) respond(@Req()req:SepRequest,@Param('assignmentId')id:string,@Body()dto:ReviewResponseDto){uuid(id);return this.service.respond(req.security,id,dto);}
 @Put('mine/:assignmentId') @Access('author-work') @ApiOkResponse({type:ReviewAssignmentDto}) save(@Req()req:SepRequest,@Param('assignmentId')id:string,@Body()dto:SaveReviewDto){uuid(id);return this.service.save(req.security,id,dto);}
 @Post('mine/:assignmentId/submit') @HttpCode(200) @Access('author-work') @ApiOkResponse({type:ReviewAssignmentDto}) submit(@Req()req:SepRequest,@Param('assignmentId')id:string,@Body()dto:SubmitReviewDto){uuid(id);return this.service.save(req.security,id,dto,true);}
 @Get('mine/:assignmentId/files/:fileId') @Access('author-work') @ApiOkResponse({schema:{type:'string',format:'binary'},description:'PDF de la versión oficial asignada, tras aceptar y mientras siga vigente.'}) async pdf(@Req()req:SepRequest,@Param('assignmentId')id:string,@Param('fileId')fileId:string,@Res()res:Response){uuid(id,fileId);const asset=await this.service.pdf(req.security,id,fileId);res.set({'content-type':'application/pdf','content-disposition':`attachment; filename="review-${asset.metadata.id}.pdf"`,'cache-control':'no-store','x-content-type-options':'nosniff'});res.send(asset.data);}
 @Get('works/:workId') @Access('submissions-manage') @ApiOkResponse({type:WorkReviewFileDto}) file(@Req()req:SepRequest,@Param('workId')id:string){uuid(id);return this.service.file(req.security,id);}
 @Post('works/:workId/rounds') @HttpCode(200) @Access('submissions-manage') @ApiOkResponse({type:WorkReviewFileDto}) round(@Req()req:SepRequest,@Param('workId')id:string,@Body()dto:CreateReviewRoundDto){uuid(id);return this.service.createRound(req.security,id,dto);}
 @Post('works/:workId/rounds/:roundId/close') @HttpCode(200) @Access('submissions-manage') @ApiOkResponse({type:WorkReviewFileDto}) close(@Req()req:SepRequest,@Param('workId')id:string,@Param('roundId')roundId:string,@Body()dto:WorkMessageDto){uuid(id,roundId);return this.service.closeRound(req.security,id,roundId,dto);}
 @Post('works/:workId/rounds/:roundId/assign') @HttpCode(200) @Access('submissions-manage') @ApiOkResponse({type:WorkReviewFileDto}) assign(@Req()req:SepRequest,@Param('workId')id:string,@Param('roundId')roundId:string,@Body()dto:AssignReviewerDto){uuid(id,roundId);return this.service.assign(req.security,id,roundId,dto);}
 @Post('works/:workId/assignments/:assignmentId/revoke') @HttpCode(200) @Access('submissions-manage') @ApiOkResponse({type:WorkReviewFileDto}) revokeAssignment(@Req()req:SepRequest,@Param('workId')id:string,@Param('assignmentId')assignmentId:string,@Body()dto:WorkMessageDto){uuid(id,assignmentId);return this.service.revokeAssignment(req.security,id,assignmentId,dto);}
}
