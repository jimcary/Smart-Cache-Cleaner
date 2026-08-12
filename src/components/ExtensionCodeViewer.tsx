import React, { useState } from 'react';
import { generateExtensionFiles, downloadExtensionZip } from '../utils/extensionCodeGenerator';
import { SessionConfig, CleanerSettings } from '../types/extension';
import {
  Code2,
  Copy,
  Check,
  Download,
  FileCode,
  FolderArchive,
  Terminal,
  ExternalLink,
  Info,
  Sparkles,
} from 'lucide-react';

interface ExtensionCodeViewerProps {
  config: SessionConfig;
  settings: CleanerSettings;
  whitelist: string[];
}

export const ExtensionCodeViewer: React.FC<ExtensionCodeViewerProps> = ({
  config,
  settings,
  whitelist,
}) => {
  const [selectedFileName, setSelectedFileName] = useState<keyof ReturnType<typeof generateExtensionFiles>>(
    'manifest.json'
  );
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const files = generateExtensionFiles(config, settings, whitelist);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(files[selectedFileName]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    setIsDownloading(true);
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
    } catch (e) {
      console.error('Failed to download zip:', e);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Code Header Card */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Manifest V3 标准 Chrome 插件</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight">插件源码查看与一键打包下载</h2>
            <p className="text-xs text-slate-300">
              打包包含已配置的 30分钟 session timeout 算法、browsingData API 调用逻辑、Popup UI 与选项控制台。
            </p>
          </div>

          <button
            onClick={handleDownloadZip}
            disabled={isDownloading}
            className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-2 self-start md:self-auto"
          >
            <Download className="w-4 h-4" />
            <span>{isDownloading ? '打包生成中...' : '下载 Chrome 插件压缩包 (.zip)'}</span>
          </button>
        </div>
      </div>

      {/* Main Code Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left File Selector List */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2">
          <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-400 px-2">
            工程文件结构
          </h3>
          <div className="space-y-1">
            {Object.keys(files).map((filename) => {
              const isSelected = selectedFileName === filename;
              return (
                <button
                  key={filename}
                  onClick={() => setSelectedFileName(filename as any)}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    isSelected
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <FileCode className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span className="font-mono">{filename}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Code Display Area */}
        <div className="lg:col-span-3 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex flex-col">
          {/* File Toolbar Header */}
          <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-mono text-slate-300">
              <Terminal className="w-4 h-4 text-indigo-400" />
              <span className="font-bold text-white">{selectedFileName}</span>
            </div>

            <button
              onClick={handleCopyCode}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors border border-slate-700"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '已复制到剪贴板' : '复制代码'}</span>
            </button>
          </div>

          {/* Code View Area */}
          <pre className="p-4 overflow-x-auto text-slate-200 text-xs font-mono leading-relaxed max-h-[500px]">
            <code>{files[selectedFileName]}</code>
          </pre>
        </div>
      </div>

      {/* Installation Guide Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
          <FolderArchive className="w-5 h-5 text-blue-600" />
          <span>Chrome 浏览器安装步骤 (3步完成安装)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
            <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
              1
            </div>
            <h4 className="font-bold text-slate-800 text-xs">解压 ZIP 文件</h4>
            <p className="text-[11px] text-slate-500">
              点击上方“下载压缩包”按钮，解压 ZIP 压缩包至本地电脑的任意文件夹。
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
            <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
              2
            </div>
            <h4 className="font-bold text-slate-800 text-xs">打开扩展程序管理页面</h4>
            <p className="text-[11px] text-slate-500">
              在 Chrome 地址栏输入 <code className="bg-slate-200 px-1 rounded">chrome://extensions</code> 并开启右上角“开发者模式”。
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
            <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
              3
            </div>
            <h4 className="font-bold text-slate-800 text-xs">加载已解压的扩展程序</h4>
            <p className="text-[11px] text-slate-500">
              点击“加载已解压的扩展程序 (Load unpacked)”，选择刚刚解压的文件夹即可！
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
