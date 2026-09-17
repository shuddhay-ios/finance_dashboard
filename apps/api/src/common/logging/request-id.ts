import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

export const REQUEST_ID_HEADER = 'x-request-id';

// A caller (e.g. a load balancer) may send its own id so one request can be traced across
// systems. Only accept it if it looks like an id, so nobody can push newlines or huge
// strings into our logs through a header.
const SAFE_REQUEST_ID = /^[A-Za-z0-9_-]{8,64}$/;

export function resolveRequestId(req: IncomingMessage, res: ServerResponse): string {
  const incoming = req.headers[REQUEST_ID_HEADER];
  const requestId =
    typeof incoming === 'string' && SAFE_REQUEST_ID.test(incoming)
      ? incoming
      : `req_${randomUUID()}`;
  // Echo it back so a user reporting a problem can quote the id that appears in our logs.
  res.setHeader(REQUEST_ID_HEADER, requestId);
  return requestId;
}
