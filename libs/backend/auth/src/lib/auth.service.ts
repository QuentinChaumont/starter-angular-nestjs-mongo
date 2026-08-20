import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedError, verifyPassword } from '@org/backend-core';
import { UserService } from '@org/backend-features-user';
import { AuthenticatedUser } from './models/authenticated-user';

export interface LoginResult {
  accessToken: string;
  user: AuthenticatedUser;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UserService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string): Promise<LoginResult> {
    const user = await this.users.findByEmailWithPassword(email);

    if (!user || !(await verifyPassword(password, user.password))) {
      throw new UnauthorizedError(
        'INVALID_CREDENTIALS',
        'Invalid email or password',
      );
    }

    const authenticatedUser: AuthenticatedUser = {
      id: user._id.toString(),
      roles: user.roles,
    };

    const accessToken = await this.jwt.signAsync({
      sub: authenticatedUser.id,
      roles: authenticatedUser.roles,
    });

    return { accessToken, user: authenticatedUser };
  }
}
