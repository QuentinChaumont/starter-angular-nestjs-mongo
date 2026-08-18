import { Global, Module } from '@nestjs/common';
import { GlobalExceptionFilter } from './filters/global-exception.filter';

@Global()
@Module({
  providers: [GlobalExceptionFilter],
  exports: [GlobalExceptionFilter],
})
export class AppHttpModule {}
