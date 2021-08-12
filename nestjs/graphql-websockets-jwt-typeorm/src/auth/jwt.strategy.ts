import { ExtractJwt, Strategy } from 'passport-jwt';
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { CurrentUserDto } from './dto/current-user.dto';

import { config } from '../config';
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.jwt.publicKey,
      ignoreExpiration: false,
    });
  }

  async validate(payload: any) {
    return {
      id: payload.sub,
      username: payload.username,
    } as CurrentUserDto;
  }
}
