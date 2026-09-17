// /exports/<token>/download → /exports/[redacted]/download
const EXPORT_DOWNLOAD_TOKEN = /(\/exports\/)[^/?#]+(\/download)/;

/**
 * Removes credentials that travel in a URL path. A download token is only valid for
 * 60 seconds and one use, but it still shouldn't sit in log files.
 */
export function maskUrlSecrets(url: string): string {
  return url.replace(EXPORT_DOWNLOAD_TOKEN, '$1[redacted]$2');
}
