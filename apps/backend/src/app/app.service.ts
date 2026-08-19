import { Injectable } from '@nestjs/common';
import { AppResponseDto } from './app-response.dto';

@Injectable()
export class AppService {
  getData(): AppResponseDto {
    return { message: 'Hello API' };
  }
}
