import React, { useState, useEffect, useTransition } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { SimulatorControlPanel } from './components/SimulatorControlPanel';
import { PopupSimulator } from './components/PopupSimulator';
import { CleanPreviewModal } from './components/CleanPreviewModal';
import { WhitelistManager } from './components/WhitelistManager';
import { ExtensionCodeViewer } from './components/ExtensionCodeViewer';

import { DomainStat, SessionConfig, CleanerSettings, SimulatedVisitEvent } from './types/extension';
import {
  getDomainStats,
  saveDomainStats,
  getSessionConfig,
  saveSessionConfig,
  getCleanerSettings,
  saveCleanerSettings,
  getVirtualTimeOffset,
  setVirtualTimeOffset,
  getCurrentSimulatedTime,
  recordDomainVisitInSimulator,
  executeCleanDomains,
  getSimulatedVisitLogs,
  resetAllDataToDefault,
  isDomainWhitelisted,
} from './utils/storageHelper';
import { downloadExtensionZip } from './utils/extensionCodeGenerator';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'simulator' | 'popup' | 'whitelist' | 'code'>('dashboard');

  // Core States
  const [stats, setStats] = useState<DomainStat[]>([]);
  const [config, setConfig] = useState<SessionConfig>(getSessionConfig());
  const [settings, setSettings] = useState<CleanerSettings>(getCleanerSettings());
  const [simLogs, setSimLogs] = useState<SimulatedVisitEvent[]>([]);
  const [virtualTimeOffset, setVirtualTimeOffsetState] = useState<number>(getVirtualTimeOffset());

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetCleanDomains, setTargetCleanDomains] = useState<DomainStat[]>([]);

  // Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync state on load
  useEffect(() => {
    refreshAllData();
  }, []);

  const refreshAllData = () => {
    setStats(getDomainStats());
    setConfig(getSessionConfig());
    setSettings(getCleanerSettings());
    setSimLogs(getSimulatedVisitLogs());
    setVirtualTimeOffsetState(getVirtualTimeOffset());
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Virtual time formatted
  const currentTimeMs = Date.now() + virtualTimeOffset;
  const virtualTimeFormatted = new Date(currentTimeMs).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  // Whitelist items
  const whitelist = stats.filter((s) => s.isWhitelisted).map((s) => s.domain);

  // Handle updating config
  const handleUpdateConfig = (newConfig: SessionConfig) => {
    setConfig(newConfig);
    saveSessionConfig(newConfig);
    showToast(`配置已保存: 会话间隔 ${newConfig.sessionTimeoutMinutes} 分钟`);
  };

  // Handle toggling whitelist
  const handleToggleWhitelist = (domain: string) => {
    const updated = stats.map((s) => {
      if (s.domain === domain) {
        return { ...s, isWhitelisted: !s.isWhitelisted };
      }
      return s;
    });
    setStats(updated);
    saveDomainStats(updated);
    showToast(`域名 ${domain} 白名单状态已更新`);
  };

  // Handle adding new whitelist domain (supports batch comma/space/newline separated input)
  const handleAddWhitelist = (domainInput: string) => {
    const rawTokens = domainInput.split(/[,，;\r\n\s]+/);
    const domainsToAdd = Array.from(
      new Set(
        rawTokens
          .map((d) => d.trim().toLowerCase().replace(/^https?:\/\//i, '').replace(/\/.*$/, ''))
          .filter((d) => d.length > 0)
      )
    );

    if (domainsToAdd.length === 0) return;

    let updated = [...stats];

    domainsToAdd.forEach((domain) => {
      let exists = false;
      updated = updated.map((s) => {
        if (s.domain === domain) {
          exists = true;
          return { ...s, isWhitelisted: true };
        }
        return s;
      });

      if (!exists) {
        updated.push({
          domain,
          count: 0,
          lastActiveTime: currentTimeMs,
          firstVisited: currentTimeMs,
          estimatedStorageMB: 5.0,
          dataTypes: { cache: true, cookies: true, localStorage: true, indexedDB: false, serviceWorkers: false },
          isWhitelisted: true,
          category: 'other',
        });
      }
    });

    setStats(updated);
    saveDomainStats(updated);

    if (domainsToAdd.length === 1) {
      showToast(`已成功将 ${domainsToAdd[0]} 加入受保护白名单`);
    } else {
      showToast(`已成功将 ${domainsToAdd.length} 个域名批量加入受保护白名单`);
    }
  };

  // Handle single domain clean
  const handleSingleClean = (domain: string) => {
    const item = stats.find((s) => s.domain === domain);
    if (item) {
      setTargetCleanDomains([item]);
      setIsModalOpen(true);
    }
  };

  // Handle batch clean open
  const handleOpenBatchClean = (domainNames: string[]) => {
    const matches = stats.filter((s) => domainNames.includes(s.domain));
    setTargetCleanDomains(matches);
    setIsModalOpen(true);
  };

  // Confirm execution of clean
  const handleConfirmClean = (selectedDomains: string[], customSettings: CleanerSettings) => {
    const res = executeCleanDomains(selectedDomains, customSettings);
    refreshAllData();
    showToast(`清理成功！已移除 ${res.cleanedCount} 个低频域名数据，共释放 ${res.freedMB} MB 空间`);
  };

  // Simulate tab visit
  const handleSimulateVisit = (domain: string) => {
    const res = recordDomainVisitInSimulator(domain);
    refreshAllData();

    if (res.outcome === 'NEW_SESSION') {
      showToast(`⚡ 域名 ${domain} 触发新独立会话！当前频次: ${res.stat.count} 次`);
    } else {
      showToast(`域名 ${domain} 活跃时间已刷新 (30分钟内再次访问，不增加频次)`);
    }
  };

  // Fast forward time
  const handleFastForwardTime = (minutes: number) => {
    const additionMs = minutes * 60 * 1000;
    const newOffset = virtualTimeOffset + additionMs;
    setVirtualTimeOffset(newOffset);
    setVirtualTimeOffsetState(newOffset);
    showToast(`模拟时间已快进 +${minutes} 分钟`);
  };

  // Reset virtual time
  const handleResetTime = () => {
    setVirtualTimeOffset(0);
    setVirtualTimeOffsetState(0);
    showToast('虚拟模拟时钟已重置为当前系统时间');
  };

  // Reset all data
  const handleResetAllData = () => {
    resetAllDataToDefault();
    refreshAllData();
    showToast('所有测试数据与历史记录已重置');
  };

  // Download Extension ZIP
  const handleDownloadZip = async () => {
    try {
      const blob = await downloadExtensionZip(config, settings, whitelist);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'smart-cache-cleaner-extension.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Chrome 插件扩展包 (.zip) 下载成功！');
    } catch (e) {
      console.error(e);
    }
  };

  const lowFrequencyTargets = stats.filter((s) => s.count < config.thresholdCount && !isDomainWhitelisted(s.domain, whitelist));
  const totalStorageMB = stats.reduce((acc, curr) => acc + curr.estimatedStorageMB, 0);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      {/* Toast Popup Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center space-x-2 animate-bounce">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Main Top Header Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        lowFrequencyCount={lowFrequencyTargets.length}
        totalStorageMB={totalStorageMB}
        onOpenQuickClean={() => handleOpenBatchClean(lowFrequencyTargets.map((t) => t.domain))}
        onResetData={handleResetAllData}
        onDownloadZip={handleDownloadZip}
        virtualTimeFormatted={virtualTimeFormatted}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <DashboardView
            stats={stats}
            config={config}
            onUpdateConfig={handleUpdateConfig}
            onToggleWhitelist={handleToggleWhitelist}
            onSingleClean={handleSingleClean}
            onOpenBatchClean={handleOpenBatchClean}
            virtualTime={currentTimeMs}
          />
        )}

        {activeTab === 'simulator' && (
          <SimulatorControlPanel
            stats={stats}
            config={config}
            simLogs={simLogs}
            virtualTimeFormatted={virtualTimeFormatted}
            onSimulateVisit={handleSimulateVisit}
            onFastForwardTime={handleFastForwardTime}
            onResetTime={handleResetTime}
          />
        )}

        {activeTab === 'popup' && (
          <PopupSimulator
            stats={stats}
            config={config}
            settings={settings}
            onUpdateConfig={handleUpdateConfig}
            onExecuteClean={(selected) => handleOpenBatchClean(selected)}
            onNavigateToOptions={() => setActiveTab('whitelist')}
          />
        )}

        {activeTab === 'whitelist' && (
          <WhitelistManager
            stats={stats}
            whitelist={whitelist}
            onToggleWhitelist={handleToggleWhitelist}
            onAddWhitelist={handleAddWhitelist}
          />
        )}

        {activeTab === 'code' && (
          <ExtensionCodeViewer config={config} settings={settings} whitelist={whitelist} />
        )}
      </main>

      {/* Clean Confirmation Modal */}
      <CleanPreviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        targetDomains={targetCleanDomains}
        settings={settings}
        onConfirmClean={handleConfirmClean}
      />

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 text-xs py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-2">
          <div>
            <span className="font-bold text-white">智能缓存清理 (Smart Cache Cleaner)</span> — 基于会话间隔 (30分钟) 自动统计访问频次的 Chrome 扩展插件
          </div>
          <div className="text-slate-500">
            Powered by Manifest V3 & BrowsingData API
          </div>
        </div>
      </footer>
    </div>
  );
}
