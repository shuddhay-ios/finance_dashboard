import { z } from 'zod';
import { USER_ROLES } from './enums';

export const loginRequestSchema = z.object({
  email: z.email().max(254),
  // A cap stops someone posting megabytes of "password" to make hashing slow.
  password: z.string().min(1).max(200),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

// The only user shape that ever leaves the API. Built field by field, so a new field on
// the database document (like passwordHash) can never slip into a response by accident.
export const userResponseSchema = z.object({
  id: z.string(),
  externalId: z.string().nullable(),
  email: z.email(),
  name: z.string(),
  avatarUrl: z.url(),
  role: z.enum(USER_ROLES),
});
export type UserResponse = z.infer<typeof userResponseSchema>;

export const loginResponseSchema = z.object({
  accessToken: z.string(),
  user: userResponseSchema,
});
export type LoginResponse = z.infer<typeof loginResponseSchema>;

export const refreshResponseSchema = z.object({
  accessToken: z.string(),
});
export type RefreshResponse = z.infer<typeof refreshResponseSchema>;

export const meResponseSchema = z.object({
  user: userResponseSchema,
});
export type MeResponse = z.infer<typeof meResponseSchema>;

// Just enough to show a person in a filter or an avatar list: no email, no role.
export const userOptionSchema = z.object({
  id: z.string(),
  externalId: z.string().nullable(),
  name: z.string(),
  avatarUrl: z.url(),
});
export type UserOption = z.infer<typeof userOptionSchema>;

export const userListResponseSchema = z.object({
  data: z.array(userOptionSchema),
});
export type UserListResponse = z.infer<typeof userListResponseSchema>;
