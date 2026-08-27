'use client';

import React, { useState } from 'react';
import { 
  FileText, 
  Clock, 
  Trash2, 
  Highlighter, 
  ChevronLeft, 
  ChevronRight, 
  BookOpen, 
  PenTool, 
  Eraser, 
  Undo2
} from 'lucide-react';
import { useReaderStore } from '@/store/useReaderStore';
import { usePDFViewer } from '@/hooks/usePDFViewer';
import { getPdfFromStorage, deletePdfFromStorage } from '@/lib/pdfCache';
import { DocumentHistoryItem } from '@/types/reader';

export function LeftSidebar() {
  const {
    file,
    history,
    currentPage,
    isLeftSidebarOpen,
    setIsLeftSidebarOpen,
    removeHistoryItem,
    setCurrentPage,
    activeDrawingTool,
    setActiveDrawingTool,
    annotations,
    clearPageStrokes,
    undoStroke,
  } = useReaderStore();

  const { loadPdf } = usePDFViewer();
  const [loadingDocId, setLoadingDocId] = useState<string | null>(null);

  // Find pages with freehand annotations in active document
  const docAnnotations = (file && annotations[file.id]) || {};
  const annotatedPages = Object.keys(docAnnotations)
    .map(Number)
    .filter((pageNum) => docAnnotations[pageNum] && docAnnotations[pageNum].length > 0)
    .sort((a, b) => a - b);

  const handleOpenFromHistory = async (item: DocumentHistoryItem) => {
    if (file?.id === item.id) return;
    setLoadingDocId(item.id);

    try {
      // 1. Priority 1: Fetch from local project temporary storage (storage/papers/)
      const queryParams = new URLSearchParams();
      if (item.id) queryParams.set('id', item.id);
      if (item.filePath) queryParams.set('path', item.filePath);
      if (item.name) queryParams.set('name', item.name);

      const res = await fetch(`/api/agent/file?${queryParams.toString()}`);
      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        const serverPath = res.headers.get('X-File-Path');
        const resolvedPath = serverPath ? decodeURIComponent(serverPath) : item.filePath;
        await loadPdf(arrayBuffer, item.name, resolvedPath, item.id);
        setLoadingDocId(null);
        return;
      }

      // 2. Priority 2: Load from IndexedDB local binary cache
      const cachedBuffer = await getPdfFromStorage(item.id);
      if (cachedBuffer) {
        await loadPdf(cachedBuffer, item.name, item.filePath, item.id);
        setLoadingDocId(null);
        return;
      }

      // 3. Priority 3: In-memory buffer or remote URL
      if (item.url) {
        await loadPdf(item.url, item.name, item.filePath, item.id);
      } else if (item.arrayBuffer) {
        await loadPdf(item.arrayBuffer, item.name, item.filePath, item.id);
      } else {
        alert(`未能在本地暫存區或磁碟中找到「${item.name}」，請將該 PDF 重新拖入視窗中開啟。`);
      }
    } catch (err: any) {
      console.error('Failed to reload history paper:', err);
      alert(`載入「${item.name}」失敗: ${err?.message || err}`);
    } finally {
      setLoadingDocId(null);
    }
  };

  const handleDeleteHistory = async (e: React.MouseEvent, item: DocumentHistoryItem) => {
    e.stopPropagation();

    // 1. Delete from local server storage folder
    try {
      const queryParams = new URLSearchParams();
      if (item.id) queryParams.set('id', item.id);
      if (item.filePath) queryParams.set('path', item.filePath);
      fetch(`/api/agent/file?${queryParams.toString()}`, { method: 'DELETE' }).catch(() => {});
    } catch {}

    // 2. Delete from IndexedDB
    deletePdfFromStorage(item.id);

    // 3. Remove from Zustand store
    removeHistoryItem(item.id);
  };

  if (!isLeftSidebarOpen) {
    return (
      <div className="h-full w-12 border-r border-dashed border-zinc-300 bg-[#fafafa] flex flex-col items-center py-4 justify-between shrink-0 select-none z-20">
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => setIsLeftSidebarOpen(true)}
            title="展開檔案與筆記紀錄"
            className="p-2 rounded-lg hover:bg-zinc-200 text-zinc-600 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsLeftSidebarOpen(true)}
            title="閱讀紀錄"
            className="p-2 rounded-lg hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800 transition-colors"
          >
            <Clock className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveDrawingTool(activeDrawingTool === 'highlighter' ? 'cursor' : 'highlighter')}
            title="螢光筆"
            className={`p-2 rounded-lg transition-colors ${
              activeDrawingTool === 'highlighter'
                ? 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-400' 
                : 'hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Highlighter className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveDrawingTool(activeDrawingTool === 'eraser' ? 'cursor' : 'eraser')}
            title="橡皮擦"
            className={`p-2 rounded-lg transition-colors ${
              activeDrawingTool === 'eraser'
                ? 'bg-red-100 text-red-800 ring-1 ring-red-400' 
                : 'hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Eraser className="w-4 h-4" />
          </button>
        </div>

        <span className="text-[10px] font-mono text-zinc-400 [writing-mode:vertical-lr] rotate-180">
          HISTORY
        </span>
      </div>
    );
  }

  return (
    <div className="h-full w-64 border-r border-dashed border-zinc-300 bg-[#fbfbfb] flex flex-col shrink-0 select-none z-20 overflow-hidden text-xs">
      {/* Top Header */}
      <div className="h-12 px-4 border-b border-zinc-200/80 flex items-center justify-between bg-white/60 shrink-0">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-zinc-700" />
          <span className="font-semibold text-zinc-800 text-xs">論文紀錄與筆記</span>
        </div>

        <button
          onClick={() => setIsLeftSidebarOpen(false)}
          title="收合側邊欄"
          className="p-1 rounded-md hover:bg-zinc-200 text-zinc-400 hover:text-zinc-700 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Tool Switcher */}
      <div className="p-3 border-b border-zinc-200/60 bg-white/40 flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => setActiveDrawingTool('highlighter')}
          className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 font-medium transition-all ${
            activeDrawingTool === 'highlighter'
              ? 'bg-yellow-100 text-yellow-900 border border-yellow-300 shadow-xs'
              : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
          }`}
        >
          <Highlighter className="w-3.5 h-3.5 text-yellow-600" />
          <span>螢光筆</span>
        </button>

        <button
          onClick={() => setActiveDrawingTool('pen')}
          className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 font-medium transition-all ${
            activeDrawingTool === 'pen'
              ? 'bg-blue-100 text-blue-900 border border-blue-300 shadow-xs'
              : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
          }`}
        >
          <PenTool className="w-3.5 h-3.5 text-blue-600" />
          <span>手寫筆</span>
        </button>

        <button
          onClick={() => setActiveDrawingTool('eraser')}
          className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 font-medium transition-all ${
            activeDrawingTool === 'eraser'
              ? 'bg-red-100 text-red-900 border border-red-300 shadow-xs'
              : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
          }`}
        >
          <Eraser className="w-3.5 h-3.5 text-red-500" />
          <span>橡皮擦</span>
        </button>

        <button
          onClick={() => undoStroke(currentPage)}
          title="復原上一筆 (Ctrl+Z)"
          className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 transition-colors"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-5 custom-scrollbar">
        {/* Section 1: Recent Files */}
        <div>
          <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            最近開啟的論文 ({history.length})
          </div>

          {history.length === 0 ? (
            <div className="p-3 text-center text-zinc-400 text-[11px] bg-white rounded-xl border border-zinc-200/60">
              尚無閱讀紀錄
            </div>
          ) : (
            <div className="space-y-1.5">
              {history.map((item) => {
                const isActive = file?.id === item.id;
                const isItemLoading = loadingDocId === item.id;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleOpenFromHistory(item)}
                    className={`group p-2.5 rounded-xl border transition-all cursor-pointer relative ${
                      isActive
                        ? 'bg-white border-zinc-400 shadow-xs ring-1 ring-zinc-300'
                        : 'bg-white/70 hover:bg-white border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        {isItemLoading ? (
                          <div className="w-3.5 h-3.5 border-2 border-zinc-600 border-t-transparent rounded-full animate-spin shrink-0" />
                        ) : (
                          <FileText className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-zinc-900' : 'text-zinc-400'}`} />
                        )}
                        <span className="truncate font-medium text-zinc-800 text-xs" title={item.filePath || item.name}>
                          {item.name}
                        </span>
                      </div>

                      <button
                        onClick={(e) => handleDeleteHistory(e, item)}
                        title="刪除紀錄與本地暫存檔"
                        className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-600 rounded transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                      <span>上次讀到：P.{item.lastReadPage} / {item.totalPages || 1}</span>
                      {isActive && (
                        <span className="text-[10px] font-sans px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-700 font-medium">
                          目前開啟
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Section 2: Handwritten Notes & Highlights by Page */}
        {file && (
          <div>
            <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Highlighter className="w-3 h-3 text-yellow-600" />
              手繪筆記標記頁 ({annotatedPages.length})
            </div>

            {annotatedPages.length === 0 ? (
              <div className="p-3 text-center text-zinc-400 text-[11px] bg-white rounded-xl border border-zinc-200/60 leading-relaxed">
                尚無手繪筆記。<br />點選「螢光筆」後直接在左側 PDF 塗抹劃線，使用「橡皮擦」可點選單筆清除。
              </div>
            ) : (
              <div className="space-y-1.5">
                {annotatedPages.map((pageNum) => {
                  const strokes = docAnnotations[pageNum] || [];
                  const isCurrent = currentPage === pageNum;
                  return (
                    <div
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`group p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isCurrent
                          ? 'bg-yellow-50/90 border-yellow-300 text-yellow-950 font-medium shadow-xs'
                          : 'bg-white hover:bg-yellow-50/40 border-zinc-200 hover:border-yellow-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-yellow-100 text-yellow-800 flex items-center justify-center font-mono font-bold text-[10px]">
                          {pageNum}
                        </div>
                        <div>
                          <div className="text-xs">第 {pageNum} 頁筆記</div>
                          <div className="text-[10px] text-zinc-400 font-mono">
                            {strokes.length} 處筆跡
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          clearPageStrokes(pageNum);
                        }}
                        title="清除本頁所有筆記"
                        className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-600 rounded transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
