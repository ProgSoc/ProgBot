import { membershipTypeEnum } from 'src/db/schema';
import { z } from 'zod';

const RowSchema = z.object({
  first_name: z.string(),
  last_name: z.string(),
  preferred_name: z
    .string()
    .optional()
    .transform((e) => (e === '' ? undefined : e)),
  email: z.string().email(),
  mobile: z
    .string()
    .optional()
    .transform((e) => (e === '' ? undefined : e)),
  type: z.enum(membershipTypeEnum.enumValues),
  joined_date: z.string(),
  end_date: z.string(),
  price_paid: z
    .string()
    .optional()
    .transform((e) => (e === '$undefined' ? undefined : e)),
});

export const ListSchema = z.array(RowSchema);

export default RowSchema;
