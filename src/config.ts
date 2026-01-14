/**
 * Configuration management for Redmine MCP Server
 */

export interface ServerConfig {
  readOnlyMode: boolean;
  redmineUrl: string;
  redmineApiKey: string;
  // Basic認証設定（オプション）
  basicAuthUser?: string;
  basicAuthPassword?: string;
  // プロキシ設定（オプション）
  proxyUrl?: string;
  pacUrl?: string;
}

/**
 * Load configuration from environment variables
 */
const loadConfig = (): ServerConfig => {
  const readOnlyMode = process.env.REDMINE_MCP_READ_ONLY === "true";

  const redmineUrl = process.env.REDMINE_URL;
  if (!redmineUrl) {
    throw new Error("REDMINE_URL environment variable is not set");
  }

  const redmineApiKey = process.env.REDMINE_API_KEY;
  if (!redmineApiKey) {
    throw new Error("REDMINE_API_KEY environment variable is not set");
  }

  // Basic認証設定（オプション）
  const basicAuthUser = process.env.REDMINE_BASIC_AUTH_USER;
  const basicAuthPassword = process.env.REDMINE_BASIC_AUTH_PASSWORD;

  // プロキシ設定（オプション）
  const proxyUrl = process.env.REDMINE_PROXY_URL || process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  const pacUrl = process.env.REDMINE_PAC_URL || process.env.PAC_URL;

  return {
    readOnlyMode,
    redmineUrl,
    redmineApiKey,
    basicAuthUser,
    basicAuthPassword,
    proxyUrl,
    pacUrl,
  };
};

/**
 * Get current configuration
 */
export const config = loadConfig();
