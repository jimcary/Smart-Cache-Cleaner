export interface DomainStat {
  domain: string;
  count: number; // Session visit count
  lastActiveTime: number; // Timestamp ms
  firstVisited: number; // Timestamp ms
  estimatedStorageMB: number;
  dataTypes: {
    cache: boolean;
    cookies: boolean;
    localStorage: boolean;
    indexedDB: boolean;
    serviceWorkers: boolean;
  };
  isWhitelisted: boolean;
  category: 'search' | 'dev' | 'shopping' | 'social' | 'tools' | 'infrequent' | 'other';
  notes?: string;
}

export interface SessionConfig {
  sessionTimeoutMinutes: number; // Default 30 mins
  thresholdCount: number; // Clean domains with visits < threshold
  timeWindowDays: number; // Filter domains active within days
  autoCleanEnabled: boolean;
  autoCleanIntervalDays: number;
}

export interface CleanerSettings {
  cleanCache: boolean;
  cleanCookies: boolean;
  cleanLocalStorage: boolean;
  cleanIndexedDB: boolean;
  cleanServiceWorkers: boolean;
  cleanWebSQL: boolean;
}

export interface CleanHistoryRecord {
  id: string;
  timestamp: number;
  domainCount: number;
  thresholdUsed: number;
  totalFreedMB: number;
  domainsCleared: string[];
  dataTypesCleared: string[];
}

export interface SimulatedVisitEvent {
  id: string;
  timestamp: number;
  domain: string;
  url: string;
  sessionCountBefore: number;
  sessionCountAfter: number;
  outcome: 'NEW_SESSION' | 'EXISTING_SESSION';
  timeSinceLastActiveMs: number;
}
