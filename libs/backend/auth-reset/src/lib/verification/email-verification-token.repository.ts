import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SingleUseTokenRepository } from '../single-use-token';
import { EmailVerificationToken } from './email-verification-token.schema';

@Injectable()
export class EmailVerificationTokenRepository extends SingleUseTokenRepository<EmailVerificationToken> {
  constructor(
    @InjectModel(EmailVerificationToken.name)
    model: Model<EmailVerificationToken>,
  ) {
    super(model);
  }
}
