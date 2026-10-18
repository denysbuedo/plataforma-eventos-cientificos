import {paymentSchemas as schemas} from '../common/operations.openapi.js';
import {Body,Controller,Get,HttpCode,Module,Param,ParseUUIDPipe,Post,Put,Req} from '@nestjs/common';
import {ApiBearerAuth,ApiOkResponse,ApiTags} from '@nestjs/swagger';
import {IdentityModule} from '../identity/identity.module.js';
import {AuditService} from '../common/audit.service.js';
import {Access} from '../platform/context.guard.js';
import {ApiErrors} from '../common/openapi.js';
import type {SepRequest} from '../common/http.js';
import {PaymentsService} from './payments.service.js';
import {SavePaymentSettingsDto,IssueChargeDto,ReportPaymentDto,DecidePaymentDto} from './payments.dto.js';
@ApiTags('payments') @ApiBearerAuth() @ApiErrors() @Controller('events/:eventId/payments')
class PaymentsController{
 constructor(private readonly service:PaymentsService){}
 @Get() @Access('finance-manage') @ApiOkResponse({schema:schemas.workspace}) workspace(@Req()r:SepRequest){return this.service.workspace(r.security);}
 @Get('mine') @Access('author-work') @ApiOkResponse({schema:schemas.mine}) mine(@Req()r:SepRequest){return this.service.mine(r.security);}
 @Put('settings') @Access('finance-manage') @ApiOkResponse({schema:{type:'object',properties:{revision:{type:'integer'}}}}) settings(@Req()r:SepRequest,@Body()d:SavePaymentSettingsDto){return this.service.save(r.security,d);}
 @Post('charges') @HttpCode(200) @Access('finance-manage') @ApiOkResponse({schema:schemas.charge}) issue(@Req()r:SepRequest,@Body()d:IssueChargeDto){return this.service.issue(r.security,d);}
 @Post('mine') @HttpCode(200) @Access('author-work') @ApiOkResponse({schema:schemas.charge}) request(@Req()r:SepRequest,@Body()d:IssueChargeDto){return this.service.request(r.security,d);}
 @Post('mine/:id/report') @HttpCode(200) @Access('author-work') @ApiOkResponse({schema:{type:'object',properties:{revision:{type:'integer'}}}}) report(@Req()r:SepRequest,@Param('id',ParseUUIDPipe)id:string,@Body()d:ReportPaymentDto){return this.service.report(r.security,id,d);}
 @Post('charges/:id/decision') @HttpCode(200) @Access('finance-manage') @ApiOkResponse({schema:{type:'object',properties:{revision:{type:'integer'}}}}) decision(@Req()r:SepRequest,@Param('id',ParseUUIDPipe)id:string,@Body()d:DecidePaymentDto){return this.service.decide(r.security,id,d);}
}
@Module({imports:[IdentityModule],providers:[PaymentsService,AuditService],controllers:[PaymentsController]})
export class PaymentsModule{}
