import React, { useState } from 'react';
import { DomainStat, CleanerSettings } from '../types/extension';
import {
  X,
  Trash2,
  CheckCircle2,
  HardDrive,
  Check,
  AlertTriangle,
  Loader2,
  ShieldAlert,
} from 'lucide-react';

interface CleanPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetDomains: DomainStat[];
  settings: CleanerSettings;
  onConfirmClean: (selectedDomainNames: string[], customSettings: CleanerSettings) => void;
}

export const CleanPreviewModal: React.FC<CleanPreviewModalProps> = ({
  isOpen,
  onClose,
  targetDomains,
  settings,
  onConfirmClean,
}) => {
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [cleanSettings, setCleanSettings] = useState<CleanerSettings>(settings);
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');

  React.useEffect(() => {
    setSelectedDomains(targetDomains.map((t) => t.domain));
  }, [targetDomains]);

  if (!isOpen) return null;

  const totalFreedMB = targetDomains
    .filter((t) => selectedDomains.includes(t.domain))
    .reduce((acc, curr) => acc + curr.estimatedStorageMB, 0);

  const toggleDomain = (domain: string) => {
    if (selectedDomains.includes(domain)) {
      setSelectedDomains(selectedDomains.filter((d) => d !== domain));
    } else {
      setSelectedDomains([...selectedDomains, domain]);
    }
  };

  const handleCleanSubmit = async () => {
    if (selectedDomains.length === 0) return;
    setIsExecuting(true);

    setCurrentStep('1/3: 正在构建目标 Origin 域名列表...');
    await new Promise((r) => setTimeout(r, 600));

    setCurrentStep('2/3: 正在调用 chrome.browsingData.remove 清除 Cookie & 缓存...');
    await new Promise((r) => setTimeout(r, 800));

    setCurrentStep('3/3: 正在更新索引数据库并刷新统计数值...');
    await new Promise((r) => setTimeout(r, 600));

    onConfirmClean(selectedDomains, cleanSettings);
    setIsExecuting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-600/20">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">低频域名定向数据清理确认</h3>
              <p className="text-xs text-rose-600 font-medium mt-0.5">
                即将清理 {selectedDomains.length} 个低频访问域名的数据，预计可释放{' '}
                <span className="font-bold">{totalFreedMB.toFixed(1)} MB</span> 空间
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isExecuting}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Data types selections */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700">选择要清除的数据类型 (BrowsingData API):</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <label className="flex items-center space-x-2 text-xs text-slate-700 font-medium bg-slate-50 p-2.5 rounded-xl border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cleanSettings.cleanCache}
                  onChange={(e) => setCleanSettings({ ...cleanSettings, cleanCache: e.target.checked })}
                  className="rounded text-rose-600 accent-rose-600"
                />
                <span>页面缓存 (Cache)</span>
              </label>

              <label className="flex items-center space-x-2 text-xs text-slate-700 font-medium bg-slate-50 p-2.5 rounded-xl border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cleanSettings.cleanCookies}
                  onChange={(e) => setCleanSettings({ ...cleanSettings, cleanCookies: e.target.checked })}
                  className="rounded text-rose-600 accent-rose-600"
                />
                <span>Cookies 登录凭证</span>
              </label>

              <label className="flex items-center space-x-2 text-xs text-slate-700 font-medium bg-slate-50 p-2.5 rounded-xl border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cleanSettings.cleanLocalStorage}
                  onChange={(e) => setCleanSettings({ ...cleanSettings, cleanLocalStorage: e.target.checked })}
                  className="rounded text-rose-600 accent-rose-600"
                />
                <span>LocalStorage 存储</span>
              </label>

              <label className="flex items-center space-x-2 text-xs text-slate-700 font-medium bg-slate-50 p-2.5 rounded-xl border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cleanSettings.cleanIndexedDB}
                  onChange={(e) => setCleanSettings({ ...cleanSettings, cleanIndexedDB: e.target.checked })}
                  className="rounded text-rose-600 accent-rose-600"
                />
                <span>IndexedDB 数据库</span>
              </label>

              <label className="flex items-center space-x-2 text-xs text-slate-700 font-medium bg-slate-50 p-2.5 rounded-xl border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cleanSettings.cleanServiceWorkers}
                  onChange={(e) => setCleanSettings({ ...cleanSettings, cleanServiceWorkers: e.target.checked })}
                  className="rounded text-rose-600 accent-rose-600"
                />
                <span>Service Workers 离线</span>
              </label>
            </div>
          </div>

          {/* Domain Selection Checklist */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-bold text-slate-700">
              <span>待清理域名列表 ({selectedDomains.length}/{targetDomains.length}):</span>
              <button
                onClick={() =>
                  setSelectedDomains(
                    selectedDomains.length === targetDomains.length ? [] : targetDomains.map((t) => t.domain)
                  )
                }
                className="text-blue-600 hover:text-blue-700"
              >
                {selectedDomains.length === targetDomains.length ? '取消全选' : '全选'}
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 max-h-[200px] overflow-y-auto space-y-1">
              {targetDomains.map((item) => {
                const isSelected = selectedDomains.includes(item.domain);
                return (
                  <label
                    key={item.domain}
                    className="flex items-center justify-between p-2 hover:bg-white rounded-lg cursor-pointer text-xs transition-colors"
                  >
                    <div className="flex items-center space-x-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleDomain(item.domain)}
                        className="rounded text-rose-600 accent-rose-600"
                      />
                      <span className="font-semibold text-slate-800">{item.domain}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-slate-500">
                      <span className="bg-slate-200/60 px-2 py-0.5 rounded text-[10px] font-bold">
                        {item.count} 次访问
                      </span>
                      <span className="font-medium text-[11px]">{item.estimatedStorageMB} MB</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Execution Progress Bar */}
          {isExecuting && (
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2 text-center">
              <div className="flex items-center justify-center space-x-2 text-indigo-800 font-bold text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                <span>正在执行浏览数据清理...</span>
              </div>
              <p className="text-xs text-indigo-600 font-mono">{currentStep}</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={isExecuting}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleCleanSubmit}
            disabled={isExecuting || selectedDomains.length === 0}
            className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-600/20 flex items-center space-x-1.5"
          >
            <Trash2 className="w-4 h-4" />
            <span>确认执行清理 ({selectedDomains.length} 个)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
