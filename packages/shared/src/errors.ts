import { z } from 'zod';

// Every API error carries one of these stable codes. The web app maps a code to the
// text shown in an alert chip, so wording can change without a backend deploy and
// users never see a raw exception message.
export const ERROR_CODES = [
  'AUTH_INVALID_CREDENTIALS',
  'AUTH_TOKEN_EXPIRED',
  'AUTH_TOKEN_INVALID',
  'AUTH_REFRESH_REUSED',
  'VALIDATION_FAILED',
  'RATE_LIMITED',
  'NOT_FOUND',
  'REQUEST_FAILED',
  'EXPORT_NO_ROWS',
  'EXPORT_TOKEN_INVALID',
  'SERVICE_UNAVAILABLE',
  'INTERNAL_ERROR',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export const errorEnvelopeSchema = z.object({
  code: z.enum(ERROR_CODES),
  message: z.string(),
  details: z.unknown().nullable(),
  requestId: z.string().nullable(),
});
export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;
