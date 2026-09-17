import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route as reachable without logging in. Every other route requires a valid
 * access token, so forgetting a decorator fails closed (locked), never open.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
