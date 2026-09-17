// Same seed in, same face out, on every render, with no image stored by us.
export function defaultAvatarUrl(seed: string): string {
  return `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(seed)}`;
}
