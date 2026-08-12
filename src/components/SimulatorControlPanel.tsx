import React, { useState } from 'react';
import { DomainStat, SessionConfig, SimulatedVisitEvent } from '../types/extension';
import {
  Globe,
  FastForward,
  Clock,
  CheckCircle,
  AlertTriangle,
  Play,
  History,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Info,
} from 'lucide-react';

interface SimulatorControlPanelProps {
  stats: DomainStat[];
  config: SessionConfig;
  simLogs: SimulatedVisitEvent[];
  virtualTimeFormatted: string;
  onSimulateVisit: (domain: string) => void;
  onFastForwardTime: (minutes: number) => void;
  onResetTime: () => void;
}

export const SimulatorControlPanel: React.FC<SimulatorControlPanelProps> = ({
  stats,
  config,
  simLogs,
  virtualTimeFormatted,
  onSimulateVisit,
  onFastForwardTime,
  onResetTime,
}) => {
  const [customDomain, setCustomDomain] = useState('');

  const PRESET_DOMAINS = [
    { label: 'GitHub (开发者)', domain: 'github.com' },
    { label: '冷门文章博客', domain: 'rare-tech-blog.org' },
    { label: '一次性PDF压缩工具', domain: 'temp-pdf-compress.net' },
    { label: '促销落地页', domain: 'promo-landing.xyz' },
    { label: 'Google 搜索', domain: 'google.com' },
    { label: 'StackOverflow', domain: 'stackoverflow.com' },
  ];

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customDomain.trim()) {
      onSimulateVisit(customDomain.trim());
      setCustomDomain('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Introduction Card */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>算法实时验证控制台</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            会话超时 (Session Timeout) 访问频次推演器
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            验证按 <strong>30分钟（或自定义间隔）</strong> 判断独立会话的算法：若两次访问间隔小于30分钟，会话保持激活（<span className="text-emerald-400 font-semibold">不增加频次</span>）；当模拟快进超过30分钟后再打开，将正确触发 <span className="text-amber-400 font-semibold">+1 独立访问频次</span>。
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Virtual Clock & Simulation Inputs */}
        <div className="space-y-6">
          {/* Virtual Time Clock Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span>虚拟模拟时钟</span>
              </h3>
              <button
                onClick={onResetTime}
                className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 font-medium"
              >
                <RotateCcw className="w-3 h-3" /> 重置时间
              </button>
            </div>

            <div className="bg-slate-900 text-white p-4 rounded-xl text-center space-y-1 shadow-inner">
              <div className="text-[11px] text-slate-400 font-medium">当前推演时间</div>
              <div className="text-xl font-mono font-bold text-indigo-300">{virtualTimeFormatted}</div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <FastForward className="w-3.5 h-3.5 text-blue-600" />
                <span>快进模拟时间 (测试超时机制):</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onFastForwardTime(10)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium border border-slate-200 transition-colors"
                >
                  +10 分钟 <span className="text-[10px] text-slate-400 block">&lt; 30m (同一会话)</span>
                </button>
                <button
                  onClick={() => onFastForwardTime(35)}
                  className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold border border-indigo-200 transition-colors"
                >
                  +35 分钟 <span className="text-[10px] text-indigo-500 block">&gt; 30m (触发新会话)</span>
                </button>
                <button
                  onClick={() => onFastForwardTime(120)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium border border-slate-200 transition-colors"
                >
                  +2 小时
                </button>
                <button
                  onClick={() => onFastForwardTime(1440)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium border border-slate-200 transition-colors"
                >
                  +1 天 (24h)
                </button>
              </div>
            </div>
          </div>

          {/* Trigger Domain Visit Form */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-600" />
              <span>触发标签页访问模拟</span>
            </h3>

            <form onSubmit={handleCustomSubmit} className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="输入任意域名, 如 rare-tool.org"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/20 flex items-center gap-1"
                >
                  <Play className="w-3.5 h-3.5 fill-current" /> 访问
                </button>
              </div>
            </form>

            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <label className="text-xs font-semibold text-slate-500">点击快捷访问预设示例域名:</label>
              <div className="space-y-1.5">
                {PRESET_DOMAINS.map((p) => (
                  <button
                    key={p.domain}
                    onClick={() => onSimulateVisit(p.domain)}
                    className="w-full flex justify-between items-center px-3 py-2 bg-slate-50 hover:bg-blue-50/60 hover:border-blue-200 rounded-xl border border-slate-200 text-left transition-colors group"
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-800 group-hover:text-blue-700">{p.label}</div>
                      <div className="text-[10px] text-slate-400">{p.domain}</div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Event Stream Logs */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <History className="w-4 h-4 text-emerald-600" />
                  <span>实时会话判定事件流 (Live Session Event Feed)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  显示每一次触发访问时后台 Service Worker 的判定过程
                </p>
              </div>
              <span className="px-2.5 py-1 text-[10px] font-bold bg-slate-100 text-slate-600 rounded-full">
                {simLogs.length} 条记录
              </span>
            </div>

            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {simLogs.length === 0 ? (
                <div className="py-16 text-center text-slate-400 space-y-2 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                  <Info className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs font-medium">尚未触发访问模拟事件</p>
                  <p className="text-[11px] text-slate-400">在左侧选择域名点击“访问”或快进时间进行推演</p>
                </div>
              ) : (
                simLogs.map((log) => {
                  const isNewSession = log.outcome === 'NEW_SESSION';
                  const minsElapsed =
                    log.timeSinceLastActiveMs === Infinity
                      ? '首次访问'
                      : (log.timeSinceLastActiveMs / (1000 * 60)).toFixed(1) + ' 分钟前';

                  return (
                    <div
                      key={log.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isNewSession
                          ? 'bg-amber-50/40 border-amber-200/80'
                          : 'bg-slate-50/80 border-slate-200/80'
                      }`}
                    >
                      <div className="flex flex-wrap justify-between items-start gap-2">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isNewSession ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'
                            }`}
                          />
                          <span className="font-bold text-slate-900 text-xs">{log.domain}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>

                        {/* Outcome Tag */}
                        <div
                          className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full ${
                            isNewSession
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          }`}
                        >
                          {isNewSession ? '⚡ 触发新会话 (+1)' : '续期原有会话 (频次不加)'}
                        </div>
                      </div>

                      <div className="mt-2 text-xs flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-600">
                        <div>
                          上次活跃: <span className="font-medium text-slate-800">{minsElapsed}</span>
                        </div>
                        <div>
                          判定结论:{' '}
                          <span className="font-medium">
                            {isNewSession ? '超出超时判定间隔，记为独立会话' : '30分钟内再次访问，更新活跃时间戳'}
                          </span>
                        </div>
                        <div>
                          频次变动:{' '}
                          <span className="font-bold text-slate-900">
                            {log.sessionCountBefore} &rarr; {log.sessionCountAfter} 次
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
