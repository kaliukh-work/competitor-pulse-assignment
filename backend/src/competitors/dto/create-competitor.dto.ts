import { Transform } from 'class-transformer';
import { IsString, Matches } from 'class-validator';

export class CreateCompetitorDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9-]{0,63}$/, {
    message: 'id must be a lowercase slug (letters, digits, dashes), e.g. "acme-crm"',
  })
  id: string;
}
