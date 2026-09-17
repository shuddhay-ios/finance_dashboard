/**
 * Makes user text match literally inside a regular expression. Without this, searching
 * "1.5*" would mean "1, any character, then 5 repeated", and a crafted pattern could make
 * MongoDB spend seconds on one query (ReDoS).
 */
export function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
