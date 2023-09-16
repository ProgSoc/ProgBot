import { Role } from 'discord.js';
import { RoleOption } from 'necord';

export class MembershipSetMemberRoleDto {
  @RoleOption({ name: 'role', description: 'The role to set' })
  role: Role;
}
