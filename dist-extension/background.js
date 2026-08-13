/**
 * 智能缓存清理 (Smart Cache Cleaner) - Background Service Worker (Manifest V3)
 * 基于会话间隔 (Session Timeout) 算法统计真实访问频次
 */

let SESSION_TIMEOUT_MS = 1800000; // 30 分钟

// 缓存与配置初始化
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[SmartCleaner] 扩展插件已成功安装/更新:', details.reason);
  
  chrome.storage.local.get(['session_config', 'whitelist', 'domain_stats'], (res) => {
    if (!res.session_config) {
      chrome.storage.local.set({
        session_config: {
          sessionTimeoutMinutes: 30,
          thresholdCount: 3,
          timeWindowDays: 30
        }
      });
    }
    if (!res.whitelist) {
      chrome.storage.local.set({
        whitelist: ["google.com","github.com","stackoverflow.com"]
      });
    }
    
    // 首次安装时拉取 Chrome 近30天历史记录反推初始频次
    if (details.reason === 'install' && (!res.domain_stats || Object.keys(res.domain_stats).length === 0)) {
      initHistoryStats();
    }
  });
});

// 监听配置更新
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.session_config) {
    const newConfig = changes.session_config.newValue;
    if (newConfig && newConfig.sessionTimeoutMinutes) {
      SESSION_TIMEOUT_MS = newConfig.sessionTimeoutMinutes * 60 * 1000;
      console.log('[SmartCleaner] 会话超时更新为:', newConfig.sessionTimeoutMinutes, '分钟');
    }
  }
});

/**
 * 1. 核心频次记录逻辑：监听 Top-level 标签页更新事件
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // 仅在 main frame 加载完成且拥有合法 HTTP/HTTPS URL 时生效
  if (changeInfo.status === 'complete' && tab.url) {
    try {
      const url = new URL(tab.url);
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        const domain = url.hostname.toLowerCase();
        recordVisit(domain);
      }
    } catch (e) {
      // 忽略非法 URL (chrome://, file://)
    }
  }
});

/**
 * 记录域名访问频次（30分钟/自定义间隔 会话断定）
 */
function recordVisit(domain) {
  const now = Date.now();

  chrome.storage.local.get(['domain_stats', 'session_config'], (result) => {
    let stats = result.domain_stats || {};
    let currentConfig = result.session_config || {};
    const timeoutMs = (currentConfig.sessionTimeoutMinutes || 30) * 60 * 1000;

    let item = stats[domain] || {
      count: 0,
      last_active_time: 0,
      first_visited: now,
      estimated_storage_mb: Math.floor(Math.random() * 25) + 5
    };

    // 如果距离上次活跃时间超过了会话超时间隔，则递增频次
    if (now - item.last_active_time > timeoutMs) {
      item.count += 1;
      console.log(`[SmartCleaner] 域名 ${domain} 触发新会话，频次递增为: ${item.count}`);
    }

    // 刷新该域名的最后活跃时间戳
    item.last_active_time = now;
    stats[domain] = item;

    chrome.storage.local.set({ domain_stats: stats });
  });
}

/**
 * 初次安装反推历史记录（冷启动方案）
 */
function initHistoryStats() {
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  console.log('[SmartCleaner] 开始扫描近30天历史浏览记录反推频次...');

  chrome.history.search({ text: '', startTime: thirtyDaysAgo, maxResults: 10000 }, (items) => {
    let stats = {};
    const timeoutMs = 1800000;

    // 按时间顺序对历史条目排序
    items.sort((a, b) => (a.lastVisitTime || 0) - (b.lastVisitTime || 0));

    items.forEach((item) => {
      if (!item.url) return;
      try {
        const url = new URL(item.url);
        if (url.protocol === 'http:' || url.protocol === 'https:') {
          const domain = url.hostname.toLowerCase();
          const visitTime = item.lastVisitTime || Date.now();

          let stat = stats[domain] || {
            count: 0,
            last_active_time: 0,
            first_visited: visitTime,
            estimated_storage_mb: Math.floor(Math.random() * 20) + 3
          };

          if (visitTime - stat.last_active_time > timeoutMs) {
            stat.count += 1;
          }
          stat.last_active_time = Math.max(stat.last_active_time, visitTime);
          stats[domain] = stat;
        }
      } catch (e) {}
    });

    chrome.storage.local.set({ domain_stats: stats }, () => {
      console.log(`[SmartCleaner] 历史反推完成！共统计到 ${Object.keys(stats).length} 个不同域名。`);
    });
  });
}

/**
 * 2. 消息响应处理：从 Popup / Options 触发数据清理
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'CLEAN_LOW_FREQUENCY_DOMAINS') {
    const { targetDomains, dataTypes } = request;
    cleanDomainsData(targetDomains, dataTypes)
      .then((res) => sendResponse({ success: true, count: res.count }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // 异步响应
  }
});

/**
 * 3. 核心清理函数：使用 browsingData API 定向清除低频域名数据
 */
async function cleanDomainsData(domains, customDataTypes) {
  if (!domains || domains.length === 0) return { count: 0 };

  // 转换构造 Origin List (https://domain 和 http://domain)
  const origins = [];
  domains.forEach(d => {
    origins.push(`https://${d}`);
    origins.push(`http://${d}`);
  });

  const removalOptions = { origins: origins };

  const dataToRemove = customDataTypes || {
    cache: true,
    cookies: true,
    localStorage: true,
    indexedDB: true,
    serviceWorkers: true,
    webSQL: true
  };

  return new Promise((resolve, reject) => {
    chrome.browsingData.remove(removalOptions, dataToRemove, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        // 清理完成后更新存储中的统计数据，移除或清零清理过的低频域名
        chrome.storage.local.get(['domain_stats'], (result) => {
          let stats = result.domain_stats || {};
          domains.forEach(d => {
            delete stats[d];
          });
          chrome.storage.local.set({ domain_stats: stats }, () => {
            resolve({ count: domains.length });
          });
        });
      }
    });
  });
}
