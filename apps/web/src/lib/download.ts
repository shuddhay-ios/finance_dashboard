export function exportDownloadUrl(downloadToken: string): string {
  return `/api/v1/exports/${encodeURIComponent(downloadToken)}/download`;
}

/**
 * Points the browser at the download URL. The server replies with
 * Content-Disposition: attachment, so the browser saves the file natively and stays on
 * this page. Kept in its own module so tests can replace it.
 */
export function startDownload(url: string): void {
  window.location.assign(url);
}
