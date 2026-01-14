export interface ServerConfig {
  readOnlyMode: boolean;
  redmineUrl: string;
  redmineApiKey: string;
  basicAuthUser?: string;
  basicAuthPassword?: string;
  proxyUrl?: string;
  pacUrl?: string;
  proxyAuthUser?: string;
  proxyAuthPassword?: string;
}

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

  const basicAuthUser = process.env.REDMINE_BASIC_AUTH_USER;
  const basicAuthPassword = process.env.REDMINE_BASIC_AUTH_PASSWORD;

  const proxyUrl = process.env.REDMINE_PROXY_URL || process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  const pacUrl = process.env.REDMINE_PAC_URL || process.env.PAC_URL;

  const proxyAuthUser = process.env.REDMINE_PROXY_AUTH_USER || process.env.PROXY_AUTH_USER;
  const proxyAuthPassword = process.env.REDMINE_PROXY_AUTH_PASSWORD || process.env.PROXY_AUTH_PASSWORD;

  return {
    readOnlyMode,
    redmineUrl,
    redmineApiKey,
    basicAuthUser,
    basicAuthPassword,
    proxyUrl,
    pacUrl,
    proxyAuthUser,
    proxyAuthPassword,
  };
};

export const config = loadConfig();
