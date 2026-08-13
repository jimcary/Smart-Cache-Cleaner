// Popup JavaScript Logic
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
    domainListEl.innerHTML = currentTargets.map(item => `
      <div class="domain-item">
        <div class="domain-info">
          <input type="checkbox" checked data-domain="${item.domain}" class="domain-check">
          <span class="domain-name" title="${item.domain}">${item.domain}</span>
        </div>
        <span class="visit-badge">${item.count} 次访问</span>
      </div>
    `).join('');
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
