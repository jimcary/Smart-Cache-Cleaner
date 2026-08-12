import React from 'react';
import pluginIcon from '../assets/images/app_icon_1786511663317.jpg';
import {
  ShieldCheck,
  Zap,
  Download,
  Settings,
  Clock,
  RotateCcw,
  LayoutDashboard,
  Compass,
  Code2,
  Trash2,
} from 'lucide-react';

interface NavbarProps {
  activeTab: 'dashboard' | 'simulator' | 'popup' | 'whitelist' | 'code';
  setActiveTab: (tab: 'dashboard' | 'simulator' | 'popup' | 'whitelist' | 'code') => void;
  lowFrequencyCount: number;
  totalStorageMB: number;
  onOpenQuickClean: () => void;
  onResetData: () => void;
  onDownloadZip: () => void;
  virtualTimeFormatted: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  lowFrequencyCount,
  totalStorageMB,
  onOpenQuickClean,
  onResetData,
  onDownloadZip,
  virtualTimeFormatted,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-blue-500/20 border border-blue-400/30 flex-shrink-0 bg-slate-800">
              <img
                src={pluginIcon}
                alt="Smart Cache Cleaner Icon"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-bold text-lg tracking-tight text-white">智能缓存清理</h1>
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Smart Cache Cleaner
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                按会话间隔(30分钟)自动统计频次 · 智能清理低频域名缓存与Cookie
              </p>
            </div>
          </div>

          {/* Clock & Status info */}
          <div className="hidden lg:flex items-center space-x-4 text-xs text-slate-300 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/50">
            <div className="flex items-center space-x-1.5 text-slate-400">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>当前模拟时间:</span>
              <span className="font-mono text-indigo-300 font-medium">{virtualTimeFormatted}</span>
            </div>
            <div className="h-3 w-px bg-slate-700" />
            <div className="flex items-center space-x-1.5 text-rose-400">
              <span className="font-semibold">{lowFrequencyCount}</span>
              <span className="text-slate-400">个低频待清理</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onOpenQuickClean}
              disabled={lowFrequencyCount === 0}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                lowFrequencyCount > 0
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20 animate-pulse'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>一键清理 ({lowFrequencyCount})</span>
            </button>

            <button
              onClick={onDownloadZip}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">下载 Chrome 插件(.zip)</span>
              <span className="sm:hidden">下载</span>
            </button>

            <button
              onClick={onResetData}
              title="重置测试数据"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 overflow-x-auto py-1 scrollbar-none border-t border-slate-800/80">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>域名频次面板</span>
          </button>

          <button
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              activeTab === 'simulator'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>会话模拟器 & 时间推演</span>
          </button>

          <button
            onClick={() => setActiveTab('popup')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              activeTab === 'popup'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>插件 Popover 实操展示</span>
          </button>

          <button
            onClick={() => setActiveTab('whitelist')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              activeTab === 'whitelist'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>白名单保护</span>
          </button>

          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              activeTab === 'code'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>Manifest V3 源码 & 导出一键安装包</span>
          </button>
        </div>
      </div>
    </header>
  );
};
