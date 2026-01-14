import { config } from "../config.js";
import { getProxyAgent } from "../proxy.js";

export const customFetch = async (url: string, options?: RequestInit) => {
  const headers: HeadersInit = {
    "X-Redmine-API-Key": config.redmineApiKey,
    ...options?.headers,
  };

  // Basic認証ヘッダーを追加
  if (config.basicAuthUser && config.basicAuthPassword) {
    const credentials = Buffer.from(
      `${config.basicAuthUser}:${config.basicAuthPassword}`
    ).toString("base64");
    (headers as Record<string, string>)["Authorization"] = `Basic ${credentials}`;
  }

  // Normalize both URLs to handle subpath deployments properly
  const normalizedBase = config.redmineUrl.replace(/\/$/, ''); // Remove trailing slash
  const normalizedPath = url.startsWith('/') ? url : '/' + url; // Ensure leading slash
  const fullUrl = normalizedBase + normalizedPath;

  console.error(`Fetching URL: ${fullUrl}`);

  // プロキシエージェントを取得
  const agent = await getProxyAgent(fullUrl);

  // fetchオプションを構築
  const fetchOptions: RequestInit & { dispatcher?: unknown } = {
    ...options,
    headers,
  };

  // プロキシエージェントがある場合は設定
  if (agent) {
    fetchOptions.dispatcher = agent;
  }

  const res = await fetch(fullUrl, fetchOptions);

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
