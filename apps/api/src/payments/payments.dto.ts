import {ApiProperty} from '@nestjs/swagger';
import {Type} from 'class-transformer';
import {ArrayMaxSize,ArrayMinSize,ArrayUnique,IsArray,IsBoolean,IsDefined,IsIn,IsInt,IsOptional,IsString,IsUUID,Matches,MaxLength,Min,MinLength,ValidateNested} from 'class-validator';
const currencies=['CUP','USD','EUR'];
export class PaymentRevisionDto{@ApiProperty() @IsInt() @Min(0) revision!:number;@ApiProperty() @IsString() @MinLength(10) @MaxLength(1000) reason!:string;}
class PublicFieldDto{@ApiProperty() @IsString() @MinLength(2) @MaxLength(80) label!:string;@ApiProperty() @IsString() @MaxLength(300) value!:string;}
class MethodDto{
 @ApiProperty() @IsUUID() id!:string;@ApiProperty() @IsString() @MinLength(2) @MaxLength(100) name!:string;@ApiProperty({enum:['cash','gateway']}) @IsIn(['cash','gateway']) kind!:'cash'|'gateway';
 @ApiProperty({type:[String],enum:currencies}) @IsArray() @ArrayMinSize(1) @ArrayMaxSize(3) @ArrayUnique() @IsIn(currencies,{each:true}) currencies!:('CUP'|'USD'|'EUR')[];
 @ApiProperty() @IsBoolean() active!:boolean;@ApiProperty() @IsString() @MaxLength(1500) checkoutUrl!:string;@ApiProperty() @IsString() @MaxLength(1500) instructions!:string;
 @ApiProperty({type:[PublicFieldDto]}) @IsArray() @ArrayMaxSize(12) @ValidateNested({each:true}) @Type(()=>PublicFieldDto) fields!:PublicFieldDto[];
}
class PriceDto{@ApiProperty({enum:currencies}) @IsIn(currencies) currency!:'CUP'|'USD'|'EUR';@ApiProperty() @IsString() @Matches(/^(?:0|[1-9]\d{0,8})\.\d{2}$/) amount!:string;}
class FeeDto{@ApiProperty() @IsUUID() id!:string;@ApiProperty() @IsString() @MinLength(2) @MaxLength(150) name!:string;@ApiProperty() @IsString() @MaxLength(1500) description!:string;@ApiProperty() @IsBoolean() active!:boolean;@ApiProperty({type:[PriceDto]}) @IsArray() @ArrayMinSize(1) @ArrayMaxSize(3) @ValidateNested({each:true}) @Type(()=>PriceDto) prices!:PriceDto[];}
class SettingsContentDto{@ApiProperty() @IsBoolean() enabled!:boolean;@ApiProperty({type:[MethodDto]}) @IsArray() @ArrayMaxSize(20) @ValidateNested({each:true}) @Type(()=>MethodDto) methods!:MethodDto[];@ApiProperty({type:[FeeDto]}) @IsArray() @ArrayMaxSize(50) @ValidateNested({each:true}) @Type(()=>FeeDto) fees!:FeeDto[];@ApiProperty() @IsString() @MaxLength(2000) instructions!:string;}
export class SavePaymentSettingsDto extends PaymentRevisionDto{@ApiProperty({type:SettingsContentDto}) @IsDefined() @ValidateNested() @Type(()=>SettingsContentDto) content!:SettingsContentDto;}
export class IssueChargeDto{@ApiProperty() @IsUUID() requestId!:string;@ApiProperty() @IsUUID() registrationId!:string;@ApiProperty() @IsUUID() feeId!:string;@ApiProperty({enum:currencies}) @IsIn(currencies) currency!:'CUP'|'USD'|'EUR';@ApiProperty() @IsString() @MinLength(10) @MaxLength(1000) reason!:string;}
export class ReportPaymentDto extends PaymentRevisionDto{@ApiProperty() @IsUUID() methodId!:string;@ApiProperty() @IsString() @MinLength(3) @MaxLength(100) reference!:string;@ApiProperty() @IsString() @MaxLength(1500) report!:string;}
export class DecidePaymentDto extends PaymentRevisionDto{@ApiProperty({enum:['paid','open','waived','cancelled','refunded']}) @IsIn(['paid','open','waived','cancelled','refunded']) state!:'paid'|'open'|'waived'|'cancelled'|'refunded';@ApiProperty({nullable:true,type:String}) @IsOptional() @IsUUID() methodId!:string|null;@ApiProperty() @IsString() @MaxLength(100) reference!:string;}
