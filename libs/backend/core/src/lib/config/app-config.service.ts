import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from './environment-variables';

@Injectable()
export class AppConfigService {
  constructor(
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {}

  get app() {
    return {
      environment: this.configService.get('NODE_ENV', { infer: true }),
      port: this.configService.get('PORT', { infer: true }),
    };
  }

  get http() {
    return {
      corsOrigins: this.configService.get('CORS_ORIGINS', { infer: true }),
    };
  }

  get security() {
    return {
      rateLimit: {
        ttlSeconds: this.configService.get('RATE_LIMIT_TTL_SECONDS', {
          infer: true,
        }),
        limit: this.configService.get('RATE_LIMIT_LIMIT', { infer: true }),
      },
    };
  }

  get mongo() {
    return {
      uri: this.configService.get('MONGO_URI', { infer: true }),
    };
  }

  get jwt() {
    return {
      secret: this.configService.get('JWT_SECRET', { infer: true }),
      expiresIn: this.configService.get('JWT_EXPIRES_IN', { infer: true }),
    };
  }
}
