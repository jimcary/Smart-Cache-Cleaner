import { DomainStat, SessionConfig, CleanerSettings, CleanHistoryRecord, SimulatedVisitEvent } from '../types/extension';
import { INITIAL_DOMAINS, INITIAL_HISTORY } from './mockData';

const DOMAINS_KEY = 'smart_cleaner_domains_v1';
const CONFIG_KEY = 'smart_cleaner_config_v1';
const SETTINGS_KEY = 'smart_cleaner_settings_v1';
const HISTORY_KEY = 'smart_cleaner_history_v1';
const SIM_LOGS_KEY = 'smart_cleaner_sim_logs_v1';
const VIRTUAL_TIME_OFFSET_KEY = 'smart_cleaner_virtual_time_offset_v1';

export function getVirtualTimeOffset(): number {
  const val = localStorage.getItem(VIRTUAL_TIME_OFFSET_KEY);
  return val ? parseInt(val, 10) : 0;
}

export function setVirtualTimeOffset(offsetMs: number): void {
  localStorage.setItem(VIRTUAL_TIME_OFFSET_KEY, offsetMs.toString());
}

export function getCurrentSimulatedTime(): number {
  return Date.now() + getVirtualTimeOffset();
}

export function getDomainStats(): DomainStat[] {
  const data = localStorage.getItem(DOMAINS_KEY);
  if (!data) {
    localStorage.setItem(DOMAINS_KEY, JSON.stringify(INITIAL_DOMAINS));
    return INITIAL_DOMAINS;
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    return INITIAL_DOMAINS;
  }
}

export function saveDomainStats(stats: DomainStat[]): void {
  localStorage.setItem(DOMAINS_KEY, JSON.stringify(stats));
}

export function getSessionConfig(): SessionConfig {
  const data = localStorage.getItem(CONFIG_KEY);
  const defaultConfig: SessionConfig = {
    sessionTimeoutMinutes: 30,
    thresholdCount: 3,
    timeWindowDays: 30,
    autoCleanEnabled: false,
    autoCleanIntervalDays: 7,
  };
  if (!data) return defaultConfig;
  try {
    return { ...defaultConfig, ...JSON.parse(data) };
  } catch {
    return defaultConfig;
  }
}

export function saveSessionConfig(config: SessionConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function getCleanerSettings(): CleanerSettings {
  const data = localStorage.getItem(SETTINGS_KEY);
  const defaultSettings: CleanerSettings = {
    cleanCache: true,
    cleanCookies: true,
    cleanLocalStorage: true,
    cleanIndexedDB: true,
    cleanServiceWorkers: true,
    cleanWebSQL: true,
  };
  if (!data) return defaultSettings;
  try {
    return { ...defaultSettings, ...JSON.parse(data) };
  } catch {
    return defaultSettings;
  }
}

export function saveCleanerSettings(settings: CleanerSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function getCleanHistory(): CleanHistoryRecord[] {
  const data = localStorage.getItem(HISTORY_KEY);
  if (!data) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(INITIAL_HISTORY));
    return INITIAL_HISTORY;
  }
  try {
    return JSON.parse(data);
  } catch {
    return INITIAL_HISTORY;
  }
}

export function addCleanHistoryRecord(record: Omit<CleanHistoryRecord, 'id'>): CleanHistoryRecord {
  const history = getCleanHistory();
  const newRecord: CleanHistoryRecord = {
    ...record,
    id: 'hist-' + Date.now(),
  };
  const updated = [newRecord, ...history];
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  return newRecord;
}

