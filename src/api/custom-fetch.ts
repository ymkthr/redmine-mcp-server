import { config } from "../config.js";

export const customFetch = async (url: string, options?: RequestInit) => {
  const headers: HeadersInit = {
    "X-Redmine-API-Key": config.redmineApiKey,
    ...options?.headers,
  };

  // Normalize both URLs to handle subpath deployments properly
  const normalizedBase = config.redmineUrl.replace(/\/$/, ''); // Remove trailing slash
  const normalizedPath = url.startsWith('/') ? url : '/' + url; // Ensure leading slash
  const fullUrl = normalizedBase + normalizedPath;

  console.error(`Fetching URL: ${fullUrl}`);

  const res = await fetch(fullUrl, {
    ...options,
    headers,
  });

  console.error(`Response status: ${res.status}`);

  // Check if response is HTML instead of JSON
  if (!res.ok) {
    const contentType = res.headers.get('content-type');
    if (contentType?.includes('text/html')) {
      const text = await res.text();
      throw new Error(
        `Expected JSON but received HTML (HTTP ${res.status}). ` +
        `URL: ${fullUrl}. ` +
        `Response body: ${text.substring(0, 200)}...`
      );
    }
  }

  return res;
};
