import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type Cache } from 'cache-manager';
import { parse } from 'csv-parse';
import { Client } from 'discord.js';
import { and, eq, gte, ilike, isNotNull, sql } from 'drizzle-orm';
import { Transporter, createTransport } from 'nodemailer';
import { DATABASE_TOKEN, type Database } from 'src/db/db.module';
import { discordUsers, guilds, memberships } from 'src/db/schema';
import mainLogger from 'src/logger';
import { ListSchema } from 'src/schema/MembershipRowSchema';
import { z } from 'zod';

@Injectable()
export class MembershipsService {
  private readonly mailer: Transporter;
  private readonly logger = mainLogger.scope(MembershipsService.name);

  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: Database,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly client: Client,
  ) {
    this.mailer = createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: configService.getOrThrow('EMAIL_USER'),
        pass: configService.getOrThrow('EMAIL_PASS'),
      },
    });
  }

  async sendCode(userId: string, email: string): Promise<void> {
    const code = this.generateCode();

    const ONE_HOUR_IN_MILLISECONDS = 1000 * 60 * 60;

    const userDetails = JSON.stringify({ userId, email });

    await this.cacheManager.set(code, userDetails, ONE_HOUR_IN_MILLISECONDS);
    this.logger.info(`Sending email to ${email} with code ${code}`);

    if (this.configService.get('NODE_ENV') === 'development') return;

    await this.mailer.sendMail({
      from: this.configService.getOrThrow('EMAIL_USER'),
      to: email,
      subject: 'Verify your email',
      text: `Your verification code is ${code}`,
    });

    return;
  }

  async linkCode(code: string, userId: string, guildId: string): Promise<void> {
    const cachedUserDetails = await this.cacheManager.get<string>(code);

    if (!cachedUserDetails) {
      throw new Error('Invalid code');
    }

    const rawData = JSON.parse(cachedUserDetails);

    const UserDetailsSchema = z.object({
      userId: z.string(),
      email: z.string().email(),
    });

    let userDetails: z.infer<typeof UserDetailsSchema>;

    try {
      userDetails = await UserDetailsSchema.parseAsync(rawData);
    } catch (error) {
      throw new Error('Invalid code');
    }

    if (userDetails.userId !== userId) {
      throw new Error('User Id does not match');
    }

    const membership = await this.hasMembershipEmail(
      guildId,
      userDetails.email,
    );

    if (!membership) {
      throw new Error(
        "Membership not found, if you have recently signed up please let us know and we'll update the database",
      );
    }

    try {
      await this.db
        .insert(discordUsers)
        .values({ userId })
        .onConflictDoNothing();
      await this.db
        .update(memberships)
        .set({
          userId: userDetails.userId,
        })
        .where(
          and(
            ilike(memberships.email, userDetails.email),
            eq(memberships.guildId, guildId),
          ),
        );
      await this.cacheManager.del(code);

      const guildSettings = await this.db.query.guilds.findFirst({
        where: eq(guilds.guildId, guildId),
      });

      if (guildSettings?.memberRole) {
        const guild = await this.client.guilds.fetch(guildId);

        const member = await guild.members.fetch(userId);

        await member.roles.add(guildSettings.memberRole);
      }
    } catch (error) {
      await this.cacheManager.del(code);
      this.logger.error(error);
      throw new Error('Failed to update membership');
    }

    return;
  }

  async setGuildMemberRole(guildId: string, roleId: string): Promise<void> {
    await this.db
      .insert(guilds)
      .values({ guildId, memberRole: roleId })
      .onConflictDoUpdate({
        target: [guilds.guildId],
        set: {
          memberRole: roleId,
        },
      });
  }

  async unsetGuildMemberRole(guildId: string): Promise<void> {
    await this.db
      .insert(guilds)
      .values({ guildId, memberRole: null })
      .onConflictDoUpdate({
        target: [guilds.guildId],
        set: {
          memberRole: null,
        },
      });
  }

  async unlink(guildId: string, userId: string): Promise<void> {
    await this.db
      .update(memberships)
      .set({
        userId: null,
      })
      .where(
        and(
          eq(memberships.guildId, guildId),
          eq(memberships.userId, userId),
          isNotNull(memberships.userId),
        ),
      );
  }

  /**
   * Verifies that the user is a member of the guild
   * @param guildId The guild where the command was sent
   * @param email The email the user entered
   * @returns Verifies the email address using a code sent to the email
   */
  async hasMembershipEmail(guildId: string, email: string): Promise<boolean> {
    /** Check to see if the membership already has a userId asociated with it */

    const membership = await this.db.query.memberships.findFirst({
      where: and(
        eq(memberships.guildId, guildId),
        ilike(memberships.email, email),
        gte(memberships.end_date, sql`now()::date - interval '1 day'`),
      ),
    });

    if (membership) {
      return true;
    }

    return false;
  }

  async hasMembershipDiscord(
    guildId: string,
    userId: string,
  ): Promise<boolean> {
    /** Check to see if the membership already has a userId asociated with it */

    const membership = await this.db.query.memberships.findFirst({
      where: and(
        eq(memberships.guildId, guildId),
        eq(memberships.userId, userId),
        isNotNull(memberships.userId),
        gte(memberships.end_date, sql`now()::date - interval '1 day'`),
      ),
    });

    if (membership) {
      return true;
    }

    return false;
  }

  private generateCode() {
    const code =
      Math.random().toString(36).substring(2, 6) +
      Math.random().toString(36).substring(2, 5);
    return code;
  }

  public async registerMembers(guildId: string, csvUrl: string) {
    const csvResponse = await fetch(csvUrl).then((res) => res.text());

    const parsedData = await new Promise((resolve, reject) => {
      parse(
        csvResponse.trim(),
        {
          columns: [
            'first_name',
            'last_name',
            'preferred_name',
            'email',
            'mobile',
            'type',
            'joined_date',
            'end_date',
            'price_paid',
          ],
          delimiter: ',',
          fromLine: 2,
        },
        (err, records) => {
          if (err) {
            reject(err);
          } else {
            resolve(records);
          }
        },
      );
    });

    const validatedData = await ListSchema.parseAsync(parsedData);

    await this.db.insert(guilds).values({ guildId }).onConflictDoNothing();

    await this.db.transaction(async (tx) => {
      let updates = 0;
      validatedData.forEach(async (entry) => {
        const updated = await tx
          .insert(memberships)
          .values({
            end_date: entry.end_date,
            guildId: guildId,
            name: `${entry.preferred_name ?? entry.first_name} ${
              entry.last_name
            }`,
            start_date: entry.joined_date,
            type: entry.type,
            email: entry.email,
            phone: entry.mobile,
            userId: null,
          })
          .onConflictDoUpdate({
            target: [memberships.guildId, memberships.email],
            set: {
              end_date: entry.end_date,
              name: `${entry.preferred_name ?? entry.first_name} ${
                entry.last_name
              }`,
              phone: entry.mobile,
              type: entry.type,
            },
          });

        if (updated) {
          updates += updated.length;
        }
      });

      this.logger.log(updates);
    });
  }
}
