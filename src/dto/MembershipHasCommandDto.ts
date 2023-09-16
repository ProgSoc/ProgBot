import { GuildMember } from 'discord.js';
import { MemberOption, StringOption, UserOption } from 'necord';

export class MembershipHasCommandDto {
  @StringOption({
    description: 'The email to verify',
    required: false,
    name: 'email',
  })
  email?: string;
  @MemberOption({
    description: 'The user to verify',
    required: false,
    name: 'member',
  })
  member?: GuildMember;
}
