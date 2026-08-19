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
  Zap
} from 'lucide-react';
import { useReaderStore } from '@/store/useReaderStore';
import { useAgentStream } from '@/hooks/useAgentStream';
import { AgentStatusBadge } from '@/components/layout/AgentStatusBadge';

export function TranslationView() {
  const {
    file,
    currentPage,
    extractedPages,
    translationsCache,
  } = useReaderStore();

  const { translatePage, isStreaming } = useAgentStream();
  const [copied, setCopied] = useState(false);

  const currentText = extractedPages[currentPage] || '';
  const currentTranslation = translationsCache[currentPage];

  // Auto trigger translation on page change if text is available
  useEffect(() => {
    if (
      currentText &&
      (!currentTranslation || currentTranslation.status === 'idle')
    ) {
      translatePage(currentPage, currentText);
    }
  }, [currentPage, currentText, currentTranslation?.status, translatePage]);

  const handleCopy = () => {
    const textToCopy = currentTranslation?.translatedMarkdown || '';
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRetry = () => {
    if (currentText) {
      translatePage(currentPage, currentText, true);
    }
  };

  const isTranslating = currentTranslation?.status === 'translating' || isStreaming;
  const isError = currentTranslation?.status === 'error';
  const hasContent = !!currentTranslation?.translatedMarkdown;

  return (
    <div className="flex flex-col h-full bg-white text-zinc-800 overflow-hidden">
      {/* Top Header: Focused on Agent Status Badge & Actions */}
      <div className="h-12 border-b border-zinc-200/70 px-6 flex items-center justify-between shrink-0 bg-white/80 backdrop-blur-xs">
        <div className="flex items-center gap-2">
          {file && (
            <span className="font-mono text-xs text-zinc-500 font-medium">
              第 {currentPage} 頁
            </span>
          )}

          {isTranslating && (
            <span className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-700 animate-ping" />
              正在即時翻譯...
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <AgentStatusBadge />

          <div className="flex items-center gap-1 pl-1 border-l border-zinc-200">
            <button
              onClick={handleRetry}
              disabled={isTranslating || !currentText}
              title="重新翻譯此頁"
              className="p-1.5 text-zinc-500 hover:text-zinc-900 rounded-lg hover:bg-zinc-100 transition-colors disabled:opacity-30 flex items-center gap-1 text-xs"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isTranslating ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">重新翻譯</span>
            </button>

            {hasContent && (
              <button
                onClick={handleCopy}
                title="複製翻譯內容"
                className="p-1.5 text-zinc-500 hover:text-zinc-900 rounded-lg hover:bg-zinc-100 transition-colors flex items-center gap-1 text-xs"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{copied ? '已複製' : '複製'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Reader Body */}
      <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
        <div className="max-w-2xl mx-auto">
          {!file ? (
            <div className="h-full min-h-[420px] flex flex-col items-center justify-center text-center text-zinc-400 text-xs py-24">
              <Sparkles className="w-6 h-6 mb-2 text-zinc-300" />
              <p>請在左側拖入 PDF 論文，原文與即時繁體中文翻譯將在此對照呈現。</p>
            </div>
          ) : isError ? (
            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-700 text-xs">
              <div className="flex items-center gap-2 font-medium mb-1 text-red-600">
                <AlertCircle className="w-4 h-4" />
                翻譯未能完成
              </div>
              <p className="mb-3 text-zinc-500 leading-relaxed">
                {currentTranslation?.error}
              </p>
              <button
                onClick={handleRetry}
                className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg font-medium transition-colors text-xs inline-flex items-center gap-1.5"
              >
                <RotateCw className="w-3 h-3" />
                重試翻譯
              </button>
            </div>
          ) : isTranslating && !hasContent ? (
            <div className="flex flex-col items-center justify-center py-28 text-center">
              <div className="w-5 h-5 border-2 border-zinc-700 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-xs text-zinc-500">
                正在分析第 {currentPage} 頁文字並翻譯為繁體中文...
              </p>
            </div>
          ) : hasContent ? (
            <div className="prose prose-zinc max-w-none text-zinc-800 text-sm leading-relaxed select-text space-y-4">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {currentTranslation.translatedMarkdown}
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
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-medium transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Zap className="w-3.5 h-3.5 text-yellow-400" />
                立即即時翻譯此頁
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
