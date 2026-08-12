import React, { useState, useMemo } from 'react';
import { DomainStat, SessionConfig } from '../types/extension';
import {
  Search,
  Filter,
  Shield,
  ShieldOff,
  Trash2,
  HardDrive,
  Clock,
  Layers,
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Calendar,
  Zap,
} from 'lucide-react';

interface DashboardViewProps {
  stats: DomainStat[];
  config: SessionConfig;
  onUpdateConfig: (newConfig: SessionConfig) => void;
  onToggleWhitelist: (domain: string) => void;
  onSingleClean: (domain: string) => void;
  onOpenBatchClean: (targetDomains: string[]) => void;
  virtualTime: number;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  config,
  onUpdateConfig,
  onToggleWhitelist,
  onSingleClean,
  onOpenBatchClean,
  virtualTime,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [whitelistFilter, setWhitelistFilter] = useState<'all' | 'whitelisted' | 'unprotected'>('all');
  const [sortBy, setSortBy] = useState<'count-asc' | 'count-desc' | 'time-desc' | 'storage-desc'>('count-asc');

  // Computed metrics
  const totalDomains = stats.length;

  const lowFrequencyTargets = useMemo(() => {
    return stats.filter((s) => s.count < config.thresholdCount && !s.isWhitelisted);
  }, [stats, config.thresholdCount]);

  const totalReclaimableMB = useMemo(() => {
    return lowFrequencyTargets.reduce((acc, curr) => acc + curr.estimatedStorageMB, 0);
  }, [lowFrequencyTargets]);

  const totalStorageMB = useMemo(() => {
    return stats.reduce((acc, curr) => acc + curr.estimatedStorageMB, 0);
  }, [stats]);

  // Frequency distribution buckets
  const buckets = useMemo(() => {
    const counts = { '1次 (极低)': 0, '2次 (低频)': 0, '3-5次 (中频)': 0, '6-10次 (常用)': 0, '>10次 (高频)': 0 };
    stats.forEach((s) => {
      if (s.count === 1) counts['1次 (极低)']++;
      else if (s.count === 2) counts['2次 (低频)']++;
      else if (s.count >= 3 && s.count <= 5) counts['3-5次 (中频)']++;
      else if (s.count >= 6 && s.count <= 10) counts['6-10次 (常用)']++;
      else counts['>10次 (高频)']++;
    });
    return counts;
  }, [stats]);

  // Filtered and sorted stats table
  const filteredStats = useMemo(() => {
    return stats
      .filter((item) => {
        const matchesSearch = item.domain.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
        const matchesWhitelist =
          whitelistFilter === 'all'
            ? true
            : whitelistFilter === 'whitelisted'
            ? item.isWhitelisted
            : !item.isWhitelisted;
        return matchesSearch && matchesCategory && matchesWhitelist;
      })
      .sort((a, b) => {
        if (sortBy === 'count-asc') return a.count - b.count;
        if (sortBy === 'count-desc') return b.count - a.count;
        if (sortBy === 'time-desc') return b.lastActiveTime - a.lastActiveTime;
        if (sortBy === 'storage-desc') return b.estimatedStorageMB - a.estimatedStorageMB;
        return 0;
      });
  }, [stats, searchTerm, categoryFilter, whitelistFilter, sortBy]);

