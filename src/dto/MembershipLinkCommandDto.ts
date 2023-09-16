import { StringOption } from 'necord';

export class MembershipLinkCommandDto {
  @StringOption({
    name: 'email',
    description: 'The email to link',
    required: true,
  })
  email: string;
}
