'use client';

import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  RotateCw, 
  Copy, 
  Check, 
  AlertCircle,
  Sparkles,
  Zap,
  Send,
  X,
  Languages,
  ArrowLeft,
  Settings,
  Sliders,
  RotateCcw,
  Bot
} from 'lucide-react';
import { useReaderStore, DEFAULT_SYSTEM_PROMPT } from '@/store/useReaderStore';
import { useAgentStream } from '@/hooks/useAgentStream';
import { AgentStatusBadge } from '@/components/layout/AgentStatusBadge';

export function TranslationView() {
  const {
    file,
    currentPage,
    extractedPages,
    translationsCache,
    translationSettings,
    setTranslationSettings,
  } = useReaderStore();

  const { translatePage, translateCustomText, isStreaming } = useAgentStream();
  const [copied, setCopied] = useState(false);

  // Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tempPrompt, setTempPrompt] = useState(translationSettings?.systemPrompt || DEFAULT_SYSTEM_PROMPT);
  const [tempProvider, setTempProvider] = useState(translationSettings?.provider || 'auto');
  const [tempEndpoint, setTempEndpoint] = useState(translationSettings?.apiEndpoint || '');
  const [tempModel, setTempModel] = useState(translationSettings?.modelName || '');
  const [tempApiKey, setTempApiKey] = useState(translationSettings?.apiKey || '');

  // Custom User Input Translation States
  const [customInput, setCustomInput] = useState('');
  const [isCustomActive, setIsCustomActive] = useState(false);
  const [customResult, setCustomResult] = useState<{
    original: string;
    markdown: string;
    status: 'idle' | 'translating' | 'completed' | 'error';
    error?: string;
  }>({
    original: '',
    markdown: '',
    status: 'idle',
  });

  const currentText = extractedPages[currentPage] || '';
  const currentTranslation = translationsCache[currentPage];

  // Sync settings state when opening modal
  const handleOpenSettings = () => {
    setTempPrompt(translationSettings?.systemPrompt || DEFAULT_SYSTEM_PROMPT);
    setTempProvider(translationSettings?.provider || 'auto');
    setTempEndpoint(translationSettings?.apiEndpoint || '');
    setTempModel(translationSettings?.modelName || '');
    setTempApiKey(translationSettings?.apiKey || '');
    setIsSettingsOpen(true);
  };

  const handleSaveSettings = () => {
    setTranslationSettings({
      systemPrompt: tempPrompt,
      provider: tempProvider as any,
      apiEndpoint: tempEndpoint,
      modelName: tempModel,
      apiKey: tempApiKey,
    });
    setIsSettingsOpen(false);

    // Re-trigger translation with new prompt & settings
    setTimeout(() => {
      if (isCustomActive && customResult.original) {
        handleCustomSubmit();
      } else if (currentText) {
        translatePage(currentPage, currentText, true);
      }
    }, 50);
  };

  const handleResetPrompt = () => {
    setTempPrompt(DEFAULT_SYSTEM_PROMPT);
  };

  // Auto trigger page translation on page change if text is available (only in default page mode)
  useEffect(() => {
    if (
      !isCustomActive &&
      currentText &&
      (!currentTranslation || currentTranslation.status === 'idle')
    ) {
      translatePage(currentPage, currentText);
    }
  }, [isCustomActive, currentPage, currentText, currentTranslation?.status, translatePage]);

  // Handle Custom Translation Submission
  const handleCustomSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const textToTranslate = customInput.trim();
    if (!textToTranslate) return;

    setIsCustomActive(true);
    setCustomResult({
      original: textToTranslate,
      markdown: '',
      status: 'translating',
    });

    translateCustomText(
      textToTranslate,
      (chunk) => {
        setCustomResult((prev) => ({
          ...prev,
          markdown: prev.markdown + chunk,
          status: 'translating',
        }));
      },
      () => {
        setCustomResult((prev) => ({ ...prev, markdown: '', status: 'translating' }));
      },
      () => {
        setCustomResult((prev) => ({ ...prev, status: 'completed' }));
      },
      (errMsg) => {
        setCustomResult((prev) => ({ ...prev, status: 'error', error: errMsg }));
      }
    );
  };

  // Exit Custom Mode and Return to Current Page Translation
  const handleClearCustom = () => {
    setCustomInput('');
    setIsCustomActive(false);
    setCustomResult({ original: '', markdown: '', status: 'idle' });
  };

  const handleCopy = () => {
    const textToCopy = isCustomActive 
      ? customResult.markdown 
      : (currentTranslation?.translatedMarkdown || '');

    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRetry = () => {
    if (isCustomActive && customResult.original) {
      handleCustomSubmit();
    } else if (currentText) {
      translatePage(currentPage, currentText, true);
    }
  };

  const isTranslating = isCustomActive 
    ? (customResult.status === 'translating' || isStreaming)
    : (currentTranslation?.status === 'translating' || isStreaming);

  const isError = isCustomActive
    ? customResult.status === 'error'
    : currentTranslation?.status === 'error';

  const activeMarkdown = isCustomActive
    ? customResult.markdown
    : currentTranslation?.translatedMarkdown || '';

  const hasContent = !!activeMarkdown;

  return (
    <div className="flex flex-col h-full bg-white text-zinc-800 overflow-hidden relative">
      {/* 1. Top Header: Status Badge & Actions */}
      <div className="h-12 border-b border-zinc-200/70 px-4 md:px-6 flex items-center justify-between shrink-0 bg-white/80 backdrop-blur-xs">
        <div className="flex items-center gap-2">
          {isCustomActive ? (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-medium">
              <Languages className="w-3 h-3" />
              自訂翻譯
            </span>
          ) : file ? (
            <span className="font-mono text-xs text-zinc-600 font-medium">
              第 {currentPage} 頁
            </span>
          ) : null}

          {isTranslating && (
            <span className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-700 animate-ping" />
              正在即時翻譯...
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <AgentStatusBadge />

          <button
            onClick={handleOpenSettings}
            title="設定 AI 翻譯 Prompt 與模型"
            className="p-1.5 text-zinc-500 hover:text-zinc-900 rounded-lg hover:bg-zinc-100 transition-colors flex items-center gap-1 text-xs cursor-pointer border border-zinc-200/80 bg-zinc-50/50"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Prompt 設定</span>
          </button>

          <div className="flex items-center gap-1 pl-1 border-l border-zinc-200">
            <button
              onClick={handleRetry}
              disabled={isTranslating || (isCustomActive ? !customResult.original : !currentText)}
              title="重新翻譯"
              className="p-1.5 text-zinc-500 hover:text-zinc-900 rounded-lg hover:bg-zinc-100 transition-colors disabled:opacity-30 flex items-center gap-1 text-xs cursor-pointer"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isTranslating ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">重新翻譯</span>
            </button>

            {hasContent && (
              <button
                onClick={handleCopy}
                title="複製翻譯內容"
                className="p-1.5 text-zinc-500 hover:text-zinc-900 rounded-lg hover:bg-zinc-100 transition-colors flex items-center gap-1 text-xs cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{copied ? '已複製' : '複製'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Top Interactive Custom Translation Input Bar */}
      <div className="p-2.5 px-4 md:px-6 border-b border-zinc-200/80 bg-[#fbfbfb]">
        <form onSubmit={handleCustomSubmit} className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={customInput}
              onChange={(e) => {
                setCustomInput(e.target.value);
                if (!e.target.value.trim() && isCustomActive) {
                  handleClearCustom();
                }
              }}
              placeholder="💡 自訂翻譯：輸入或貼上任何段落、文字... (Enter 送出)"
              className="w-full pl-3 pr-8 py-1.5 text-xs rounded-xl bg-white border border-zinc-200 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400 transition-all shadow-2xs"
            />
            {customInput && (
              <button
                type="button"
                onClick={handleClearCustom}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-zinc-400 hover:text-zinc-700 rounded-full cursor-pointer"
                title="清除自訂輸入並返回當前頁"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={!customInput.trim() || isTranslating}
            className="px-3.5 py-1.5 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 text-white rounded-xl transition-colors shrink-0 flex items-center gap-1 shadow-2xs cursor-pointer"
          >
            <Send className="w-3 h-3" />
            <span>翻譯</span>
          </button>
        </form>
      </div>

      {/* 3. Custom Mode Active Banner */}
      {isCustomActive && (
        <div className="px-4 md:px-6 py-2 bg-blue-50/70 border-b border-blue-100 flex items-center justify-between text-xs text-blue-900">
          <span className="font-medium flex items-center gap-1.5">
            <Languages className="w-3.5 h-3.5 text-blue-600" />
            目前顯示自訂文字翻譯結果
          </span>
          <button
            onClick={handleClearCustom}
            className="text-blue-700 hover:text-blue-950 font-medium underline flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft className="w-3 h-3" />
            返回論文第 {currentPage} 頁翻譯
          </button>
        </div>
      )}

      {/* 4. Reader Body */}
      <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
        <div className="max-w-2xl mx-auto">
          {!isCustomActive && !file ? (
            <div className="h-full min-h-[420px] flex flex-col items-center justify-center text-center text-zinc-400 text-xs py-24">
              <Sparkles className="w-6 h-6 mb-2 text-zinc-300" />
              <p>請在左側拖入 PDF 論文，原文與即時繁體中文純翻譯將在此對照呈現。</p>
              <p className="mt-2 text-zinc-400">或在上方輸入框直接輸入欲翻譯的文字內容。</p>
            </div>
          ) : isError ? (
            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-700 text-xs">
              <div className="flex items-center gap-2 font-medium mb-1 text-red-600">
                <AlertCircle className="w-4 h-4" />
                翻譯未能完成
              </div>
              <p className="mb-3 text-zinc-500 leading-relaxed">
                {isCustomActive ? customResult.error : currentTranslation?.error}
              </p>
              <button
                onClick={handleRetry}
                className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg font-medium transition-colors text-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCw className="w-3 h-3" />
                重試翻譯
              </button>
            </div>
          ) : isTranslating && !hasContent ? (
            <div className="flex flex-col items-center justify-center py-28 text-center">
              <div className="w-5 h-5 border-2 border-zinc-700 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-xs text-zinc-500">
                {isCustomActive
                  ? '正在進行自訂文字繁體中文純翻譯...'
                  : `正在純翻譯第 ${currentPage} 頁文字為繁體中文...`}
              </p>
            </div>
          ) : hasContent ? (
            <div className="prose prose-zinc max-w-none text-zinc-800 text-sm leading-relaxed select-text space-y-4">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {activeMarkdown}
              </ReactMarkdown>

              {isTranslating && (
                <span className="inline-block w-1.5 h-4 ml-1 bg-zinc-700 animate-pulse align-middle" />
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-28 text-center text-zinc-400 text-xs">
              <p className="mb-3">第 {currentPage} 頁尚未開始翻譯</p>
              <button
                onClick={handleRetry}
                disabled={!currentText}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-medium transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-yellow-400" />
                立即即時純翻譯此頁
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 5. Prompt & Translation Settings Modal Dialog */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 max-w-xl w-full flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 md:px-6 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/70">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center shadow-xs">
                  <Bot className="w-4 h-4 text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">AI 翻譯 Agent 與 Prompt 設定</h3>
                  <p className="text-[11px] text-zinc-500">自訂學術翻譯提示詞、切換本地 Ollama 或自訂 LLM API</p>
                </div>
              </div>

              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 md:p-6 overflow-y-auto space-y-4 text-xs">
              {/* Section 1: System Prompt */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-zinc-800 flex items-center gap-1.5">
                    <span>📝 System Prompt (系統翻譯提示詞)</span>
                  </label>
                  <button
                    onClick={handleResetPrompt}
                    type="button"
                    className="text-[11px] text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer font-medium"
                  >
                    <RotateCcw className="w-3 h-3" />
                    恢復預設 Prompt
                  </button>
                </div>
                <p className="text-[11px] text-zinc-400 mb-2 leading-relaxed">
                  您可以直接編輯此 Prompt，自訂翻譯風格、學術用語規範、保留中英對照規則等：
                </p>
                <textarea
                  rows={7}
                  value={tempPrompt}
                  onChange={(e) => setTempPrompt(e.target.value)}
                  className="w-full p-3 rounded-xl border border-zinc-200 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-400 font-mono text-[11px] text-zinc-800 leading-relaxed bg-[#fdfdfd] custom-scrollbar resize-y"
                  placeholder="輸入自訂翻譯 System Prompt..."
                />
              </div>

              {/* Section 2: Engine & Provider Selection */}
              <div className="pt-3 border-t border-zinc-200/80 space-y-3">
                <label className="font-semibold text-zinc-800 block">
                  ⚙️ 翻譯提供商 (Translation Provider)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTempProvider('auto')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      tempProvider === 'auto'
                        ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs'
                        : 'bg-zinc-50/70 hover:bg-zinc-100 text-zinc-700 border-zinc-200'
                    }`}
                  >
                    <div className="font-semibold text-xs mb-0.5">⚡ 智慧雙引擎</div>
                    <div className={`text-[10px] leading-tight ${tempProvider === 'auto' ? 'text-zinc-300' : 'text-zinc-400'}`}>
                      Google Web + MyMemory 免費高速純翻譯（免 Key 即開即用）
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTempProvider('ollama')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      tempProvider === 'ollama'
                        ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs'
                        : 'bg-zinc-50/70 hover:bg-zinc-100 text-zinc-700 border-zinc-200'
                    }`}
                  >
                    <div className="font-semibold text-xs mb-0.5">🦙 本地 Ollama</div>
                    <div className={`text-[10px] leading-tight ${tempProvider === 'ollama' ? 'text-zinc-300' : 'text-zinc-400'}`}>
                      本機大模型 (預設 http://localhost:11434 / llama3.2)
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTempProvider('custom_llm')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      tempProvider === 'custom_llm'
                        ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs'
                        : 'bg-zinc-50/70 hover:bg-zinc-100 text-zinc-700 border-zinc-200'
                    }`}
                  >
                    <div className="font-semibold text-xs mb-0.5">🤖 自訂 LLM API</div>
                    <div className={`text-[10px] leading-tight ${tempProvider === 'custom_llm' ? 'text-zinc-300' : 'text-zinc-400'}`}>
                      OpenAI / DeepSeek / Claude / 自訂 Endpoint
                    </div>
                  </button>
                </div>

                {/* Custom LLM or Ollama fields */}
                {(tempProvider === 'ollama' || tempProvider === 'custom_llm') && (
                  <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-2.5 mt-2 animate-in fade-in">
                    <div>
                      <label className="block text-[11px] font-medium text-zinc-600 mb-1">
                        API Endpoint URL
                      </label>
                      <input
                        type="text"
                        value={tempEndpoint}
                        onChange={(e) => setTempEndpoint(e.target.value)}
                        placeholder={
                          tempProvider === 'ollama'
                            ? 'http://localhost:11434/v1/chat/completions'
                            : 'https://api.openai.com/v1/chat/completions 或 https://api.deepseek.com/v1/chat/completions'
                        }
                        className="w-full p-2 text-xs rounded-lg border border-zinc-200 bg-white focus:outline-none focus:border-zinc-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-zinc-600 mb-1">
                        Model 模型名稱
                      </label>
                      <input
                        type="text"
                        value={tempModel}
                        onChange={(e) => setTempModel(e.target.value)}
                        placeholder={
                          tempProvider === 'ollama'
                            ? 'llama3.2 或 llama3:8b'
                            : 'gpt-4o-mini 或 deepseek-chat'
                        }
                        className="w-full p-2 text-xs rounded-lg border border-zinc-200 bg-white focus:outline-none focus:border-zinc-500 font-mono"
                      />
                    </div>

                    {tempProvider === 'custom_llm' && (
                      <div>
                        <label className="block text-[11px] font-medium text-zinc-600 mb-1">
                          API Key
                        </label>
                        <input
                          type="password"
                          value={tempApiKey}
                          onChange={(e) => setTempApiKey(e.target.value)}
                          placeholder="sk-..."
                          className="w-full p-2 text-xs rounded-lg border border-zinc-200 bg-white focus:outline-none focus:border-zinc-500 font-mono"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 px-6 border-t border-zinc-200 bg-zinc-50/70 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 text-xs rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer font-medium"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSaveSettings}
                className="px-4 py-2 text-xs rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white transition-colors cursor-pointer font-medium flex items-center gap-1.5 shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                儲存設定並立即翻譯
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

