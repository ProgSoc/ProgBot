import {
  Profile,
  Strategy,
  StrategyOptionsWithRequest,
} from 'passport-discord';
import { PassportStrategy } from '@nestjs/passport';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { DATABASE_TOKEN, type Database } from 'src/db/db.module';
import { discordUsers } from 'src/db/schema';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { type Cache } from 'cache-manager';
import { MembershipsService } from 'src/services/memberships.service';

@Injectable()
export class DiscordStrategy extends PassportStrategy(Strategy, 'discord') {
  constructor(
    config: ConfigService,
    @Inject(DATABASE_TOKEN) private readonly db: Database,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly membershipService: MembershipsService,
  ) {
    const options: StrategyOptionsWithRequest = {
      passReqToCallback: true,
      clientID: config.getOrThrow('DISCORD_CLIENT_ID'),
      clientSecret: config.getOrThrow('DISCORD_SECRET'),
      callbackURL: config.getOrThrow('DISCORD_CALLBACK'),
      scope: ['identify', 'role_connections.write'],
    };
    super(options);
  }

  async validate(
    req: Request,
    accessToken: string,
    refreshToken: string,
    profile: Profile,
  ): Promise<any> {
    const [user] = await this.db
      .insert(discordUsers)
      .values({
        userId: profile.id,
        refreshToken,
      })
      .onConflictDoUpdate({
        target: discordUsers.userId,
        set: {
          refreshToken,
        },
      })
      .returning();

    await this.cacheManager.set(
      `${user.userId}-access-token`,
      accessToken,
      604800,
    );

    await this.membershipService.updateMetadata(user.userId);

    return user;
  }
}
