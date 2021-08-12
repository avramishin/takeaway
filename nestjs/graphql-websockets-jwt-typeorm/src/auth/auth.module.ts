import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';

const jwtModule = JwtModule.register({});

@Module({
  imports: [PassportModule, jwtModule],
  providers: [JwtStrategy],
  exports: [jwtModule],
})
export class AuthModule {}
