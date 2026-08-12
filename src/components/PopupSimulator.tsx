import React, { useState, useMemo } from 'react';
import pluginIcon from '../assets/images/app_icon_1786511663317.jpg';
import { DomainStat, SessionConfig, CleanerSettings } from '../types/extension';
import {
  Settings,
  Sparkles,
  Trash2,
  CheckSquare,
  Square,
  Shield,
  Layers,
  HardDrive,
  Info,
  Sliders,
  Maximize2,
} from 'lucide-react';

interface PopupSimulatorProps {
  stats: DomainStat[];
  config: SessionConfig;
  settings: CleanerSettings;
  onUpdateConfig: (newConfig: SessionConfig) => void;
  onExecuteClean: (selectedDomains: string[]) => void;
  onNavigateToOptions: () => void;
}

export const PopupSimulator: React.FC<PopupSimulatorProps> = ({
  stats,
  config,
  settings,
  onUpdateConfig,
  onExecuteClean,
  onNavigateToOptions,
}) => {
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);

  // Filter low frequency target domains based on config.thresholdCount
  const targetDomains = useMemo(() => {
    return stats.filter((s) => s.count < config.thresholdCount && !s.isWhitelisted);
  }, [stats, config.thresholdCount]);

  // Sync selected domains when targetDomains change
  React.useEffect(() => {
    setSelectedDomains(targetDomains.map((t) => t.domain));
  }, [targetDomains]);

  const totalFreedMB = useMemo(() => {
    return selectedDomains.reduce((acc, domain) => {
      const item = stats.find((s) => s.domain === domain);
      return acc + (item ? item.estimatedStorageMB : 0);
    }, 0);
  }, [selectedDomains, stats]);

  const toggleSelectDomain = (domain: string) => {
    if (selectedDomains.includes(domain)) {
      setSelectedDomains(selectedDomains.filter((d) => d !== domain));
    } else {
      setSelectedDomains([...selectedDomains, domain]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedDomains.length === targetDomains.length) {
      setSelectedDomains([]);
    } else {
      setSelectedDomains(targetDomains.map((t) => t.domain));
    }
  };

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-600" />
            <span>Chrome 扩展 Popup 交互效果演示</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            模拟用户点击浏览器右上角插件图标展开的 Popover 窗口。支持直接拖动滑块、按全选/多选预览待清理对象。
          </p>
        </div>
        <button
          onClick={onNavigateToOptions}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 self-start md:self-auto"
        >
          <Settings className="w-4 h-4 text-slate-500" />
          <span>打开高级设置 (Options Page)</span>
        </button>
      </div>

      {/* Simulator Container */}
      <div className="flex justify-center py-4">
        {/* Mock Extension Window Frame */}
        <div className="w-full max-w-[420px] bg-slate-50 border border-slate-300 rounded-2xl shadow-2xl overflow-hidden text-slate-800">
          {/* Top Extension Popup Bar Header */}
          <div className="bg-slate-900 text-white p-3.5 px-4 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-lg overflow-hidden border border-blue-400/30 shadow-md flex-shrink-0 bg-slate-800">
                <img
                  src={pluginIcon}
                  alt="Plugin Icon"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <h3 className="font-bold text-xs text-white">智能缓存清理</h3>
                <p className="text-[10px] text-slate-400">Smart Cache Cleaner v1.0.0</p>
              </div>
            </div>

            <button
              onClick={onNavigateToOptions}
              className="text-xs text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
              title="打开选项设置"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

          {/* Popup Content Body */}
          <div className="p-4 space-y-3">
            {/* Threshold Slider Card */}
            <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700">清理阈值 (访问次数 &lt;)</span>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 font-bold rounded-full text-xs border border-blue-200">
                  {config.thresholdCount} 次
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={config.thresholdCount}
                onChange={(e) => onUpdateConfig({ ...config, thresholdCount: parseInt(e.target.value, 10) })}
                className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-100 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>1次 (极低)</span>
                <span>5次</span>
                <span>10次 (高频)</span>
              </div>
            </div>

            {/* Quick KPI Row */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white p-2 rounded-xl border border-slate-200">
                <div className="text-xs font-bold text-slate-800">{stats.length}</div>
                <div className="text-[10px] text-slate-400">总计域名</div>
              </div>
              <div className="bg-rose-50 p-2 rounded-xl border border-rose-200">
                <div className="text-xs font-bold text-rose-600">{targetDomains.length}</div>
                <div className="text-[10px] text-rose-500">待清理低频</div>
              </div>
              <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                <div className="text-xs font-bold text-emerald-700">{totalFreedMB.toFixed(1)} MB</div>
                <div className="text-[10px] text-emerald-600">选择空间</div>
              </div>
            </div>

            {/* Target List Preview Header */}
            <div className="flex justify-between items-center text-[11px] font-semibold text-slate-500 pt-1">
              <span>待清理列表预览 ({targetDomains.length})</span>
              <button
                onClick={toggleSelectAll}
                className="text-blue-600 hover:text-blue-700 font-bold"
              >
                {selectedDomains.length === targetDomains.length ? '取消全选' : '全选'}
              </button>
            </div>

            {/* Target Domain List Scrollable Area */}
            <div className="bg-white border border-slate-200 rounded-xl max-h-[220px] overflow-y-auto divide-y divide-slate-100">
              {targetDomains.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  🎉 没有低于此访问频次的待清理域名
                </div>
              ) : (
                targetDomains.map((item) => {
                  const isChecked = selectedDomains.includes(item.domain);
                  return (
                    <div
                      key={item.domain}
                      onClick={() => toggleSelectDomain(item.domain)}
                      className="p-2.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center space-x-2 overflow-hidden">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300 flex-shrink-0" />
                        )}
                        <span className="text-xs font-semibold text-slate-800 truncate max-w-[170px]">
                          {item.domain}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1.5 flex-shrink-0">
                        <span className="text-[10px] font-medium px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                          {item.count}次
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500">
                          {item.estimatedStorageMB}MB
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Clean Execution Button */}
            <button
              onClick={() => onExecuteClean(selectedDomains)}
              disabled={selectedDomains.length === 0}
              className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center space-x-2 ${
                selectedDomains.length > 0
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              <span>一键定向清理这 {selectedDomains.length} 个域名数据</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
