import { DomainStat, CleanHistoryRecord } from '../types/extension';

export const INITIAL_DOMAINS: DomainStat[] = [
  {
    domain: 'google.com',
    count: 142,
    lastActiveTime: Date.now() - 1000 * 60 * 12, // 12 mins ago
    firstVisited: Date.now() - 1000 * 60 * 60 * 24 * 60,
    estimatedStorageMB: 42.5,
    dataTypes: { cache: true, cookies: true, localStorage: true, indexedDB: true, serviceWorkers: true },
    isWhitelisted: true,
    category: 'search'
  },
  {
    domain: 'api.google.com',
    count: 1,
    lastActiveTime: Date.now() - 1000 * 60 * 60 * 5, // 5 hours ago
    firstVisited: Date.now() - 1000 * 60 * 60 * 24 * 10,
    estimatedStorageMB: 18.2,
    dataTypes: { cache: true, cookies: true, localStorage: true, indexedDB: false, serviceWorkers: false },
    isWhitelisted: false,
    category: 'search',
    notes: 'Google API 服务 (自动继承 google.com 根域名白名单保护)'
  },
  {
    domain: 'github.com',
    count: 98,
    lastActiveTime: Date.now() - 1000 * 60 * 45, // 45 mins ago
    firstVisited: Date.now() - 1000 * 60 * 60 * 24 * 90,
    estimatedStorageMB: 68.2,
    dataTypes: { cache: true, cookies: true, localStorage: true, indexedDB: true, serviceWorkers: true },
    isWhitelisted: true,
    category: 'dev'
  },
  {
    domain: 'assets.github.com',
    count: 1,
    lastActiveTime: Date.now() - 1000 * 60 * 60 * 12,
    firstVisited: Date.now() - 1000 * 60 * 60 * 24 * 15,
    estimatedStorageMB: 25.4,
    dataTypes: { cache: true, cookies: true, localStorage: true, indexedDB: false, serviceWorkers: false },
    isWhitelisted: false,
    category: 'dev',
    notes: 'GitHub 静态资源 (自动继承 github.com 根域名白名单保护)'
  },
  {
    domain: 'stackoverflow.com',
    count: 45,
    lastActiveTime: Date.now() - 1000 * 60 * 60 * 3, // 3 hours ago
    firstVisited: Date.now() - 1000 * 60 * 60 * 24 * 45,
    estimatedStorageMB: 18.4,
    dataTypes: { cache: true, cookies: true, localStorage: true, indexedDB: false, serviceWorkers: false },
    isWhitelisted: true,
    category: 'dev'
  },
  {
    domain: 'taobao.com',
    count: 22,
    lastActiveTime: Date.now() - 1000 * 60 * 60 * 18,
    firstVisited: Date.now() - 1000 * 60 * 60 * 24 * 30,
    estimatedStorageMB: 54.1,
    dataTypes: { cache: true, cookies: true, localStorage: true, indexedDB: true, serviceWorkers: false },
    isWhitelisted: false,
    category: 'shopping'
  },
  {
    domain: 'zhihu.com',
    count: 15,
    lastActiveTime: Date.now() - 1000 * 60 * 60 * 26,
    firstVisited: Date.now() - 1000 * 60 * 60 * 24 * 20,
    estimatedStorageMB: 28.7,
    dataTypes: { cache: true, cookies: true, localStorage: true, indexedDB: false, serviceWorkers: false },
    isWhitelisted: false,
    category: 'social'
  },
  {
    domain: 'rare-tool-online.org',
    count: 1,
    lastActiveTime: Date.now() - 1000 * 60 * 60 * 24 * 12, // 12 days ago
    firstVisited: Date.now() - 1000 * 60 * 60 * 24 * 12,
    estimatedStorageMB: 14.2,
    dataTypes: { cache: true, cookies: true, localStorage: true, indexedDB: false, serviceWorkers: false },
    isWhitelisted: false,
    category: 'infrequent',
    notes: 'Visited once for SVG to PNG conversion'
  },
  {
    domain: 'temp-pdf-compress.net',
    count: 2,
    lastActiveTime: Date.now() - 1000 * 60 * 60 * 24 * 5, // 5 days ago
    firstVisited: Date.now() - 1000 * 60 * 60 * 24 * 8,
    estimatedStorageMB: 23.8,
    dataTypes: { cache: true, cookies: true, localStorage: true, indexedDB: false, serviceWorkers: false },
    isWhitelisted: false,
    category: 'tools',
    notes: 'Used twice to compress scan documents'
  },
  {
    domain: 'random-blog-article.io',
    count: 1,
    lastActiveTime: Date.now() - 1000 * 60 * 60 * 24 * 18,
    firstVisited: Date.now() - 1000 * 60 * 60 * 24 * 18,
    estimatedStorageMB: 9.6,
    dataTypes: { cache: true, cookies: true, localStorage: true, indexedDB: false, serviceWorkers: false },
    isWhitelisted: false,
    category: 'infrequent'
  },
  {
    domain: 'one-time-survey.com',
    count: 1,
    lastActiveTime: Date.now() - 1000 * 60 * 60 * 24 * 22,
    firstVisited: Date.now() - 1000 * 60 * 60 * 24 * 22,
    estimatedStorageMB: 31.0,
    dataTypes: { cache: true, cookies: true, localStorage: true, indexedDB: true, serviceWorkers: false },
    isWhitelisted: false,
    category: 'infrequent'
  },
  {
    domain: 'promo-landing-page.xyz',
    count: 2,
    lastActiveTime: Date.now() - 1000 * 60 * 60 * 24 * 3,
    firstVisited: Date.now() - 1000 * 60 * 60 * 24 * 4,
    estimatedStorageMB: 19.5,
    dataTypes: { cache: true, cookies: true, localStorage: true, indexedDB: false, serviceWorkers: false },
    isWhitelisted: false,
    category: 'shopping'
  },
  {
    domain: 'conference-agenda-2026.org',
    count: 1,
    lastActiveTime: Date.now() - 1000 * 60 * 60 * 24 * 15,
    firstVisited: Date.now() - 1000 * 60 * 60 * 24 * 15,
    estimatedStorageMB: 12.1,
    dataTypes: { cache: true, cookies: true, localStorage: true, indexedDB: false, serviceWorkers: false },
    isWhitelisted: false,
    category: 'infrequent'
  },
  {
    domain: 'v2ex.com',
    count: 31,
    lastActiveTime: Date.now() - 1000 * 60 * 60 * 2,
    firstVisited: Date.now() - 1000 * 60 * 60 * 24 * 40,
    estimatedStorageMB: 16.3,
    dataTypes: { cache: true, cookies: true, localStorage: true, indexedDB: false, serviceWorkers: false },
    isWhitelisted: false,
    category: 'social'
  },
  {
    domain: 'temp-mail-generator.biz',
    count: 2,
    lastActiveTime: Date.now() - 1000 * 60 * 60 * 24 * 7,
    firstVisited: Date.now() - 1000 * 60 * 60 * 24 * 7,
    estimatedStorageMB: 8.4,
    dataTypes: { cache: true, cookies: true, localStorage: true, indexedDB: false, serviceWorkers: false },
    isWhitelisted: false,
    category: 'tools'
  },
  {
    domain: 'bilibili.com',
    count: 64,
    lastActiveTime: Date.now() - 1000 * 60 * 90,
    firstVisited: Date.now() - 1000 * 60 * 60 * 24 * 60,
    estimatedStorageMB: 112.4,
    dataTypes: { cache: true, cookies: true, localStorage: true, indexedDB: true, serviceWorkers: true },
    isWhitelisted: true,
    category: 'social'
  },
  {
    domain: 'single-use-calculator.app',
    count: 1,
    lastActiveTime: Date.now() - 1000 * 60 * 60 * 24 * 2,
    firstVisited: Date.now() - 1000 * 60 * 60 * 24 * 2,
    estimatedStorageMB: 15.8,
    dataTypes: { cache: true, cookies: true, localStorage: true, indexedDB: false, serviceWorkers: false },
    isWhitelisted: false,
    category: 'tools'
  }
];

export const INITIAL_HISTORY: CleanHistoryRecord[] = [
  {
    id: 'hist-1',
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 3,
    domainCount: 8,
    thresholdUsed: 3,
    totalFreedMB: 142.6,
    domainsCleared: [
      'old-event-site.com',
      'temp-image-host.net',
      'qr-code-gen-quick.org',
      'random-forum.info',
      'sample-demo-store.shop',
      'untracked-test-api.io',
      'one-off-webinar.com',
      'past-flight-tracker.net'
    ],
    dataTypesCleared: ['Cache', 'Cookies', 'LocalStorage', 'IndexedDB']
  }
];
