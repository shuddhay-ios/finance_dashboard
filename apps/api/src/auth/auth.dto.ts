import {
  loginRequestSchema,
  loginResponseSchema,
  meResponseSchema,
  refreshResponseSchema,
} from '@finance/shared';
import { createZodDto } from 'nestjs-zod';

// Classes wrapping the shared zod schemas. Nest needs a class to know which schema
// validates a request body, and Swagger reads the same classes to document the API.
export class LoginRequestDto extends createZodDto(loginRequestSchema) {}
export class LoginResponseDto extends createZodDto(loginResponseSchema) {}
export class RefreshResponseDto extends createZodDto(refreshResponseSchema) {}
export class MeResponseDto extends createZodDto(meResponseSchema) {}
