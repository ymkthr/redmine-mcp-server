import { config } from "./config.js";

let cachedPacScript: string | null = null;
let cachedPacFunction: ((url: string, host: string) => string) | null = null;

async function loadPacFile(): Promise<((url: string, host: string) => string) | null> {
  if (!config.pacUrl) {
    return null;
  }

  if (cachedPacFunction) {
    return cachedPacFunction;
  }

  try {
    console.error(`Loading PAC file from: ${config.pacUrl}`);
    const response = await fetch(config.pacUrl);
    if (!response.ok) {
      console.error(`Failed to fetch PAC file: ${response.status}`);
      return null;
    }

    cachedPacScript = await response.text();
    
    const pacHelpers = `
      function isPlainHostName(host) {
        return host.indexOf('.') === -1;
      }
      function dnsDomainIs(host, domain) {
        return host.length >= domain.length && 
               host.substring(host.length - domain.length) === domain;
      }
      function localHostOrDomainIs(host, hostdom) {
        return host === hostdom || 
               (hostdom.indexOf(host) === 0 && hostdom.charAt(host.length) === '.');
      }
      function isResolvable(host) {
        return true;
      }
      function isInNet(host, pattern, mask) {
        return false;
      }
      function dnsResolve(host) {
        return host;
      }
      function myIpAddress() {
        return "127.0.0.1";
      }
      function dnsDomainLevels(host) {
        return host.split('.').length - 1;
      }
      function shExpMatch(str, shexp) {
        const regex = new RegExp('^' + shexp.replace(/\\./g, '\\\\.').replace(/\\*/g, '.*').replace(/\\?/g, '.') + '$');
        return regex.test(str);
      }
      function weekdayRange() { return true; }
      function dateRange() { return true; }
      function timeRange() { return true; }
    `;

    const fullScript = pacHelpers + cachedPacScript;
    const fn = new Function('url', 'host', fullScript + '\nreturn FindProxyForURL(url, host);');
    cachedPacFunction = fn as (url: string, host: string) => string;
    
    console.error('PAC file loaded successfully');
    return cachedPacFunction;
  } catch (error) {
    console.error(`Error loading PAC file: ${error}`);
    return null;
  }
}

function parseProxyResult(result: string): string | null {
  if (!result || result === 'DIRECT') {
    return null;
  }

  const match = result.match(/PROXY\s+([^;\s]+)/i);
  if (match) {
    const proxyHost = match[1];
    if (!proxyHost.startsWith('http://') && !proxyHost.startsWith('https://')) {
      return `http://${proxyHost}`;
    }
    return proxyHost;
  }

  return null;
}

function addProxyAuth(proxyUrl: string): string {
  if (!config.proxyAuthUser || !config.proxyAuthPassword) {
    return proxyUrl;
  }

  try {
    const url = new URL(proxyUrl);
    if (url.username || url.password) {
      return proxyUrl;
    }
    url.username = encodeURIComponent(config.proxyAuthUser);
    url.password = encodeURIComponent(config.proxyAuthPassword);
    return url.toString();
  } catch (error) {
    console.error(`Failed to add auth to proxy URL: ${error}`);
    return proxyUrl;
  }
}

export async function getProxyAgent(targetUrl: string): Promise<unknown | null> {
  let proxyUrl: string | null = null;

  if (config.pacUrl) {
    const pacFunction = await loadPacFile();
    if (pacFunction) {
      try {
        const urlObj = new URL(targetUrl);
        const result = pacFunction(targetUrl, urlObj.hostname);
        console.error(`PAC result for ${targetUrl}: ${result}`);
        proxyUrl = parseProxyResult(result);
      } catch (error) {
        console.error(`Error evaluating PAC: ${error}`);
      }
    }
  }

  if (!proxyUrl && config.proxyUrl) {
    proxyUrl = config.proxyUrl;
  }

  if (!proxyUrl) {
    return null;
  }

  proxyUrl = addProxyAuth(proxyUrl);

  const maskedUrl = proxyUrl.replace(/:\/\/[^:]+:[^@]+@/, '://***:***@');
  console.error(`Using proxy: ${maskedUrl}`);

  try {
    const { ProxyAgent } = await import('undici');
    return new ProxyAgent(proxyUrl);
  } catch (error) {
    console.error(`Failed to create proxy agent: ${error}`);
    console.error('Please install undici: npm install undici');
    return null;
  }
}
