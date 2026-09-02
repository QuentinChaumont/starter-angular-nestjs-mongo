import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SingleUseTokenRepository } from '../single-use-token';
import { PasswordResetToken } from './password-reset-token.schema';

@Injectable()
export class PasswordResetTokenRepository extends SingleUseTokenRepository<PasswordResetToken> {
  constructor(
    @InjectModel(PasswordResetToken.name) model: Model<PasswordResetToken>,
  ) {
    super(model);
  }
}
