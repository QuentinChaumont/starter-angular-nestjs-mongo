import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { AppResponseDto } from './app-response.dto';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOkResponse({ type: AppResponseDto })
  getData(): AppResponseDto {
    return this.appService.getData();
  }
}
