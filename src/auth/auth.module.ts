import { Global, Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { DiscordStrategy } from './strategy/discord.strategy';
import { MembershipsService } from 'src/services/memberships.service';

@Global()
@Module({
  imports: [PassportModule.register({ defaultStrategy: 'discord' })],
  providers: [DiscordStrategy, MembershipsService],
  controllers: [],
})
export class AuthModule {}
