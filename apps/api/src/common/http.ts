import { ArgumentsHost, Catch, HttpException, type ExceptionFilter } from '@nestjs/common';
import type { Request, Response } from 'express';
import { errorMessage, type ErrorCode, type Locale } from '@sep/i18n';
import type { ApiError, ValidationIssue } from '@sep/contracts';
import type { DataScope } from '../database/database.service.js';

export interface RequestContext extends DataScope { requestId: string; hostEventId: string | null; authMode?: 'development-token' | 'oidc'; verifiedEmail?: string }
export interface SepRequest extends Request { requestId: string; locale: Locale; security: RequestContext }
export class ApiException extends HttpException {
  constructor(status: number, code: ErrorCode, issues?: ValidationIssue[]) { super({ code, issues }, status); }
}
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const request = host.switchToHttp().getRequest<SepRequest>();
    const response = host.switchToHttp().getResponse<Response>();
    const status = exception instanceof HttpException ? exception.getStatus() : 500;
    const raw = exception instanceof HttpException ? exception.getResponse() : undefined;
    const details = typeof raw === 'object' && raw !== null ? raw as { code?: ErrorCode; issues?: ValidationIssue[] } : {};
    const fallback: ErrorCode = status === 404 ? 'NOT_FOUND' : status === 403 ? 'FORBIDDEN' : status === 401 ? 'UNAUTHORIZED'
      : status === 400 ? 'VALIDATION_FAILED' : 'INTERNAL_ERROR';
    const code = details.code ?? fallback;
    const body: ApiError = { error: { code, message: errorMessage(code, request.locale ?? 'es'), requestId: request.requestId } };
    if (details.issues?.length) body.error.issues = details.issues;
    response.status(status).json(body);
  }
}
