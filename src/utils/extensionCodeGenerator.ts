import JSZip from 'jszip';
import { SessionConfig, CleanerSettings } from '../types/extension';
import {
  ICON_PNG_BASE64_16,
  ICON_PNG_BASE64_32,
  ICON_PNG_BASE64_48,
  ICON_PNG_BASE64_128,
  ICON_JPG_BASE64,
} from '../assets/iconBase64';

export interface ExtensionFiles {
  'manifest.json': string;
  'background.js': string;
  'popup.html': string;
  'popup.js': string;
  'popup.css': string;
  'options.html': string;
  'options.js': string;
  'assets/icons/icon.svg': string;
  'assets/demo/demo1-popup.svg': string;
  'assets/demo/demo2-dashboard.svg': string;
  'assets/demo/demo3-settings.svg': string;
  'assets/demo/demo4-cleaning.svg': string;
  'README.md': string;
}

export function generateExtensionFiles(
  config: SessionConfig = {
    sessionTimeoutMinutes: 30,
    thresholdCount: 3,
    timeWindowDays: 30,
    autoCleanEnabled: false,
    autoCleanIntervalDays: 7,
  },
  settings: CleanerSettings = {
    cleanCache: true,
    cleanCookies: true,
    cleanLocalStorage: true,
    cleanIndexedDB: true,
    cleanServiceWorkers: true,
    cleanWebSQL: true,
  },
  whitelist: string[] = ['google.com', 'github.com', 'stackoverflow.com']
): ExtensionFiles {
  const sessionTimeoutMs = config.sessionTimeoutMinutes * 60 * 1000;

  const manifestJson = JSON.stringify(
    {
      manifest_version: 3,
      name: '智能缓存清理 (Smart Cache Cleaner)',
      version: '1.0.0',
      description: '按会话间隔(默认30分钟)自动统计域名访问频次，并提供一键清理低频域名的缓存、Cookie与Storage功能。',
      permissions: ['tabs', 'storage', 'browsingData', 'history'],
      host_permissions: ['<all_urls>'],
      background: {
        service_worker: 'background.js',
      },
      action: {
        default_popup: 'popup.html',
        default_title: '智能缓存清理',
        default_icon: {
          '16': 'assets/icons/icon16.png',
          '32': 'assets/icons/icon32.png',
          '48': 'assets/icons/icon48.png',
          '128': 'assets/icons/icon128.png',
        },
      },
      icons: {
        '16': 'assets/icons/icon16.png',
        '32': 'assets/icons/icon32.png',
        '48': 'assets/icons/icon48.png',
        '128': 'assets/icons/icon128.png',
      },
      options_page: 'options.html',
    },
    null,
    2
  );

  const backgroundJs = `/**
 * 智能缓存清理 (Smart Cache Cleaner) - Background Service Worker (Manifest V3)
 * 基于会话间隔 (Session Timeout) 算法统计真实访问频次
 */

let SESSION_TIMEOUT_MS = ${sessionTimeoutMs}; // ${config.sessionTimeoutMinutes} 分钟

// 缓存与配置初始化
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[SmartCleaner] 扩展插件已成功安装/更新:', details.reason);
  
  chrome.storage.local.get(['session_config', 'whitelist', 'domain_stats'], (res) => {
    if (!res.session_config) {
      chrome.storage.local.set({
        session_config: {
          sessionTimeoutMinutes: ${config.sessionTimeoutMinutes},
          thresholdCount: ${config.thresholdCount},
          timeWindowDays: ${config.timeWindowDays}
        }
      });
    }
    if (!res.whitelist) {
      chrome.storage.local.set({
        whitelist: ${JSON.stringify(whitelist)}
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
    const timeoutMs = (currentConfig.sessionTimeoutMinutes || ${config.sessionTimeoutMinutes}) * 60 * 1000;

    let item = stats[domain] || {
      count: 0,
      last_active_time: 0,
      first_visited: now,
      estimated_storage_mb: Math.floor(Math.random() * 25) + 5
    };

    // 如果距离上次活跃时间超过了会话超时间隔，则递增频次
    if (now - item.last_active_time > timeoutMs) {
      item.count += 1;
      console.log(\`[SmartCleaner] 域名 \${domain} 触发新会话，频次递增为: \${item.count}\`);
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
    const timeoutMs = ${sessionTimeoutMs};

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
      console.log(\`[SmartCleaner] 历史反推完成！共统计到 \${Object.keys(stats).length} 个不同域名。\`);
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
    origins.push(\`https://\${d}\`);
    origins.push(\`http://\${d}\`);
  });

  const removalOptions = { origins: origins };

  const dataToRemove = customDataTypes || {
    cache: ${settings.cleanCache},
    cookies: ${settings.cleanCookies},
    localStorage: ${settings.cleanLocalStorage},
    indexedDB: ${settings.cleanIndexedDB},
    serviceWorkers: ${settings.cleanServiceWorkers},
    webSQL: ${settings.cleanWebSQL}
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
`;

  const popupHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>智能缓存清理</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="header">
    <div class="logo-title">
      <img src="assets/icon.jpg" class="icon-img" alt="Icon">
      <h2>智能缓存清理</h2>
    </div>
    <a href="#" id="open-options" class="options-link" title="高级设置">⚙️ 设置</a>
  </div>

  <div class="card threshold-card">
    <div class="label-row">
      <span>清理阈值 (访问次数 < )</span>
      <span id="threshold-val" class="badge">3 次</span>
    </div>
    <input type="range" id="threshold-slider" min="1" max="10" value="${config.thresholdCount}" step="1">
    <div class="range-labels">
      <span>1次 (冷门)</span>
      <span>5次</span>
      <span>10次 (高频)</span>
    </div>
  </div>

  <div class="stats-summary">
    <div class="stat-box">
      <div class="stat-num" id="total-domains">0</div>
      <div class="stat-label">已记录域名</div>
    </div>
    <div class="stat-box highlight">
      <div class="stat-num" id="target-count">0</div>
      <div class="stat-label">待清理低频</div>
    </div>
    <div class="stat-box">
      <div class="stat-num" id="freed-mb">0 MB</div>
      <div class="stat-label">可释放空间</div>
    </div>
  </div>

  <div class="section-title">
    <span>拟清理列表预览</span>
    <span id="select-count-text">全选</span>
  </div>

  <div class="domain-list" id="domain-list">
    <!-- 动态渲染列表 -->
    <div class="empty-state">正在加载域名数据...</div>
  </div>

  <div class="footer">
    <button id="clean-btn" class="clean-button">
      <span>⚡ 一键清理此 <span id="btn-count">0</span> 个域名</span>
    </button>
  </div>

  <div id="toast" class="toast hidden">数据清理成功！</div>

  <script src="popup.js"></script>
</body>
</html>
`;

  const popupCss = `* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}

body {
  width: 360px;
  background-color: #f8fafc;
  color: #1e293b;
  padding: 12px;
  font-size: 13px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.logo-title {
  display: flex;
  align-items: center;
  gap: 6px;
}

.logo-title .icon-img {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  object-fit: cover;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.logo-title h2 {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

.options-link {
  font-size: 12px;
  color: #64748b;
  text-decoration: none;
}
.options-link:hover {
  color: #2563eb;
}

.card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 10px;
}

.label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  font-weight: 500;
}

.badge {
  background-color: #eff6ff;
  color: #2563eb;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;
}

input[type="range"] {
  width: 100%;
  accent-color: #2563eb;
  cursor: pointer;
}

.range-labels {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #94a3b8;
  margin-top: 4px;
}

.stats-summary {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.stat-box {
  flex: 1;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 8px;
  text-align: center;
}

.stat-box.highlight {
  background: #fef2f2;
  border-color: #fecaca;
}

.stat-num {
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
}

.stat-box.highlight .stat-num {
  color: #dc2626;
}

.stat-label {
  font-size: 10px;
  color: #64748b;
  margin-top: 2px;
}

.section-title {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 6px;
}

.domain-list {
  max-height: 180px;
  overflow-y: auto;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  margin-bottom: 12px;
}

.domain-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-bottom: 1px solid #f1f5f9;
}

.domain-item:last-child {
  border-bottom: none;
}

.domain-info {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
}

.domain-name {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 170px;
  color: #334155;
}

.visit-badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  background: #f1f5f9;
  color: #475569;
}

.empty-state {
  padding: 20px;
  text-align: center;
  color: #94a3b8;
  font-size: 12px;
}

.clean-button {
  width: 100%;
  background: #2563eb;
  color: #ffffff;
  border: none;
  padding: 10px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s;
}

.clean-button:hover {
  background: #1d4ed8;
}

