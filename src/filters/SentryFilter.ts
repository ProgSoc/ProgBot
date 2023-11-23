import { Catch, ArgumentsHost, HttpServer } from '@nestjs/common';
import { AbstractHttpAdapter, BaseExceptionFilter } from '@nestjs/core';
import * as Sentry from '@sentry/node';
import mainLogger from 'src/logger';

@Catch()
export class SentryFilter extends BaseExceptionFilter {
  handleUnknownError(
    exception: any,
    host: ArgumentsHost,
    applicationRef: HttpServer<any, any> | AbstractHttpAdapter<any, any, any>,
  ): void {
    Sentry.captureException(exception);
    mainLogger.error(exception);
    super.handleUnknownError(exception, host, applicationRef);
  }
}
