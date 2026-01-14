/**
 * プロキシ設定管理モジュール
 * PAC URLまたは固定プロキシURLに対応
 */

import { config } from "./config.js";

// PACファイルのキャッシュ
let cachedPacScript: string | null = null;
let cachedPacFunction: ((url: string, host: string) => string) | null = null;

/**
 * PACファイルをフェッチしてパースする
 */
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
    
    // PAC内で使用されるヘルパー関数を定義
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
        return true; // 簡易実装
      }
      function isInNet(host, pattern, mask) {
        return false; // 簡易実装
      }
      function dnsResolve(host) {
        return host; // 簡易実装
      }
      function myIpAddress() {
        return "127.0.0.1"; // 簡易実装
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

    // FindProxyForURL関数を評価
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

/**
 * PACスクリプトの結果からプロキシURLを抽出
 */
function parseProxyResult(result: string): string | null {
  if (!result || result === 'DIRECT') {
    return null;
  }

  // "PROXY host:port" または "PROXY host:port; DIRECT" 形式をパース
  const match = result.match(/PROXY\s+([^;\s]+)/i);
  if (match) {
    const proxyHost = match[1];
    // http://を付与
    if (!proxyHost.startsWith('http://') && !proxyHost.startsWith('https://')) {
      return `http://${proxyHost}`;
    }
    return proxyHost;
  }

  return null;
}

/**
 * URLに対するプロキシエージェントを取得
 */
export async function getProxyAgent(targetUrl: string): Promise<unknown | null> {
  let proxyUrl: string | null = null;

  // PACファイルが設定されている場合
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

  // 固定プロキシURLが設定されている場合
  if (!proxyUrl && config.proxyUrl) {
    proxyUrl = config.proxyUrl;
  }

  // プロキシが不要な場合
  if (!proxyUrl) {
    return null;
  }

  console.error(`Using proxy: ${proxyUrl}`);

  // undiciのProxyAgentを動的にインポート
  try {
    const { ProxyAgent } = await import('undici');
    return new ProxyAgent(proxyUrl);
  } catch (error) {
    console.error(`Failed to create proxy agent: ${error}`);
    console.error('Please install undici: npm install undici');
    return null;
  }
}