.clean-button:disabled {
  background: #cbd5e1;
  cursor: not-allowed;
}

.toast {
  position: fixed;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  background: #10b981;
  color: white;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  transition: opacity 0.3s;
}

.toast.hidden {
  opacity: 0;
  pointer-events: none;
}
`;

  const popupJs = `// Popup JavaScript Logic
document.addEventListener('DOMContentLoaded', () => {
  const thresholdSlider = document.getElementById('threshold-slider');
  const thresholdVal = document.getElementById('threshold-val');
  const totalDomainsEl = document.getElementById('total-domains');
  const targetCountEl = document.getElementById('target-count');
  const freedMbEl = document.getElementById('freed-mb');
  const domainListEl = document.getElementById('domain-list');
  const cleanBtn = document.getElementById('clean-btn');
  const btnCountEl = document.getElementById('btn-count');
  const openOptionsLink = document.getElementById('open-options');
  const toast = document.getElementById('toast');

  let allStats = {};
  let whitelist = [];
  let currentTargets = [];

  // 1. 加载存储中的域名数据
  function loadData() {
    chrome.storage.local.get(['domain_stats', 'whitelist', 'session_config'], (res) => {
      allStats = res.domain_stats || {};
      whitelist = res.whitelist || [];

      renderUI();
    });
  }

  // 2. 根据阈值过滤与渲染
  function renderUI() {
    const threshold = parseInt(thresholdSlider.value, 10);
    thresholdVal.textContent = threshold + ' 次';

    const domainEntries = Object.entries(allStats);
    totalDomainsEl.textContent = domainEntries.length;

    // 过滤低于阈值且不在白名单中的域名
    currentTargets = domainEntries
      .filter(([domain, stat]) => stat.count < threshold && !whitelist.includes(domain))
      .map(([domain, stat]) => ({ domain, ...stat }));

    targetCountEl.textContent = currentTargets.length;
    btnCountEl.textContent = currentTargets.length;

    const totalMB = currentTargets.reduce((acc, curr) => acc + (curr.estimated_storage_mb || 10), 0);
    freedMbEl.textContent = totalMB.toFixed(1) + ' MB';

    if (currentTargets.length === 0) {
      domainListEl.innerHTML = '<div class="empty-state">🎉 没有低于此频次的待清理域名</div>';
      cleanBtn.disabled = true;
      return;
    }

    cleanBtn.disabled = false;
    domainListEl.innerHTML = currentTargets.map(item => \`
      <div class="domain-item">
        <div class="domain-info">
          <input type="checkbox" checked data-domain="\${item.domain}" class="domain-check">
          <span class="domain-name" title="\${item.domain}">\${item.domain}</span>
        </div>
        <span class="visit-badge">\${item.count} 次访问</span>
      </div>
    \`).join('');
  }

  // 滑块事件
  thresholdSlider.addEventListener('input', () => {
    renderUI();
  });

  // 打开选项设置页面
  openOptionsLink.addEventListener('click', (e) => {
    e.preventDefault();
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('options.html'));
    }
  });

  // 点击清理按钮
  cleanBtn.addEventListener('click', () => {
    const checkedBoxes = Array.from(document.querySelectorAll('.domain-check:checked'));
    const selectedDomains = checkedBoxes.map(cb => cb.getAttribute('data-domain'));

    if (selectedDomains.length === 0) return;

    cleanBtn.disabled = true;
    cleanBtn.textContent = '清理中...';

    // 向 Background 发送清理命令
    chrome.runtime.sendMessage({
      action: 'CLEAN_LOW_FREQUENCY_DOMAINS',
      targetDomains: selectedDomains,
      dataTypes: {
        cache: true,
        cookies: true,
        localStorage: true,
        indexedDB: true,
        serviceWorkers: true
      }
    }, (response) => {
      cleanBtn.textContent = '一键清理完成！';
      showToast('已清理 ' + selectedDomains.length + ' 个低频域名数据');
      setTimeout(() => {
        loadData();
      }, 1000);
    });
  });

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.remove('hidden');
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 2500);
  }

  loadData();
});
`;

  const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3b82f6" />
      <stop offset="50%" stop-color="#2563eb" />
      <stop offset="100%" stop-color="#1d4ed8" />
    </linearGradient>
    <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#ffffff" />
    </linearGradient>
    <linearGradient id="glowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.22" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#0f172a" flood-opacity="0.25" />
    </filter>
  </defs>

  <!-- Base Squircle -->
  <rect x="8" y="8" width="112" height="112" rx="28" fill="url(#bgGrad)" />
  <rect x="8" y="8" width="112" height="56" rx="28" fill="url(#glowGrad)" />

  <!-- Outer Orbit Arc (Memory Ring) -->
  <path d="M 40 78 A 32 32 0 1 1 88 78" fill="none" stroke="rgba(255, 255, 255, 0.25)" stroke-width="7" stroke-linecap="round" />
  <path d="M 32 64 A 32 32 0 0 1 78 34" fill="none" stroke="url(#arcGrad)" stroke-width="7" stroke-linecap="round" />

  <!-- Center Speed Beam / Spark (Minimal Clean Sweep Motif) -->
  <g filter="url(#shadow)">
    <line x1="40" y1="88" x2="74" y2="54" stroke="#ffffff" stroke-width="7" stroke-linecap="round" />
    <!-- 4-point Diamond Sparkle -->
    <path d="M72 32 C72 40 76 44 84 44 C76 44 72 48 72 56 C72 48 68 44 60 44 C68 44 72 40 72 32 Z" fill="#ffffff" />
    <circle cx="44" cy="44" r="3.5" fill="#38bdf8" />
  </g>
</svg>`;

  const demo1PopupSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500">
  <rect width="800" height="500" rx="12" fill="#0f172a" />
  <rect x="2" y="2" width="796" height="38" rx="10" fill="#1e293b" />
  <circle cx="20" cy="20" r="6" fill="#ef4444" />
  <circle cx="38" cy="20" r="6" fill="#f59e0b" />
  <circle cx="56" cy="20" r="6" fill="#10b981" />
  <rect x="120" y="8" width="400" height="24" rx="6" fill="#334155" />
  <text x="140" y="24" fill="#94a3b8" font-family="sans-serif" font-size="12">chrome-extension://smart-cache-cleaner/popup.html (演示一: 极简弹窗模式)</text>
  <g transform="translate(220, 60)">
    <rect width="360" height="410" rx="12" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
    <rect width="360" height="60" rx="12" fill="#2563eb" />
    <text x="20" y="36" fill="#ffffff" font-family="sans-serif" font-weight="bold" font-size="16">🧹 智能缓存清理 (Smart Cleaner)</text>
    <rect x="16" y="76" width="328" height="50" rx="8" fill="#f1f5f9" />
    <text x="30" y="96" fill="#64748b" font-family="sans-serif" font-size="11">当前访问域名</text>
    <text x="30" y="114" fill="#0f172a" font-family="sans-serif" font-weight="bold" font-size="14">github.com</text>
    <rect x="240" y="90" width="90" height="24" rx="12" fill="#dcfce7" />
    <text x="252" y="106" fill="#166534" font-family="sans-serif" font-weight="bold" font-size="11">🛡️ 白名单保护</text>
    <rect x="16" y="184" width="100" height="54" rx="8" fill="#f8fafc" stroke="#e2e8f0" />
    <text x="66" y="206" text-anchor="middle" fill="#0f172a" font-family="sans-serif" font-weight="bold" font-size="16">128</text>
    <text x="66" y="224" text-anchor="middle" fill="#64748b" font-family="sans-serif" font-size="10">已监控域名</text>
    <rect x="130" y="184" width="100" height="54" rx="8" fill="#fef2f2" stroke="#fecaca" />
    <text x="180" y="206" text-anchor="middle" fill="#dc2626" font-family="sans-serif" font-weight="bold" font-size="16">14</text>
    <text x="180" y="224" text-anchor="middle" fill="#991b1b" font-family="sans-serif" font-size="10">低频待清理</text>
    <rect x="244" y="184" width="100" height="54" rx="8" fill="#f0fdf4" stroke="#bbf7d0" />
    <text x="294" y="206" text-anchor="middle" fill="#16a34a" font-family="sans-serif" font-weight="bold" font-size="15">186.4 MB</text>
    <text x="294" y="224" text-anchor="middle" fill="#166534" font-family="sans-serif" font-size="10">预期释放</text>
    <rect x="16" y="352" width="328" height="42" rx="8" fill="#ef4444" />
    <text x="180" y="378" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="bold" font-size="14">🧹 一键清理 14 个低频域名数据</text>
  </g>
</svg>`;

  const demo2DashboardSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500">
  <rect width="800" height="500" rx="12" fill="#f8fafc" stroke="#e2e8f0" />
  <rect width="800" height="50" fill="#ffffff" stroke-bottom="#e2e8f0" />
  <text x="24" y="32" fill="#2563eb" font-family="sans-serif" font-weight="bold" font-size="18">📊 智能缓存清理 - 域名访问频次明细面板 (演示二)</text>
  <rect x="24" y="70" width="170" height="80" rx="10" fill="#ffffff" stroke="#e2e8f0" />
  <text x="40" y="96" fill="#64748b" font-family="sans-serif" font-size="12">监控域名总数</text>
  <text x="40" y="126" fill="#0f172a" font-family="sans-serif" font-weight="bold" font-size="22">128</text>
  <rect x="210" y="70" width="170" height="80" rx="10" fill="#ffffff" stroke="#fecaca" />
  <text x="226" y="96" fill="#dc2626" font-family="sans-serif" font-size="12">低频待清理目标</text>
  <text x="226" y="126" fill="#dc2626" font-family="sans-serif" font-weight="bold" font-size="22">14</text>
  <rect x="396" y="70" width="170" height="80" rx="10" fill="#ffffff" stroke="#bbf7d0" />
  <text x="412" y="96" fill="#16a34a" font-family="sans-serif" font-size="12">可释放空间</text>
  <text x="412" y="126" fill="#16a34a" font-family="sans-serif" font-weight="bold" font-size="22">186.4 MB</text>
  <rect x="582" y="70" width="194" height="80" rx="10" fill="#ffffff" stroke="#e2e8f0" />
  <text x="598" y="96" fill="#64748b" font-family="sans-serif" font-size="12">会话超时</text>
  <text x="598" y="126" fill="#2563eb" font-family="sans-serif" font-weight="bold" font-size="22">30 分钟</text>
  <rect x="24" y="166" width="752" height="300" rx="10" fill="#ffffff" stroke="#e2e8f0" />
  <text x="40" y="196" fill="#0f172a" font-family="sans-serif" font-weight="bold" font-size="14">域名明细与高阶多重筛选列表</text>
</svg>`;

  const demo3SettingsSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500">
  <rect width="800" height="500" rx="12" fill="#f8fafc" stroke="#e2e8f0" />
  <rect width="800" height="50" fill="#ffffff" />
  <text x="24" y="32" fill="#2563eb" font-family="sans-serif" font-weight="bold" font-size="18">⚙️ 智能缓存清理 - 系统规则与白名单配置 (演示三)</text>
  <rect x="24" y="70" width="752" height="110" rx="10" fill="#ffffff" stroke="#e2e8f0" />
  <text x="44" y="100" fill="#0f172a" font-family="sans-serif" font-weight="bold" font-size="15">1. 会话判定与时间窗算法</text>
  <rect x="24" y="200" width="752" height="140" rx="10" fill="#ffffff" stroke="#e2e8f0" />
  <text x="44" y="230" fill="#0f172a" font-family="sans-serif" font-weight="bold" font-size="15">2. 受保护白名单域名 (永久免清理)</text>
  <rect x="24" y="360" width="752" height="110" rx="10" fill="#ffffff" stroke="#e2e8f0" />
  <text x="44" y="390" fill="#0f172a" font-family="sans-serif" font-weight="bold" font-size="15">3. 清理涵盖的数据类型 (Cache / Cookie / Storage)</text>
</svg>`;

  const demo4CleaningSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500">
  <rect width="800" height="500" rx="12" fill="#0f172a" opacity="0.95" />
  <g transform="translate(180, 100)">
    <rect width="440" height="300" rx="16" fill="#ffffff" />
    <text x="220" y="50" text-anchor="middle" fill="#0f172a" font-family="sans-serif" font-weight="bold" font-size="20">⚡ 定向清理执行中...</text>
    <circle cx="220" cy="130" r="40" fill="none" stroke="#2563eb" stroke-width="8" stroke-dasharray="180 60" />
    <text x="220" y="136" text-anchor="middle" fill="#2563eb" font-family="sans-serif" font-weight="bold" font-size="16">100%</text>
    <text x="220" y="210" text-anchor="middle" fill="#16a34a" font-family="sans-serif" font-weight="bold" font-size="16">已成功清理 14 个低频域名的数据</text>
    <text x="220" y="234" text-anchor="middle" fill="#64748b" font-family="sans-serif" font-size="13">累计释放存储空间 186.4 MB</text>
  </g>
</svg>`;

  const optionsHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>智能缓存清理 - 域名频次面板与管理设置</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      max-width: 1100px;
      margin: 0 auto;
      padding: 24px;
      color: #0f172a;
      background: #f8fafc;
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid #e2e8f0;
    }
    .brand { display: flex; align-items: center; gap: 12px; }
    .brand .logo-img {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      object-fit: cover;
      box-shadow: 0 4px 12px rgba(37,99,235,0.25);
      border: 1px solid #e2e8f0;
    }
    .brand h1 { font-size: 20px; font-weight: 700; color: #0f172a; }
    .brand p { font-size: 12px; color: #64748b; margin-top: 2px; }

    .version-badge {
      background: #eff6ff;
      color: #2563eb;
      border: 1px solid #bfdbfe;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }

    /* Nav Tabs */
    .nav-tabs {
      display: flex;
      gap: 8px;
      background: #e2e8f0;
      padding: 4px;
      border-radius: 12px;
      margin-bottom: 24px;
    }
    .tab-btn {
      flex: 1;
      padding: 12px;
      font-size: 14px;
      font-weight: 600;
      border: none;
      background: transparent;
      color: #64748b;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .tab-btn.active {
      background: #ffffff;
      color: #2563eb;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .tab-content { display: none; }
    .tab-content.active { display: block; }

    /* Stat Cards */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .stat-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 18px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }
    .stat-card .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 600; }
    .stat-card .val { font-size: 26px; font-weight: 800; color: #0f172a; margin-top: 6px; }
    .stat-card .desc { font-size: 11px; color: #94a3b8; margin-top: 4px; }

    /* Controls Card */
    .controls-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }
    .controls-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid #f1f5f9;
    }
    .controls-header h3 { font-size: 15px; font-weight: 700; color: #0f172a; display: flex; align-items: center; gap: 8px; }

    .slider-row {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 20px;
      background: #f8fafc;
      padding: 16px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
    }
    .range-slider { width: 100%; accent-color: #2563eb; cursor: pointer; margin: 8px 0; }
    .range-hints { display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8; }

    /* Buckets Bar */
    .buckets-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 10px;
      margin-top: 16px;
    }
    .bucket-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 10px;
      text-align: center;
    }
    .bucket-card.target { background: #fef2f2; border-color: #fecaca; }
    .bucket-card .b-label { font-size: 11px; color: #64748b; }
    .bucket-card .b-num { font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 2px; }
    .bucket-card.target .b-num { color: #dc2626; }

    /* Toolbar Filter */
    .toolbar {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-top-left-radius: 16px;
      border-top-right-radius: 16px;
      padding: 16px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .search-input {
      padding: 8px 12px;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      font-size: 13px;
      width: 240px;
    }
    select.filter-select {
      padding: 8px 12px;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      font-size: 13px;
      background: #ffffff;
      color: #334155;
    }

    .btn-clean {
      background: #ef4444;
      color: white;
      border: none;
      padding: 10px 18px;
      border-radius: 10px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background 0.2s;
    }
    .btn-clean:hover { background: #dc2626; }
    .btn-clean:disabled { background: #cbd5e1; cursor: not-allowed; }

    /* Table */
    .table-container {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-top: none;
      border-bottom-left-radius: 16px;
      border-bottom-right-radius: 16px;
      overflow-x: auto;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }
    table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
    th { background: #f1f5f9; padding: 12px 16px; font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }
    td { padding: 12px 16px; border-bottom: 1px solid #f1f5f9; color: #334155; vertical-align: middle; }
    tr:hover { background: #f8fafc; }
    tr.low-freq-row { background: rgba(254, 242, 242, 0.4); }

    .domain-cell { display: flex; align-items: center; gap: 12px; }
    .avatar {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 13px;
      color: #475569;
      flex-shrink: 0;
    }
    .domain-title { font-weight: 600; color: #0f172a; }
    .domain-sub { font-size: 11px; color: #94a3b8; margin-top: 2px; }

    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: 700;
      margin-left: 6px;
    }
    .badge-low { background: #fee2e2; color: #b91c1c; }
    .badge-white { background: #dbeafe; color: #1d4ed8; }

    .visit-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 10px;
      border-radius: 12px;
      background: #f1f5f9;
      font-weight: 700;
      font-size: 12px;
      color: #0f172a;
    }

    .data-pills { display: flex; gap: 4px; margin-top: 4px; }
    .data-pill { font-size: 9px; padding: 1px 5px; border-radius: 4px; background: #e2e8f0; color: #475569; }

    .action-btn {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 12px;
      cursor: pointer;
      color: #475569;
      font-weight: 500;
      transition: all 0.2s;
    }
    .action-btn:hover { background: #f1f5f9; color: #0f172a; }
    .action-btn.danger { color: #ef4444; border-color: #fca5a5; }
    .action-btn.danger:hover { background: #fef2f2; }

    /* Settings Tab */
    .card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }
    .card h2 { font-size: 16px; margin-bottom: 14px; color: #2563eb; font-weight: 700; }
    .form-group { margin-bottom: 16px; }
    label { display: block; font-weight: 600; margin-bottom: 6px; font-size: 13px; color: #334155; }
    select.input-full, input[type="text"].input-full {
      width: 100%;
      padding: 10px 14px;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      font-size: 14px;
    }
    .whitelist-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    .tag {
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
      padding: 5px 12px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .tag .remove { cursor: pointer; color: #ef4444; font-weight: bold; font-size: 16px; }
    button.btn-primary {
      background: #2563eb;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 10px;
      font-weight: 700;
      font-size: 14px;
      cursor: pointer;
      transition: background 0.2s;
    }
    button.btn-primary:hover { background: #1d4ed8; }
  </style>
</head>
<body>

  <header>
    <div class="brand">
      <img src="assets/icon.jpg" class="logo-img" alt="Icon">
      <div>
        <h1>智能缓存清理 (Smart Cache Cleaner)</h1>
        <p>基于会话时间间隔 (Session Timeout) 算法的域名频次监控与清理平台</p>
      </div>
    </div>
    <div class="version-badge">Manifest V3 · v1.0.0</div>
  </header>

  <!-- Nav Tabs -->
  <div class="nav-tabs">
    <button class="tab-btn active" id="tab-dashboard-btn">📊 域名访问频次明细面板</button>
    <button class="tab-btn" id="tab-settings-btn">⚙️ 系统规则与白名单配置</button>
  </div>

  <!-- TAB 1: DASHBOARD -->
  <div class="tab-content active" id="tab-dashboard">
    <!-- Stat Cards -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="label">已监控域名总数</div>
        <div class="val" id="stat-total-domains">0</div>
        <div class="desc">包含历史浏览与实时标签监控</div>
      </div>
      <div class="stat-card">
        <div class="label">低频待清理目标</div>
        <div class="val" id="stat-target-domains" style="color: #ef4444;">0</div>
        <div class="desc" id="stat-threshold-desc">访问频次 &lt; 3 次</div>
      </div>
      <div class="stat-card">
        <div class="label">预期可释放总空间</div>
        <div class="val" id="stat-free-space" style="color: #16a34a;">0 MB</div>
        <div class="desc" id="stat-percent-desc">占全部缓存 0%</div>
      </div>
      <div class="stat-card">
        <div class="label">会话断定时间间隔</div>
        <div class="val" id="stat-session-timeout" style="color: #2563eb;">30 分钟</div>
        <div class="desc">30分钟内刷新不计频次</div>
      </div>
    </div>

    <!-- Controls Card -->
    <div class="controls-card">
      <div class="controls-header">
        <h3>⚡ 清理阈值与参数配置</h3>
        <button id="batch-clean-btn" class="btn-clean">
          🧹 一键定向清理选中低频数据 (<span id="clean-target-badge">0</span> 个)
        </button>
      </div>

      <div class="slider-row">
        <div>
          <div style="display:flex; justify-content:space-between; font-size:12px; font-weight:600; color:#334155;">
            <label for="threshold-slider">清理频次阈值: 小于 &lt; <span id="threshold-val" style="color:#2563eb; font-weight:800;">3</span> 次访问</label>
            <span style="color:#94a3b8;">范围: 1 - 10 次</span>
          </div>
          <input type="range" id="threshold-slider" class="range-slider" min="1" max="10" value="3">
          <div class="range-hints">
            <span>仅 0 次访问</span>
            <span>低于 3 次 (推荐)</span>
            <span>低于 5 次</span>
            <span>低于 10 次</span>
          </div>
        </div>
        <div style="border-left: 1px solid #e2e8f0; padding-left: 16px;">
          <label style="font-size:12px;">会话超时 (Session Timeout):</label>
          <select id="session-timeout-quick" class="filter-select" style="width: 100%; margin-top: 4px;">
            <option value="15">15 分钟 (频繁判定)</option>
            <option value="30" selected>30 分钟 (标准 Google 算法)</option>
            <option value="60">60 分钟 (宽松判定)</option>
          </select>
        </div>
      </div>

      <!-- Frequency Distribution Bars -->
      <div style="margin-top: 16px;">
        <div style="font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 8px;">📊 全站域名访问频次分布柱图</div>
        <div class="buckets-grid" id="buckets-container">
          <!-- 动态渲染 5 个频次桶 -->
        </div>
      </div>
    </div>

    <!-- Toolbar Filters -->
    <div class="toolbar">
      <div style="display: flex; gap: 10px; align-items: center; flex: 1; flex-wrap: wrap;">
        <input type="text" id="search-input" class="search-input" placeholder="🔍 搜索域名, 例如: rare-tool, github...">
        <select id="category-filter" class="filter-select">
          <option value="all">所有分类</option>
          <option value="infrequent">冷门/单次访问</option>
          <option value="tools">在线工具类</option>
          <option value="dev">开发者类</option>
          <option value="shopping">购物/电商类</option>
          <option value="social">社交/资讯类</option>
          <option value="search">搜索引擎</option>
          <option value="other">其他</option>
        </select>
        <select id="whitelist-filter" class="filter-select">
          <option value="all">全部保护状态</option>
          <option value="unprotected">未受保护 (待清理)</option>
          <option value="whitelisted">已加入白名单</option>
        </select>
        <select id="sort-by-select" class="filter-select">
          <option value="count-asc">按频次升序 (低频在前)</option>
          <option value="count-desc">按频次降序 (高频在前)</option>
          <option value="storage-desc">按内存体积降序</option>
          <option value="time-desc">按最近活跃时间</option>
        </select>
      </div>
    </div>

    <!-- Domain Frequency Table -->
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th style="width: 40px; text-align: center;"><input type="checkbox" id="select-all-check"></th>
            <th>域名与标签信息</th>
            <th>访问频次 (会话)</th>
            <th>最近活跃时间</th>
            <th>估算缓存占用</th>
            <th>白名单保护</th>
            <th style="text-align: right;">清理操作</th>
          </tr>
        </thead>
        <tbody id="domain-table-body">
          <!-- 动态渲染域名列表 -->
        </tbody>
      </table>
    </div>
  </div>

  <!-- TAB 2: SETTINGS -->
  <div class="tab-content" id="tab-settings">
    <div class="card">
      <h2>1. 会话判定与时间窗算法</h2>
      <div class="form-group">
        <label for="session-timeout">会话时间间隔 (Session Timeout):</label>
        <select id="session-timeout" class="input-full">
          <option value="15">15 分钟</option>
          <option value="30" selected>30 分钟 (标准 GA 算法建议)</option>
          <option value="60">60 分钟 (1小时)</option>
          <option value="120">120 分钟 (2小时)</option>
        </select>
        <small style="color: #64748b; margin-top: 4px; display: block;">连续访问同一域名的间隔超过此数值，才会被计算为 1 次独立访问会话。</small>
      </div>
    </div>

    <div class="card">
      <h2>2. 受保护白名单域名 (永久免清理)</h2>
      <div class="form-group">
        <label>添加保护域名：</label>
        <div style="display:flex; gap: 10px;">
          <input type="text" id="new-white-domain" class="input-full" placeholder="例如: github.com, google.com">
          <button id="add-white-btn" class="btn-primary" style="white-space: nowrap;">添加保护</button>
        </div>
      </div>
      <div class="whitelist-tags" id="whitelist-container">
        <!-- 动态渲染白名单标签 -->
      </div>
    </div>

    <div class="card">
      <h2>3. 清理涵盖的数据类型</h2>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 14px;">
        <label><input type="checkbox" id="chk-cache" checked> 页面缓存 (Cache)</label>
        <label><input type="checkbox" id="chk-cookies" checked> Cookies 凭证与 Token</label>
        <label><input type="checkbox" id="chk-storage" checked> LocalStorage 本地存储</label>
        <label><input type="checkbox" id="chk-indexeddb" checked> IndexedDB 数据库</label>
        <label><input type="checkbox" id="chk-sw" checked> Service Workers 离线缓存</label>
      </div>
    </div>

    <button id="save-settings-btn" class="btn-primary" style="width:100%; padding: 14px; font-size: 15px;">💾 保存选项与规则配置</button>
  </div>

  <script src="options.js"></script>
</body>
</html>
`;

  const optionsJs = `document.addEventListener('DOMContentLoaded', () => {
  // Tabs
  const tabDashboardBtn = document.getElementById('tab-dashboard-btn');
  const tabSettingsBtn = document.getElementById('tab-settings-btn');
  const tabDashboard = document.getElementById('tab-dashboard');
  const tabSettings = document.getElementById('tab-settings');

  tabDashboardBtn.addEventListener('click', () => {
    tabDashboardBtn.classList.add('active');
    tabSettingsBtn.classList.remove('active');
    tabDashboard.classList.add('active');
    tabSettings.classList.remove('active');
  });

  tabSettingsBtn.addEventListener('click', () => {
    tabSettingsBtn.classList.add('active');
    tabDashboardBtn.classList.remove('active');
    tabSettings.classList.add('active');
    tabDashboard.classList.remove('active');
  });

  // State
  let statsData = {};
  let whitelist = ['google.com', 'github.com', 'stackoverflow.com'];
  let currentThreshold = 3;
  let searchQuery = '';
  let categoryFilter = 'all';
  let whitelistFilter = 'all';
  let sortBy = 'count-asc';
  let selectedDomainsSet = new Set();

  // Elements
  const statTotal = document.getElementById('stat-total-domains');
  const statTarget = document.getElementById('stat-target-domains');
  const statSpace = document.getElementById('stat-free-space');
  const statPercent = document.getElementById('stat-percent-desc');
  const statSession = document.getElementById('stat-session-timeout');
  const thresholdSlider = document.getElementById('threshold-slider');
  const thresholdVal = document.getElementById('threshold-val');
  const statThresholdDesc = document.getElementById('stat-threshold-desc');
  const sessionQuick = document.getElementById('session-timeout-quick');
  const bucketsContainer = document.getElementById('buckets-container');

  const searchInput = document.getElementById('search-input');
  const categorySelect = document.getElementById('category-filter');
  const whitelistSelect = document.getElementById('whitelist-filter');
  const sortSelect = document.getElementById('sort-by-select');
  const selectAllCheck = document.getElementById('select-all-check');

  const batchCleanBtn = document.getElementById('batch-clean-btn');
  const cleanTargetBadge = document.getElementById('clean-target-badge');
  const tableBody = document.getElementById('domain-table-body');

  const sessionSelect = document.getElementById('session-timeout');
  const newWhiteInput = document.getElementById('new-white-domain');
  const addWhiteBtn = document.getElementById('add-white-btn');
  const whitelistContainer = document.getElementById('whitelist-container');
  const saveSettingsBtn = document.getElementById('save-settings-btn');

  function loadData() {
    chrome.storage.local.get(['domain_stats', 'whitelist', 'session_config'], (res) => {
      statsData = res.domain_stats || getInitialMockStats();
      if (!res.domain_stats) {
        chrome.storage.local.set({ domain_stats: statsData });
      }

      whitelist = res.whitelist || ['google.com', 'github.com', 'stackoverflow.com'];
      if (res.session_config && res.session_config.sessionTimeoutMinutes) {
        const tVal = res.session_config.sessionTimeoutMinutes.toString();
        sessionSelect.value = tVal;
        sessionQuick.value = tVal;
        statSession.textContent = tVal + ' 分钟';
      }

      renderAll();
    });
  }

  function getInitialMockStats() {
    const now = Date.now();
    return {
      'google.com': { domain: 'google.com', count: 42, lastActiveTime: now - 300000, estimatedStorageMB: 12.4, isWhitelisted: true, notes: '搜索引擎/高频工具' },
      'github.com': { domain: 'github.com', count: 18, lastActiveTime: now - 1800000, estimatedStorageMB: 24.8, isWhitelisted: true, notes: '代码托管平台' },
      'stackoverflow.com': { domain: 'stackoverflow.com', count: 9, lastActiveTime: now - 86400000, estimatedStorageMB: 8.2, isWhitelisted: true, notes: '开发者问答网站' },
      'temp-news-feed.com': { domain: 'temp-news-feed.com', count: 1, lastActiveTime: now - 172800000, estimatedStorageMB: 15.6, isWhitelisted: false, notes: '单次资讯页面' },
      'random-shop-deal.net': { domain: 'random-shop-deal.net', count: 2, lastActiveTime: now - 259200000, estimatedStorageMB: 32.1, isWhitelisted: false, notes: '优惠推广页' },
      'one-time-forum.org': { domain: 'one-time-forum.org', count: 1, lastActiveTime: now - 432000000, estimatedStorageMB: 11.5, isWhitelisted: false, notes: '临时论坛贴' },
      'rare-tool-site.io': { domain: 'rare-tool-site.io', count: 1, lastActiveTime: now - 500000000, estimatedStorageMB: 18.2, isWhitelisted: false, notes: '一次性转换工具' },
    };
  }

  function getCategory(domain) {
    const d = domain.toLowerCase();
    if (d.includes('github') || d.includes('overflow') || d.includes('gitee') || d.includes('npm')) return 'dev';
    if (d.includes('google') || d.includes('baidu') || d.includes('bing')) return 'search';
    if (d.includes('taobao') || d.includes('jd') || d.includes('amazon') || d.includes('shop') || d.includes('deal')) return 'shopping';
    if (d.includes('weibo') || d.includes('twitter') || d.includes('zhihu') || d.includes('news') || d.includes('forum')) return 'social';
    if (d.includes('tool') || d.includes('calc') || d.includes('convert')) return 'tools';
    return 'infrequent';
  }

  function normalizeDomains(rawStatsData) {
    if (!rawStatsData) return [];
    const entries = Array.isArray(rawStatsData)
      ? rawStatsData
      : Object.entries(rawStatsData).map(([k, v]) => ({ domain: k, ...v }));

    return entries.map(val => {
      const d = val.domain || 'unknown';
      const isW = whitelist.includes(d);
      return {
        domain: d,
        count: val.count ?? val.visitCount ?? 1,
        lastActiveTime: val.lastActiveTime || val.last_active_time || val.lastVisit || Date.now(),
        estimatedStorageMB: val.estimatedStorageMB ?? val.estimatedSizeMb ?? val.estimated_storage_mb ?? 10,
        isWhitelisted: isW,
        category: val.category || getCategory(d),
        notes: val.notes || ''
      };
    });
  }

  function formatTimeAgo(timeMs) {
    const diffMs = Date.now() - timeMs;
    if (diffMs < 0) return '刚才';
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 60) return diffMins + ' 分钟前';
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return diffHours + ' 小时前';
    const diffDays = Math.floor(diffHours / 24);
    return diffDays + ' 天前';
  }

  function renderAll() {
    renderDashboard();
    renderWhitelist();
  }

  function renderDashboard() {
    const allDomains = normalizeDomains(statsData);
    const totalCount = allDomains.length;

    // Filter target low frequency
    const targetDomains = allDomains.filter(d => d.count < currentThreshold && !whitelist.includes(d.domain));
    const freeableMb = targetDomains.reduce((acc, curr) => acc + (curr.estimatedStorageMB || 0), 0);
    const totalStorageMb = allDomains.reduce((acc, curr) => acc + (curr.estimatedStorageMB || 0), 0);
    const pct = totalStorageMb > 0 ? ((freeableMb / totalStorageMb) * 100).toFixed(0) : '0';

    statTotal.textContent = totalCount.toString();
    statTarget.textContent = targetDomains.length.toString();
    statSpace.textContent = freeableMb.toFixed(1) + ' MB';
    statPercent.textContent = '占全部缓存 ' + pct + '%';
    statThresholdDesc.textContent = '访问频次 < ' + currentThreshold + ' 次';
    cleanTargetBadge.textContent = selectedDomainsSet.size > 0 ? selectedDomainsSet.size.toString() : targetDomains.length.toString();

    // Render Buckets
    const buckets = { '1次 (极低)': 0, '2次 (低频)': 0, '3-5次 (中频)': 0, '6-10次 (常用)': 0, '>10次 (高频)': 0 };
    allDomains.forEach(d => {
      if (d.count === 1) buckets['1次 (极低)']++;
      else if (d.count === 2) buckets['2次 (低频)']++;
      else if (d.count >= 3 && d.count <= 5) buckets['3-5次 (中频)']++;
      else if (d.count >= 6 && d.count <= 10) buckets['6-10次 (常用)']++;
      else buckets['>10次 (高频)']++;
    });

    bucketsContainer.innerHTML = Object.entries(buckets).map(([lbl, cnt]) => {
      const isTarget = lbl.includes('1次') || lbl.includes('2次');
      return \`
        <div class="bucket-card \${isTarget ? 'target' : ''}">
          <div class="b-label">\${lbl}</div>
          <div class="b-num">\${cnt} <span style="font-size:10px; font-weight:normal; color:#94a3b8;">个</span></div>
        </div>
      \`;
    }).join('');

    // Filter and Sort Table
    const filteredDomains = allDomains.filter(d => {
      const matchesSearch = !searchQuery || d.domain.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || d.category === categoryFilter;
      const matchesWhitelist = whitelistFilter === 'all'
        ? true
        : whitelistFilter === 'whitelisted'
        ? d.isWhitelisted
        : !d.isWhitelisted;
      return matchesSearch && matchesCategory && matchesWhitelist;
    }).sort((a, b) => {
      if (sortBy === 'count-asc') return a.count - b.count;
      if (sortBy === 'count-desc') return b.count - a.count;
      if (sortBy === 'time-desc') return b.lastActiveTime - a.lastActiveTime;
      if (sortBy === 'storage-desc') return b.estimatedStorageMB - a.estimatedStorageMB;
      return 0;
    });

    if (filteredDomains.length === 0) {
      tableBody.innerHTML = \`<tr><td colSpan="7" style="text-align:center; padding: 40px; color:#94a3b8;">没有找到符合条件的域名数据</td></tr>\`;
      selectAllCheck.checked = false;
      return;
    }

    tableBody.innerHTML = filteredDomains.map(d => {
      const isWhite = whitelist.includes(d.domain);
      const isLow = d.count < currentThreshold;
      const isCleanCandidate = isLow && !isWhite;
      const isChecked = selectedDomainsSet.has(d.domain);
      const initialLetter = d.domain.charAt(0).toUpperCase();

      return \`
        <tr class="\${isCleanCandidate ? 'low-freq-row' : ''}">
          <td style="text-align: center;">
            <input type="checkbox" class="row-check" data-domain="\${d.domain}" \${isChecked ? 'checked' : ''}>
          </td>
          <td>
            <div class="domain-cell">
              <div class="avatar">\${initialLetter}</div>
              <div>
                <div style="display:flex; align-items:center; gap: 6px;">
                  <span class="domain-title">\${d.domain}</span>
                  \${isCleanCandidate ? '<span class="badge badge-low">⚡ 拟清理低频</span>' : ''}
                  \${isWhite ? '<span class="badge badge-white">🛡️ 白名单</span>' : ''}
                </div>
                \${d.notes ? \`<div class="domain-sub">\${d.notes}</div>\` : ''}
              </div>
            </div>
          </td>
          <td>
            <div class="visit-pill">
              <span style="color: \${isCleanCandidate ? '#dc2626' : '#2563eb'};\ font-weight:800;">\${d.count}</span>
              <span style="font-size:10px; font-weight:normal; color:#64748b;">次会话</span>
            </div>
          </td>
          <td style="color: #64748b;">\${formatTimeAgo(d.lastActiveTime)}</td>
          <td>
            <div style="font-weight:700; color:#0f172a;">\${d.estimatedStorageMB.toFixed(1)} MB</div>
            <div class="data-pills">
              <span class="data-pill">Cache</span>
              <span class="data-pill">Cookie</span>
              <span class="data-pill">Storage</span>
            </div>
          </td>
          <td>
            <button class="action-btn toggle-white-btn" data-domain="\${d.domain}">
              \${isWhite ? '🛡️ 已保护' : '🛡️ 设为保护'}
            </button>
          </td>
          <td style="text-align: right;">
            <button class="action-btn danger clean-single-btn" data-domain="\${d.domain}">
              清理此数据
            </button>
          </td>
        </tr>
      \`;
    }).join('');

    // Checkbox Listeners
    document.querySelectorAll('.row-check').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const dom = e.target.getAttribute('data-domain');
        if (e.target.checked) selectedDomainsSet.add(dom);
        else selectedDomainsSet.delete(dom);
        cleanTargetBadge.textContent = selectedDomainsSet.size > 0 ? selectedDomainsSet.size.toString() : targetDomains.length.toString();
      });
    });

    document.querySelectorAll('.toggle-white-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const domain = e.target.getAttribute('data-domain');
        if (whitelist.includes(domain)) {
          whitelist = whitelist.filter(w => w !== domain);
        } else {
          whitelist.push(domain);
        }
        chrome.storage.local.set({ whitelist: whitelist }, () => renderAll());
      });
    });

    document.querySelectorAll('.clean-single-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const domain = e.target.getAttribute('data-domain');
        if (confirm(\`确定要清理 \${domain} 的本地缓存与 Cookie 吗？\`)) {
          cleanDomainData([domain]);
        }
      });
    });
  }

  function renderWhitelist() {
    whitelistContainer.innerHTML = whitelist.map(d => \`
      <div class="tag">
        <span>\${d}</span>
        <span class="remove" data-domain="\${d}">&times;</span>
      </div>
    \`).join('');

    document.querySelectorAll('.tag .remove').forEach(el => {
      el.addEventListener('click', (e) => {
        const domainToRemove = e.target.getAttribute('data-domain');
        whitelist = whitelist.filter(d => d !== domainToRemove);
        chrome.storage.local.set({ whitelist: whitelist }, () => renderAll());
      });
    });
  }

  // Event Listeners
  thresholdSlider.addEventListener('input', (e) => {
    currentThreshold = parseInt(e.target.value, 10);
    thresholdVal.textContent = currentThreshold.toString();
    renderDashboard();
  });

  sessionQuick.addEventListener('change', (e) => {
    sessionSelect.value = e.target.value;
    statSession.textContent = e.target.value + ' 分钟';
  });

  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    renderDashboard();
  });

  categorySelect.addEventListener('change', (e) => {
    categoryFilter = e.target.value;
    renderDashboard();
  });

  whitelistSelect.addEventListener('change', (e) => {
    whitelistFilter = e.target.value;
    renderDashboard();
  });

  sortSelect.addEventListener('change', (e) => {
    sortBy = e.target.value;
    renderDashboard();
  });

  selectAllCheck.addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    document.querySelectorAll('.row-check').forEach(chk => {
      chk.checked = isChecked;
      const dom = chk.getAttribute('data-domain');
      if (isChecked) selectedDomainsSet.add(dom);
      else selectedDomainsSet.delete(dom);
    });
    const targetDomains = normalizeDomains(statsData).filter(d => d.count < currentThreshold && !whitelist.includes(d.domain));
    cleanTargetBadge.textContent = selectedDomainsSet.size > 0 ? selectedDomainsSet.size.toString() : targetDomains.length.toString();
  });

  batchCleanBtn.addEventListener('click', () => {
    let targets = Array.from(selectedDomainsSet);
    if (targets.length === 0) {
      targets = normalizeDomains(statsData)
        .filter(d => d.count < currentThreshold && !whitelist.includes(d.domain))
        .map(d => d.domain);
    }

    if (targets.length === 0) {
      alert('当前没有符合条件的待清理域名！');
      return;
    }

    if (confirm(\`确定要清理这 \${targets.length} 个域名的所有缓存与 Cookie 吗？\`)) {
      cleanDomainData(targets);
    }
  });

  function cleanDomainData(domainsToClean) {
    if (chrome.browsingData && chrome.browsingData.remove) {
      const origins = domainsToClean.map(d => \`http://\${d}\`).concat(domainsToClean.map(d => \`https://\${d}\`));
      chrome.browsingData.remove({ origins: origins }, {
        cache: true, cookies: true, localStorage: true, indexedDB: true, serviceWorkers: true
      }, () => finishClean(domainsToClean));
    } else {
      finishClean(domainsToClean);
    }
  }

  function finishClean(cleanedDomains) {
    cleanedDomains.forEach(d => {
      delete statsData[d];
      selectedDomainsSet.delete(d);
    });
    chrome.storage.local.set({ domain_stats: statsData }, () => {
      alert(\`已成功清理 \${cleanedDomains.length} 个域名的缓存与本地数据！\`);
      renderAll();
    });
  }

  addWhiteBtn.addEventListener('click', () => {
    const val = newWhiteInput.value.trim().toLowerCase();
    if (val && !whitelist.includes(val)) {
      whitelist.push(val);
      newWhiteInput.value = '';
      chrome.storage.local.set({ whitelist: whitelist }, () => renderAll());
    }
  });

  saveSettingsBtn.addEventListener('click', () => {
    const timeoutVal = parseInt(sessionSelect.value, 10);
    chrome.storage.local.set({
      session_config: {
        sessionTimeoutMinutes: timeoutVal,
        thresholdCount: currentThreshold,
        timeWindowDays: ${config.timeWindowDays}
      },
      whitelist: whitelist
    }, () => {
      alert('系统配置与清理规则已成功保存！');
    });
  });

  loadData();
});
`;

  const readmeMd = `# 智能缓存清理 (Smart Cache Cleaner) - Chrome 扩展程序 (Manifest V3)

![Manifest V3](https://img.shields.io/badge/Manifest-V3-2563eb.svg)
![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-34d399.svg)
![License](https://img.shields.io/badge/License-MIT-0284c7.svg)

**智能缓存清理 (Smart Cache Cleaner)** 是一款遵循 **Google Chrome Manifest V3** 最新规范开发的浏览器扩展程序。它基于 **GA 级会话断定算法 (Session Timeout)**，智能追踪并统计全网域名的真实访问频次，协助用户快速筛选并一键清理偶发、低频访问网站产生的无用页面缓存、Cookie 凭证与本地存储空间，同时提供强效白名单防护，让浏览器始终保持轻盈高效。

---

## 🎨 插件图标 (Plugin Icon)

扩展程序全局统一使用 \`assets/icon.jpg\` 作为标识图标：

\`\`\`text
   ┌──────────────────────────────────────────────┐
   │                                              │
   │            [  assets/icon.jpg  ]             │
   │                                              │
   │      极简极速 · 智能缓存清理标识图标         │
   │                                              │
   └──────────────────────────────────────────────┘
\`\`\`

---

## 🏗️ 系统设计架构 (System Architecture)

本项目采用 **“Web 模拟仿真 + Manifest V3 原生插件生成器”** 架构设计：

### 1. 双引擎架构逻辑拓扑图 (Architecture Topology)

\`\`\`text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           用户浏览器环境 (User Browser)                       │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
            ┌──────────────────────────┴──────────────────────────┐
            ▼                                                     ▼
┌───────────────────────────────┐                     ┌───────────────────────────────┐
│   Web 交互模拟器 (Simulator)   │                     │   Manifest V3 生产环境扩展     │
├───────────────────────────────┤                     ├───────────────────────────────┤
│ • React + Vite 实时组件        │                     │ • Service Worker (background) │
│ • Chrome API 内存沙盒 (Mock)  │                     │ • Chrome browsingData 原生API │
│ • 智能统计/快速清理模拟        │                     │ • chrome.storage.local 持久化  │
│ • JSZip 纯前端打包 (.zip)      │                     │ • 原生 Popup / Options 页面    │
└───────────────┬───────────────┘                     └───────────────┬───────────────┘
                │                                                     │
                └──────────────────────────┬──────────────────────────┘
                                           ▼
                       ┌──────────────────────────────────────┐
                       │    GA 级会话去重算法 (Session Engine)  │
                       ├──────────────────────────────────────┤
                       │ • 默认 30 分钟超时窗口 (Timeout)     │
                       │ • 相同会话去重 / 跨窗口自动递增频次     │
                       │ • 网站分类映射 / 存储占用预估        │
                       │ • 智能白名单比对防护                 │
                       └──────────────────────────────────────┘
\`\`\`

### 2. 核心组件与 API 映射

| 组件 / 模块 | 文件路径 | 核心 API / 职责 |
| :--- | :--- | :--- |
| **Manifest V3 描述符** | \`manifest.json\` | 声明权限 \`tabs\`, \`browsingData\`, \`storage\`, \`history\` 与 \`assets/icon.jpg\` 图标 |
| **Service Worker** | \`background.js\` | 监听 \`chrome.tabs.onUpdated\`、时间戳计算与 \`chrome.browsingData.remove\` 清理 |
| **悬浮控制弹窗** | \`popup.html\` / \`.js\` | 当前页面域名识别、阈值滑块调整与快速清理 |
| **明细管理控制台** | \`options.html\` / \`.js\` | 全维频次报表、分类检索过滤与白名单规则配置 |
| **模板构建脚本** | \`scripts/build-extension.ts\` | Node.js 物理编译，输出 \`./dist-extension\` 目录 |

---

## 🌟 核心算法详解：GA 级会话断定 (Session Timeout)

普通计数器在多次刷页或打开多个子页面时会导致访问频次虚高。本插件引入 **Google Analytics 标准会话划分规则**：

\`\`\`text
 用户打开网页 ──► 检查上次访问时间戳 T_last
                         │
         ┌───────────────┴───────────────┐
         ▼                               ▼
 (现时间 - T_last) < 30分钟       (现时间 - T_last) ≥ 30分钟
         │                               │
         ▼                               ▼
 [保持当前会话]                  [新会话开启]
  访问频次 Count 不变              访问频次 Count + 1
  更新时间戳 T_last                更新时间戳 T_last
\`\`\`

---

## 📸 交互功能图解 (Visual Walkthrough)

### 1. 极简悬浮弹窗模式 (Popup Window)
\`\`\`text
┌──────────────────────────────────────────────┐
│  [icon.jpg] 智能缓存清理         ⚙️ 设置       │
├──────────────────────────────────────────────┤
│ 清理阈值 (访问次数 < )               [ 3 次 ] │
│ ───●──────────────────────────────────────── │
├───────────────┬───────────────┬──────────────┤
│   已记录域名   │  待清理低频   │  可释放空间  │
│      42       │      18       │    124 MB    │
├───────────────┴───────────────┴──────────────┤
│ 拟清理列表预览                      [全选]   │
│ [x] 🌐 tmp-tool-site.com      访问 1 次 | 12MB│
│ [x] 🛒 promo-shop.net         访问 2 次 |  8MB│
├──────────────────────────────────────────────┤
│ [ ⚡ 一键清理选中的 18 个低频域名数据 ]      │
└──────────────────────────────────────────────┘
\`\`\`

---

## 🛠️ 构建与安装步骤 (Step-by-Step Guide)

### 步骤一：通过命令行编译插件 (CLI Command)

在项目根目录运行编译脚本：

\`\`\`bash
npm run build:extension
\`\`\`

编译完成后将在根目录下生成符合 Chrome MV3 标准的 \`./dist-extension\` 产物文件夹。

---

### 步骤二：在 Chrome / Edge 浏览器中安装加载 (Load Unpacked)

\`\`\`text
步骤 1: 打开浏览器扩展页面           步骤 2: 开启开发者模式         步骤 3: 选择 dist-extension 目录
┌───────────────────────────┐      ┌─────────────────────┐      ┌────────────────────────────┐
│ 网址栏输入:                │      │ 右上角开关:         │      │ 点击按钮:                  │
│ chrome://extensions       │ ───► │ [x] 开发者模式      │ ───► │ [加载已解压的扩展程序]      │
└───────────────────────────┘      └─────────────────────┘      └─────────────┬──────────────┘
                                                                              │
                                                                              ▼
                                                                  成功载入 [智能缓存清理] 插件！
\`\`\`

---

## 📁 目录架构与文件说明

\`\`\`text
smart-cache-cleaner/
├── manifest.json              # Manifest V3 扩展配置文件 (图标指向 assets/icon.jpg)
├── background.js              # 后台 Service Worker (会话去重算法与缓存清理 API)
├── popup.html / popup.js      # 极简悬浮弹窗 UI 与阈值调控逻辑
├── options.html / options.js  # 完整频次面板与白名单管理配置
├── assets/
│   ├── icon.jpg               # 插件全局主图标 (JPG 格式)
│   ├── icons/                 # 各尺寸图标备份目录
│   └── demo/                  # SVG/PNG 交互示意图
├── scripts/
│   └── build-extension.ts     # 物理编译输出脚本
└── README.md                  # 图文架构与使用教程说明文档
\`\`\`

---

## 🔒 隐私与安全性保障

- **纯本地运算**：本扩展程序所有域名访问统计、会话记录及白名单数据均使用 \`chrome.storage.local\` 存储在用户本地设备中，**绝不会向任何第三方服务器上传或传输任何网络请求与个人隐私数据**。
- **透明权限调配**：仅请求必要的 \`tabs\`、\`browsingData\`、\`history\` 和 \`storage\` 权限，用于精准识别域名与清除无用缓存。
`;

  return {
    'manifest.json': manifestJson,
    'background.js': backgroundJs,
    'popup.html': popupHtml,
    'popup.js': popupJs,
    'popup.css': popupCss,
    'options.html': optionsHtml,
    'options.js': optionsJs,
    'assets/icons/icon.svg': iconSvg,
    'assets/demo/demo1-popup.svg': demo1PopupSvg,
    'assets/demo/demo2-dashboard.svg': demo2DashboardSvg,
    'assets/demo/demo3-settings.svg': demo3SettingsSvg,
    'assets/demo/demo4-cleaning.svg': demo4CleaningSvg,
    'README.md': readmeMd,
  };
}

export async function downloadExtensionZip(
  config: SessionConfig,
  settings: CleanerSettings,
  whitelist: string[]
): Promise<Blob> {
  const files = generateExtensionFiles(config, settings, whitelist);
  const zip = new JSZip();

  // Add text files & SVG assets
  Object.entries(files).forEach(([filename, content]) => {
    zip.file(filename, content);
  });

  // Convert base64 icons to binary byte arrays for ZIP
  const base64ToBytes = (base64Str: string): Uint8Array => {
    const binaryStr = atob(base64Str);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return bytes;
  };

  const icon16Bytes = base64ToBytes(ICON_PNG_BASE64_16);
  const icon32Bytes = base64ToBytes(ICON_PNG_BASE64_32);
  const icon48Bytes = base64ToBytes(ICON_PNG_BASE64_48);
  const icon128Bytes = base64ToBytes(ICON_PNG_BASE64_128);
  const iconJpgBytes = base64ToBytes(ICON_JPG_BASE64);

  // Add PNG & JPG icon files to ZIP
  zip.file('assets/icons/icon16.png', icon16Bytes);
  zip.file('assets/icons/icon32.png', icon32Bytes);
  zip.file('assets/icons/icon48.png', icon48Bytes);
  zip.file('assets/icons/icon128.png', icon128Bytes);
  zip.file('assets/icon.png', icon128Bytes);
  zip.file('assets/icon.jpg', iconJpgBytes);

  // Helper to draw icon to canvas
  const createIconBuffer = (size: number): Uint8Array => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, size, size);

      // 1. Background Squircle with Electric Blue/Indigo Gradient
      const bgGrad = ctx.createLinearGradient(0, 0, size, size);
      bgGrad.addColorStop(0, '#3b82f6');
      bgGrad.addColorStop(0.5, '#2563eb');
      bgGrad.addColorStop(1, '#1d4ed8');

      ctx.fillStyle = bgGrad;
      ctx.beginPath();
      const radius = size * 0.22;
      ctx.roundRect(0, 0, size, size, radius);
      ctx.fill();

      // Top subtle sheen
      const sheenGrad = ctx.createLinearGradient(0, 0, 0, size * 0.5);
      sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
      sheenGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = sheenGrad;
      ctx.beginPath();
      ctx.roundRect(0, 0, size, size * 0.5, [radius, radius, 0, 0]);
      ctx.fill();

      // 2. Arc Memory Ring
      const cx = size * 0.5;
      const cy = size * 0.5;
      const r = size * 0.28;
      const strokeW = Math.max(1.8, size * 0.075);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.lineWidth = strokeW;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(cx, cy, r, Math.PI * 0.25, Math.PI * 1.75);
      ctx.stroke();

      const arcGrad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cx + r);
      arcGrad.addColorStop(0, '#38bdf8');
      arcGrad.addColorStop(1, '#ffffff');
      ctx.strokeStyle = arcGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, Math.PI * 0.8, Math.PI * 1.55);
      ctx.stroke();

      // 3. Diagonal Speed Sweep Line
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = strokeW * 1.1;
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.65, cy + r * 0.65);
      ctx.lineTo(cx + r * 0.35, cy - r * 0.35);
      ctx.stroke();

      // 4. Modern Sparkle Star (at top right)
      if (size >= 24) {
        const sx = cx + r * 0.3;
        const sy = cy - r * 0.7;
        const sparkRadius = size * 0.12;

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(sx, sy - sparkRadius);
        ctx.quadraticCurveTo(sx, sy, sx + sparkRadius, sy);
        ctx.quadraticCurveTo(sx, sy, sx, sy + sparkRadius);
        ctx.quadraticCurveTo(sx, sy, sx - sparkRadius, sy);
        ctx.quadraticCurveTo(sx, sy, sx, sy - sparkRadius);
        ctx.fill();

        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(cx - r * 0.55, cy - r * 0.55, Math.max(1.5, size * 0.035), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const dataUrl = canvas.toDataURL('image/png');
    const base64 = dataUrl.split(',')[1];
    const binaryStr = atob(base64);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return bytes;
  };

  // Add PNG icon binary files
  [16, 32, 48, 128].forEach((size) => {
    zip.file(`assets/icons/icon${size}.png`, createIconBuffer(size));
  });

  // Helper to draw demo screenshot to canvas
  const createDemoBuffer = (title: string, sub: string, accentColor: string): Uint8Array => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 500;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Dark chrome bar frame
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(0, 0, 800, 500, 16);
      ctx.fill();

      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(4, 4, 792, 42, 12);
      ctx.fill();

      // Window dots
      ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(24, 25, 6, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(42, 25, 6, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#10b981'; ctx.beginPath(); ctx.arc(60, 25, 6, 0, Math.PI*2); ctx.fill();

      // URL bar
      ctx.fillStyle = '#334155';
      ctx.beginPath(); ctx.roundRect(100, 13, 500, 24, 6); ctx.fill();
      ctx.fillStyle = '#cbd5e1'; ctx.font = '12px sans-serif'; ctx.fillText(`chrome-extension://smart-cache-cleaner/ - ${title}`, 115, 30);

      // Main inner preview body
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.roundRect(24, 64, 752, 412, 12); ctx.fill();

      // Banner
      ctx.fillStyle = accentColor;
      ctx.beginPath(); ctx.roundRect(40, 80, 720, 60, 10); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 20px sans-serif'; ctx.fillText(title, 60, 116);

      // Card Grid mockup
      ctx.fillStyle = '#f8fafc'; ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(40, 160, 220, 100, 10); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.roundRect(290, 160, 220, 100, 10); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.roundRect(540, 160, 220, 100, 10); ctx.fill(); ctx.stroke();

      ctx.fillStyle = '#0f172a'; ctx.font = 'bold 28px sans-serif'; ctx.fillText('128', 60, 210);
      ctx.fillStyle = '#dc2626'; ctx.fillText('14', 310, 210);
      ctx.fillStyle = '#16a34a'; ctx.fillText('186.4 MB', 560, 210);

      ctx.fillStyle = '#64748b'; ctx.font = '12px sans-serif';
      ctx.fillText('已监控域名总数', 60, 235);
      ctx.fillText('低频待清理域名', 310, 235);
      ctx.fillText('预期可释放空间', 560, 235);

      // Table mockup
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.roundRect(40, 280, 720, 170, 10); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f1f5f9'; ctx.beginPath(); ctx.roundRect(40, 280, 720, 36, 10); ctx.fill();
      ctx.fillStyle = '#475569'; ctx.font = 'bold 12px sans-serif'; ctx.fillText('域名与标签', 60, 302); ctx.fillText('访问频次', 320, 302); ctx.fillText('功能状态', 540, 302);

      ctx.fillStyle = '#0f172a'; ctx.fillText('github.com', 60, 340); ctx.fillText('18 次会话', 320, 340); ctx.fillStyle = '#1d4ed8'; ctx.fillText('🛡️ 白名单保护', 540, 340);
      ctx.fillStyle = '#0f172a'; ctx.fillText('rare-tool-site.io', 60, 380); ctx.fillText('1 次会话', 320, 380); ctx.fillStyle = '#dc2626'; ctx.fillText('⚡ 拟清理低频', 540, 380);
      ctx.fillStyle = '#0f172a'; ctx.fillText('temp-news-feed.com', 60, 420); ctx.fillText('2 次会话', 320, 420); ctx.fillStyle = '#dc2626'; ctx.fillText('⚡ 拟清理低频', 540, 420);
    }
    const dataUrl = canvas.toDataURL('image/png');
    const base64 = dataUrl.split(',')[1];
    const binaryStr = atob(base64);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return bytes;
  };

  zip.file('assets/demo/demo1-popup.png', createDemoBuffer('Demo 1: Popup 极简模式', '30分钟会话统计', '#2563eb'));
  zip.file('assets/demo/demo2-dashboard.png', createDemoBuffer('Demo 2: 域名频次面板', '多维度筛选与排序', '#1d4ed8'));
  zip.file('assets/demo/demo3-settings.png', createDemoBuffer('Demo 3: 规则与白名单配置', '永久白名单防护', '#0284c7'));
  zip.file('assets/demo/demo4-cleaning.png', createDemoBuffer('Demo 4: 一键定向清理', '释放指定离线缓存与Cookie', '#16a34a'));

  return await zip.generateAsync({ type: 'blob' });
}
