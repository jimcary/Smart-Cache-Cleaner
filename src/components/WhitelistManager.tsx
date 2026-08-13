import React, { useState } from 'react';
import { DomainStat } from '../types/extension';
import {
  ShieldCheck,
  Plus,
  Trash2,
  CheckCircle2,
  Search,
  Sparkles,
  Lock,
  Globe,
  AlertCircle,
} from 'lucide-react';

interface WhitelistManagerProps {
  stats: DomainStat[];
  whitelist: string[];
  onToggleWhitelist: (domain: string) => void;
  onAddWhitelist: (domain: string) => void;
}

export const WhitelistManager: React.FC<WhitelistManagerProps> = ({
  stats,
  whitelist,
  onToggleWhitelist,
  onAddWhitelist,
}) => {
  const [newDomain, setNewDomain] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  const RECOMMENDED_PRESETS = [
    { label: 'Google Search', domain: 'google.com' },
    { label: 'GitHub Dev', domain: 'github.com' },
    { label: 'StackOverflow', domain: 'stackoverflow.com' },
    { label: 'Bilibili 视频', domain: 'bilibili.com' },
    { label: 'Taobao 淘宝', domain: 'taobao.com' },
    { label: 'V2EX 社区', domain: 'v2ex.com' },
  ];

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newDomain.trim()) {
      onAddWhitelist(newDomain.trim());
      setNewDomain('');
    }
  };

  const filteredWhitelist = whitelist.filter((d) => d.toLowerCase().includes(searchFilter.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* Whitelist Banner Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <span>域名受保护白名单管理 (Whitelist Protection)</span>
          </h2>
          <p className="text-xs text-slate-500">
            加入白名单的域名将受到永久高优先级保护。无论其访问频次多低或多久未打开，清理引擎都将自动跳过。
          </p>
        </div>

        <div className="flex items-center space-x-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-xl text-xs font-semibold border border-blue-200 self-start md:self-auto">
          <Lock className="w-4 h-4" />
          <span>当前已保护 {whitelist.length} 个域名</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Add New & Recommended Presets */}
        <div className="space-y-6">
          {/* Add custom domain form */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-600" />
              <span>手动添加保护域名</span>
            </h3>

            <form onSubmit={handleAddSubmit} className="space-y-3">
              <textarea
                rows={3}
                placeholder="例如: github.com, google.com， stackoverflow.com&#10;支持以英文逗号 (,)、中文逗号 (，)、分号、空格或换行批量输入"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>支持逗号/分号/换行批量输入</span>
                <button
                  type="submit"
                  disabled={!newDomain.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-blue-600/20"
                >
                  批量加入白名单
                </button>
              </div>
            </form>
          </div>

          {/* Preset Recommendations */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>常见常用网站一键加入白名单</span>
            </h3>

            <div className="space-y-1.5">
              {RECOMMENDED_PRESETS.map((p) => {
                const isAlreadyWhitelisted = whitelist.includes(p.domain);
                return (
                  <div
                    key={p.domain}
                    className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-800">{p.label}</div>
                      <div className="text-[10px] text-slate-400">{p.domain}</div>
                    </div>
                    <button
                      onClick={() => onToggleWhitelist(p.domain)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                        isAlreadyWhitelisted
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {isAlreadyWhitelisted ? '已保护' : '+ 添加保护'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Whitelist Table / Badges */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">已白名单域名列表 ({whitelist.length})</h3>

              <div className="relative max-w-xs w-full">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="过滤白名单..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {filteredWhitelist.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                尚未包含匹配的白名单域名
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {filteredWhitelist.map((domain) => {
                  const matchingStat = stats.find((s) => s.domain === domain);
                  return (
                    <div
                      key={domain}
                      className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between hover:bg-slate-100/60 transition-colors"
                    >
                      <div className="flex items-center space-x-2.5 overflow-hidden">
                        <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                          <Globe className="w-3.5 h-3.5" />
                        </div>
                        <div className="truncate">
                          <div className="font-semibold text-slate-900 text-xs truncate">{domain}</div>
                          <div className="text-[10px] text-slate-400">
                            {matchingStat ? `当前记录 ${matchingStat.count} 次访问` : '主动保护域名'}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => onToggleWhitelist(domain)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors ml-2"
                        title="移出白名单"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