  function formatTimeAgo(timeMs: number) {
    const diffMs = virtualTime - timeMs;
    if (diffMs < 0) return '刚才';
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 60) return `${diffMins} 分钟前`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} 小时前`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} 天前`;
  }

  return (
    <div className="space-y-6">
      {/* 1. Metric Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">已监控域名总数</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalDomains}</h3>
              <p className="text-xs text-slate-500 mt-1">已包含历史浏览记录与实时标签监控</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-rose-200 shadow-sm bg-gradient-to-br from-white to-rose-50/30 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider">低频待清理目标</p>
              <div className="flex items-baseline space-x-2 mt-1">
                <h3 className="text-2xl font-bold text-rose-600">{lowFrequencyTargets.length}</h3>
                <span className="text-xs text-slate-500">
                  (访问次数 &lt; <span className="font-bold text-rose-700">{config.thresholdCount}</span> 次)
                </span>
              </div>
              <p className="text-xs text-rose-500 mt-1 font-medium">不包含受保护白名单域名</p>
            </div>
            <div className="p-3 bg-rose-100 text-rose-600 rounded-xl">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-emerald-200 shadow-sm bg-gradient-to-br from-white to-emerald-50/30">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">预期可释放总空间</p>
              <h3 className="text-2xl font-bold text-emerald-700 mt-1">{totalReclaimableMB.toFixed(1)} MB</h3>
              <p className="text-xs text-slate-500 mt-1">
                占全部缓存空间 ({(totalStorageMB ? (totalReclaimableMB / totalStorageMB) * 100 : 0).toFixed(0)}%)
              </p>
            </div>
            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
              <HardDrive className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">会话断定时间间隔</p>
              <div className="flex items-center space-x-2 mt-1">
                <h3 className="text-2xl font-bold text-slate-900">{config.sessionTimeoutMinutes}</h3>
                <span className="text-sm font-medium text-slate-600">分钟</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">30分钟内连续刷新仅算1次独立访问</p>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Controls & Threshold Settings Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-600" />
              <span>清理阈值与参数配置</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              拖动滑块自定义过滤阈值，一键预览符合标准的低频域名列表
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => onOpenBatchClean(lowFrequencyTargets.map((t) => t.domain))}
              disabled={lowFrequencyTargets.length === 0}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-semibold text-xs shadow-md transition-all ${
                lowFrequencyTargets.length > 0
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              <span>一键定向清理选中低频数据 ({lowFrequencyTargets.length} 个)</span>
            </button>
          </div>
        </div>

        {/* Threshold Slider Control */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200/60">
          <div className="md:col-span-2 space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
              <label htmlFor="threshold-slider-dash">清理频次阈值: 小于 &lt; <span className="text-blue-600 text-sm font-bold">{config.thresholdCount}</span> 次访问</label>
              <span className="text-slate-500">范围: 1 - 10 次</span>
            </div>
            <input
              id="threshold-slider-dash"
              type="range"
              min="1"
              max="10"
              step="1"
              value={config.thresholdCount}
              onChange={(e) => onUpdateConfig({ ...config, thresholdCount: parseInt(e.target.value, 10) })}
              className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
            />
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>仅清理 0 次访问</span>
              <span>低于 3 次 (推荐)</span>
              <span>低于 5 次</span>
              <span>低于 10 次</span>
            </div>
          </div>

          <div className="space-y-1.5 border-t md:border-t-0 md:border-l border-slate-200 pt-3 md:pt-0 md:pl-6">
            <label className="text-xs font-semibold text-slate-700">会话超时(Session Timeout):</label>
            <select
              value={config.sessionTimeoutMinutes}
              onChange={(e) => onUpdateConfig({ ...config, sessionTimeoutMinutes: parseInt(e.target.value, 10) })}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={15}>15 分钟 (频繁判定)</option>
              <option value={30}>30 分钟 (标准 Google Analytics 算法)</option>
              <option value={60}>60 分钟 (宽松判定)</option>
            </select>
            <p className="text-[11px] text-slate-500">间隔内重复加载不会累加频次。</p>
          </div>
        </div>

        {/* Distribution Bars */}
        <div className="space-y-2 pt-2">
          <div className="flex justify-between items-center text-xs text-slate-600 font-semibold">
            <span className="flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <span>全站域名访问频次分布柱图</span>
            </span>
            <span className="text-slate-400 text-[11px]">高频网站自动推荐加入白名单</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {Object.entries(buckets).map(([label, count]) => {
              const isTargetBucket = label.includes('1次') || label.includes('2次');
              return (
                <div
                  key={label}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    isTargetBucket ? 'bg-rose-50/60 border-rose-200' : 'bg-slate-50 border-slate-200/80'
                  }`}
                >
                  <div className="text-[11px] font-medium text-slate-500">{label}</div>
                  <div
                    className={`text-lg font-bold mt-0.5 ${
                      isTargetBucket ? 'text-rose-600' : 'text-slate-800'
                    }`}
                  >
                    {count} <span className="text-xs font-normal text-slate-400">个</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Domain Table & Search Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Filter Toolbar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="搜索域名, 例如: rare-tool, github..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">所有分类</option>
              <option value="infrequent">冷门/单次访问</option>
              <option value="tools">在线工具类</option>
              <option value="dev">开发者类</option>
              <option value="shopping">购物/电商类</option>
              <option value="social">社交/资讯类</option>
              <option value="search">搜索引擎</option>
              <option value="other">其他</option>
            </select>

            <select
              value={whitelistFilter}
              onChange={(e) => setWhitelistFilter(e.target.value as any)}
              className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">全部保护状态</option>
              <option value="unprotected">未受保护 (待清理)</option>
              <option value="whitelisted">已加入白名单</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="count-asc">按频次升序 (低频在前)</option>
              <option value="count-desc">按频次降序 (高频在前)</option>
              <option value="storage-desc">按内存体积降序</option>
              <option value="time-desc">按最近活跃时间</option>
            </select>
          </div>
        </div>

        {/* Main Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">域名与标签信息</th>
                <th className="py-3 px-4">访问频次 (会话)</th>
                <th className="py-3 px-4">最近活跃时间</th>
                <th className="py-3 px-4">估算缓存占用</th>
                <th className="py-3 px-4">白名单保护</th>
                <th className="py-3 px-4 text-right">清理操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredStats.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <p className="text-sm font-medium">没有找到符合条件的域名</p>
                    <p className="text-xs text-slate-400 mt-1">尝试调整搜索词或过滤器设置</p>
                  </td>
                </tr>
              ) : (
                filteredStats.map((item) => {
                  const isLowFreq = item.count < config.thresholdCount;
                  const isCleanCandidate = isLowFreq && !item.isWhitelisted;

                  return (
                    <tr
                      key={item.domain}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isCleanCandidate ? 'bg-rose-50/20' : ''
                      }`}
                    >
                      {/* Domain & Badges */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs flex-shrink-0">
                            {item.domain.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold text-slate-900">{item.domain}</span>
                              {isCleanCandidate && (
                                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-rose-100 text-rose-700">
                                  拟清理低频
                                </span>
                              )}
                              {item.isWhitelisted && (
                                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-blue-700 flex items-center gap-1">
                                  <Shield className="w-3 h-3" /> 白名单
                                </span>
                              )}
                            </div>
                            {item.notes && (
                              <p className="text-[11px] text-slate-400 mt-0.5">{item.notes}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Visit Count Badge */}
                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full font-bold text-xs bg-slate-100 text-slate-800 border border-slate-200">
                          <span>{item.count}</span>
                          <span className="text-[10px] font-normal text-slate-500">次会话</span>
                        </div>
                      </td>

                      {/* Last Active Time */}
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {formatTimeAgo(item.lastActiveTime)}
                      </td>

                      {/* Storage Size & Types */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{item.estimatedStorageMB} MB</div>
                        <div className="flex items-center space-x-1 text-[10px] text-slate-400 mt-0.5">
                          {item.dataTypes.cache && <span className="px-1 bg-slate-100 rounded">Cache</span>}
                          {item.dataTypes.cookies && <span className="px-1 bg-slate-100 rounded">Cookie</span>}
                          {item.dataTypes.localStorage && <span className="px-1 bg-slate-100 rounded">Storage</span>}
                        </div>
                      </td>

                      {/* Whitelist Switch */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => onToggleWhitelist(item.domain)}
                          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                            item.isWhitelisted
                              ? 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100'
                              : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {item.isWhitelisted ? (
                            <>
                              <Shield className="w-3.5 h-3.5 text-blue-600" />
                              <span>已受保护</span>
                            </>
                          ) : (
                            <>
                              <ShieldOff className="w-3.5 h-3.5 text-slate-400" />
                              <span>设为保护</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => onSingleClean(item.domain)}
                          className="px-2.5 py-1 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200"
                        >
                          清理该域名数据
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