export function getSimulatedVisitLogs(): SimulatedVisitEvent[] {
  const data = localStorage.getItem(SIM_LOGS_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function addSimulatedVisitLog(log: SimulatedVisitEvent): void {
  const logs = getSimulatedVisitLogs();
  const updated = [log, ...logs].slice(0, 50); // keep last 50
  localStorage.setItem(SIM_LOGS_KEY, JSON.stringify(updated));
}

/**
 * 核心算法：记录域名访问，根据 sessionTimeoutMinutes 判断是否为新会话
 */
export function recordDomainVisitInSimulator(rawDomain: string): {
  stat: DomainStat;
  outcome: 'NEW_SESSION' | 'EXISTING_SESSION';
  timeSinceLastActiveMs: number;
} {
  let domain = rawDomain.trim().toLowerCase();
  try {
    if (domain.startsWith('http://') || domain.startsWith('https://')) {
      const url = new URL(domain);
      domain = url.hostname;
    }
  } catch (e) {
    // leave as string
  }

  const now = getCurrentSimulatedTime();
  const stats = getDomainStats();
  const config = getSessionConfig();
  const sessionTimeoutMs = config.sessionTimeoutMinutes * 60 * 1000;

  let existingIndex = stats.findIndex((s) => s.domain === domain);
  let outcome: 'NEW_SESSION' | 'EXISTING_SESSION' = 'NEW_SESSION';
  let timeSinceLastMs = 0;
  let targetStat: DomainStat;

  if (existingIndex >= 0) {
    const existing = stats[existingIndex];
    timeSinceLastMs = now - existing.lastActiveTime;

    if (timeSinceLastMs > sessionTimeoutMs) {
      outcome = 'NEW_SESSION';
      targetStat = {
        ...existing,
        count: existing.count + 1,
        lastActiveTime: now,
      };
    } else {
      outcome = 'EXISTING_SESSION';
      targetStat = {
        ...existing,
        lastActiveTime: now, // Refresh active timestamp without incrementing count
      };
    }
    stats[existingIndex] = targetStat;
  } else {
    outcome = 'NEW_SESSION';
    timeSinceLastMs = Infinity;
    targetStat = {
      domain,
      count: 1,
      lastActiveTime: now,
      firstVisited: now,
      estimatedStorageMB: parseFloat((Math.random() * 20 + 2).toFixed(1)),
      dataTypes: { cache: true, cookies: true, localStorage: true, indexedDB: false, serviceWorkers: false },
      isWhitelisted: false,
      category: 'other',
    };
    stats.push(targetStat);
  }

  saveDomainStats(stats);

  const logEvent: SimulatedVisitEvent = {
    id: 'sim-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
    timestamp: now,
    domain,
    url: `https://${domain}/`,
    sessionCountBefore: existingIndex >= 0 ? stats[existingIndex].count - (outcome === 'NEW_SESSION' ? 1 : 0) : 0,
    sessionCountAfter: targetStat.count,
    outcome,
    timeSinceLastActiveMs: timeSinceLastMs,
  };
  addSimulatedVisitLog(logEvent);

  return { stat: targetStat, outcome, timeSinceLastActiveMs: timeSinceLastMs };
}

/**
 * 执行清理逻辑
 */
export function executeCleanDomains(
  domainsToClean: string[],
  settings: CleanerSettings
): { freedMB: number; cleanedCount: number } {
  const stats = getDomainStats();
  let freedMB = 0;

  const remaining = stats.filter((s) => {
    if (domainsToClean.includes(s.domain)) {
      freedMB += s.estimatedStorageMB;
      return false;
    }
    return true;
  });

  saveDomainStats(remaining);

  const dataTypesList: string[] = [];
  if (settings.cleanCache) dataTypesList.push('Cache');
  if (settings.cleanCookies) dataTypesList.push('Cookies');
  if (settings.cleanLocalStorage) dataTypesList.push('LocalStorage');
  if (settings.cleanIndexedDB) dataTypesList.push('IndexedDB');
  if (settings.cleanServiceWorkers) dataTypesList.push('Service Workers');

  addCleanHistoryRecord({
    timestamp: getCurrentSimulatedTime(),
    domainCount: domainsToClean.length,
    thresholdUsed: getSessionConfig().thresholdCount,
    totalFreedMB: parseFloat(freedMB.toFixed(1)),
    domainsCleared: domainsToClean,
    dataTypesCleared: dataTypesList,
  });

  return { freedMB: parseFloat(freedMB.toFixed(1)), cleanedCount: domainsToClean.length };
}

export function resetAllDataToDefault(): void {
  localStorage.setItem(DOMAINS_KEY, JSON.stringify(INITIAL_DOMAINS));
  localStorage.setItem(HISTORY_KEY, JSON.stringify(INITIAL_HISTORY));
  localStorage.removeItem(SIM_LOGS_KEY);
  setVirtualTimeOffset(0);
}
