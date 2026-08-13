document.addEventListener('DOMContentLoaded', () => {
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
      return `
        <div class="bucket-card ${isTarget ? 'target' : ''}">
          <div class="b-label">${lbl}</div>
          <div class="b-num">${cnt} <span style="font-size:10px; font-weight:normal; color:#94a3b8;">个</span></div>
        </div>
      `;
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
      tableBody.innerHTML = `<tr><td colSpan="7" style="text-align:center; padding: 40px; color:#94a3b8;">没有找到符合条件的域名数据</td></tr>`;
      selectAllCheck.checked = false;
      return;
    }

    tableBody.innerHTML = filteredDomains.map(d => {
      const isWhite = whitelist.includes(d.domain);
      const isLow = d.count < currentThreshold;
      const isCleanCandidate = isLow && !isWhite;
      const isChecked = selectedDomainsSet.has(d.domain);
      const initialLetter = d.domain.charAt(0).toUpperCase();

      return `
        <tr class="${isCleanCandidate ? 'low-freq-row' : ''}">
          <td style="text-align: center;">
            <input type="checkbox" class="row-check" data-domain="${d.domain}" ${isChecked ? 'checked' : ''}>
          </td>
          <td>
            <div class="domain-cell">
              <div class="avatar">${initialLetter}</div>
              <div>
                <div style="display:flex; align-items:center; gap: 6px;">
                  <span class="domain-title">${d.domain}</span>
                  ${isCleanCandidate ? '<span class="badge badge-low">⚡ 拟清理低频</span>' : ''}
                  ${isWhite ? '<span class="badge badge-white">🛡️ 白名单</span>' : ''}
                </div>
                ${d.notes ? `<div class="domain-sub">${d.notes}</div>` : ''}
              </div>
            </div>
          </td>
          <td>
            <div class="visit-pill">
              <span style="color: ${isCleanCandidate ? '#dc2626' : '#2563eb'}; font-weight:800;">${d.count}</span>
              <span style="font-size:10px; font-weight:normal; color:#64748b;">次会话</span>
            </div>
          </td>
          <td style="color: #64748b;">${formatTimeAgo(d.lastActiveTime)}</td>
          <td>
            <div style="font-weight:700; color:#0f172a;">${d.estimatedStorageMB.toFixed(1)} MB</div>
            <div class="data-pills">
              <span class="data-pill">Cache</span>
              <span class="data-pill">Cookie</span>
              <span class="data-pill">Storage</span>
            </div>
          </td>
          <td>
            <button class="action-btn toggle-white-btn" data-domain="${d.domain}">
              ${isWhite ? '🛡️ 已保护' : '🛡️ 设为保护'}
            </button>
          </td>
          <td style="text-align: right;">
            <button class="action-btn danger clean-single-btn" data-domain="${d.domain}">
              清理此数据
            </button>
          </td>
        </tr>
      `;
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
        if (confirm(`确定要清理 ${domain} 的本地缓存与 Cookie 吗？`)) {
          cleanDomainData([domain]);
        }
      });
    });
  }

  function renderWhitelist() {
    whitelistContainer.innerHTML = whitelist.map(d => `
      <div class="tag">
        <span>${d}</span>
        <span class="remove" data-domain="${d}">&times;</span>
      </div>
    `).join('');

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

    if (confirm(`确定要清理这 ${targets.length} 个域名的所有缓存与 Cookie 吗？`)) {
      cleanDomainData(targets);
    }
  });

  function cleanDomainData(domainsToClean) {
    if (chrome.browsingData && chrome.browsingData.remove) {
      const origins = domainsToClean.map(d => `http://${d}`).concat(domainsToClean.map(d => `https://${d}`));
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
      alert(`已成功清理 ${cleanedDomains.length} 个域名的缓存与本地数据！`);
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
        timeWindowDays: 30
      },
      whitelist: whitelist
    }, () => {
      alert('系统配置与清理规则已成功保存！');
    });
  });

  loadData();
});
