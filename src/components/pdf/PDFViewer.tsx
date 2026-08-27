'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  ChevronLeft, 
  ChevronRight, 
  Upload, 
  RotateCw,
  Highlighter,
  PenTool,
  MousePointer,
  Eraser,
  Undo2
} from 'lucide-react';
import { useReaderStore } from '@/store/useReaderStore';
import { usePDFViewer } from '@/hooks/usePDFViewer';
import { PDFPage } from './PDFPage';
import { DropZone } from './DropZone';

export function PDFViewer() {
  const {
    file,
    currentPage,
    totalPages,
    scale,
    rotation,
    setCurrentPage,
    setScale,
    setRotation,
    activeDrawingTool,
    setActiveDrawingTool,
    activeStrokeColor,
    setActiveStrokeColor,
    activeStrokeSize,
    setActiveStrokeSize,
    undoStroke,
  } = useReaderStore();

  const {
    loadPdf,
    renderPage,
    extractPageText,
    error,
  } = usePDFViewer();

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to target page when new file is loaded (restores last read page)
  useEffect(() => {
    if (file && scrollContainerRef.current) {
      if (currentPage > 1) {
        const timer = setTimeout(() => {
          const pageEl = document.getElementById(`pdf-page-${currentPage}`);
          if (pageEl) {
            pageEl.scrollIntoView({ behavior: 'auto', block: 'start' });
          }
        }, 80);
        return () => clearTimeout(timer);
      } else {
        scrollContainerRef.current.scrollTop = 0;
      }
    }
  }, [file?.id]);

  // Sync scroll to target page
  const scrollToPage = useCallback((pageNum: number) => {
    const pageEl = document.getElementById(`pdf-page-${pageNum}`);
    if (pageEl && scrollContainerRef.current) {
      pageEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    scrollToPage(newPage);
  };

  // Keyboard shortcuts (including Ctrl+Z for undo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undoStroke(currentPage);
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        handlePageChange(currentPage + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        handlePageChange(currentPage - 1);
      } else if ((e.ctrlKey || e.metaKey) && e.key === '=') {
        e.preventDefault();
        setScale((s) => s + 0.15);
      } else if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        setScale((s) => s - 0.15);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages, setScale, undoStroke]);

  if (!file) {
    return <DropZone onFileSelect={(f) => loadPdf(f)} />;
  }

  const HIGHLIGHTER_COLORS = [
    { name: '經典黃色螢光', value: 'rgba(250, 204, 21, 0.4)', bg: 'bg-yellow-300' },
    { name: '清新綠色螢光', value: 'rgba(74, 222, 128, 0.4)', bg: 'bg-green-400' },
    { name: '活力粉橘螢光', value: 'rgba(251, 146, 60, 0.4)', bg: 'bg-orange-400' },
  ];

  const PEN_COLORS = [
    { name: '藍色筆跡', value: '#2563eb', bg: 'bg-blue-600' },
    { name: '黑色筆跡', value: '#18181b', bg: 'bg-zinc-900' },
    { name: '紅色重點', value: '#dc2626', bg: 'bg-red-600' },
  ];

  const HIGHLIGHTER_SIZES = [
    { label: '細', size: 14 },
    { label: '中', size: 24 },
    { label: '粗', size: 38 },
  ];

  const PEN_SIZES = [
    { label: '細', size: 1.8 },
    { label: '中', size: 3.5 },
    { label: '粗', size: 6.0 },
  ];

  return (
    <div className="h-full w-full flex flex-col bg-[#f4f4f6] relative overflow-hidden">
      {/* Scrollable PDF Canvas Pages */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-auto p-4 md:p-8 flex flex-col items-center custom-scrollbar"
      >
        {error && (
          <div className="p-4 my-8 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs max-w-md text-center">
            {error}
          </div>
        )}

        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
          <PDFPage
            key={`${file.id}-page-${pageNum}`}
            pageNumber={pageNum}
            scale={scale}
            rotation={rotation}
            renderPage={renderPage}
            extractPageText={extractPageText}
            onVisible={(visiblePage) => {
              setCurrentPage(visiblePage);
            }}
          />
        ))}
      </div>

      {/* Floating Apple-Notes Style Tool & Page Control Bar */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-zinc-200 shadow-lg text-xs text-zinc-700 select-none">
        {/* Page Nav */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            title="上一頁"
            className="p-1 rounded-full hover:bg-zinc-100 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="font-mono text-xs px-1.5 font-medium">
            {currentPage} / {totalPages || 1}
          </span>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            title="下一頁"
            className="p-1 rounded-full hover:bg-zinc-100 disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="w-[1px] h-4 bg-zinc-200 mx-1" />

        {/* Note-Taking & Drawing Tools */}
        <div className="flex items-center gap-1">
          {/* 1. Cursor / Hand Mode */}
          <button
            onClick={() => setActiveDrawingTool('cursor')}
            title="瀏覽平移模式 (拖曳瀏覽滾動)"
            className={`p-1.5 rounded-full transition-all ${
              activeDrawingTool === 'cursor'
                ? 'bg-zinc-800 text-white shadow-xs'
                : 'hover:bg-zinc-100 text-zinc-600'
            }`}
          >
            <MousePointer className="w-3.5 h-3.5" />
          </button>

          {/* 2. Highlighter Tool */}
          <button
            onClick={() => setActiveDrawingTool('highlighter')}
            title="透明螢光筆 (按住滑鼠或 Apple Pencil 劃線，絕不遮擋文字)"
            className={`p-1.5 rounded-full transition-all flex items-center gap-1 ${
              activeDrawingTool === 'highlighter'
                ? 'bg-yellow-100 text-yellow-950 ring-2 ring-yellow-400 font-medium'
                : 'hover:bg-zinc-100 text-zinc-600'
            }`}
          >
            <Highlighter className="w-3.5 h-3.5 text-yellow-600" />
            {activeDrawingTool === 'highlighter' && (
              <span className="text-[11px] font-sans pr-1">螢光筆</span>
            )}
          </button>

          {/* Highlighter Color Choices & Size Preset */}
          {activeDrawingTool === 'highlighter' && (
            <div className="flex items-center gap-1.5 pl-1 pr-1.5 border-l border-zinc-200">
              {HIGHLIGHTER_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setActiveStrokeColor(c.value)}
                  title={c.name}
                  className={`w-3.5 h-3.5 rounded-full ${c.bg} transition-transform ${
                    activeStrokeColor === c.value ? 'scale-125 ring-2 ring-zinc-600' : 'opacity-60 hover:opacity-100'
                  }`}
                />
              ))}

              <div className="w-[1px] h-3 bg-zinc-200 mx-0.5" />

              {HIGHLIGHTER_SIZES.map((s) => (
                <button
                  key={s.size}
                  onClick={() => setActiveStrokeSize(s.size)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                    activeStrokeSize === s.size
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-500 hover:bg-zinc-100'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {/* 3. Pen Tool */}
          <button
            onClick={() => setActiveDrawingTool('pen')}
            title="手寫筆 (手繪圈選筆記)"
            className={`p-1.5 rounded-full transition-all flex items-center gap-1 ${
              activeDrawingTool === 'pen'
                ? 'bg-blue-100 text-blue-950 ring-2 ring-blue-400 font-medium'
                : 'hover:bg-zinc-100 text-zinc-600'
            }`}
          >
            <PenTool className="w-3.5 h-3.5 text-blue-600" />
            {activeDrawingTool === 'pen' && (
              <span className="text-[11px] font-sans pr-1">手寫筆</span>
            )}
          </button>

          {/* Pen Color Choices & Size Preset */}
          {activeDrawingTool === 'pen' && (
            <div className="flex items-center gap-1.5 pl-1 pr-1.5 border-l border-zinc-200">
              {PEN_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setActiveStrokeColor(c.value)}
                  title={c.name}
                  className={`w-3.5 h-3.5 rounded-full ${c.bg} transition-transform ${
                    activeStrokeColor === c.value ? 'scale-125 ring-2 ring-zinc-600' : 'opacity-60 hover:opacity-100'
                  }`}
                />
              ))}

              <div className="w-[1px] h-3 bg-zinc-200 mx-0.5" />

              {PEN_SIZES.map((s) => (
                <button
                  key={s.size}
                  onClick={() => setActiveStrokeSize(s.size)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                    activeStrokeSize === s.size
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-500 hover:bg-zinc-100'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {/* 4. Selective Eraser Tool (點選單筆劃線刪除) */}
          <button
            onClick={() => setActiveDrawingTool('eraser')}
            title="橡皮擦 (點選或滑過任一劃線即可單獨刪除那一段)"
            className={`p-1.5 rounded-full transition-all flex items-center gap-1 ${
              activeDrawingTool === 'eraser'
                ? 'bg-red-100 text-red-950 ring-2 ring-red-400 font-medium'
                : 'hover:bg-zinc-100 text-zinc-600'
            }`}
          >
            <Eraser className="w-3.5 h-3.5 text-red-500" />
            {activeDrawingTool === 'eraser' && (
              <span className="text-[11px] font-sans pr-1">橡皮擦</span>
            )}
          </button>

          {/* 5. Undo Last Stroke (復原上一筆) */}
          <button
            onClick={() => undoStroke(currentPage)}
            title="復原上一筆 (Ctrl+Z)"
            className="p-1.5 rounded-full hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 transition-colors"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="w-[1px] h-4 bg-zinc-200 mx-1" />

        {/* Zoom & Rotate */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setScale((s) => Math.max(0.6, s - 0.15))}
            title="縮小"
            className="p-1 rounded-full hover:bg-zinc-100 transition-colors"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <span className="font-mono text-[11px] w-9 text-center select-none text-zinc-500">
            {Math.round(scale * 100)}%
          </span>

          <button
            onClick={() => setScale((s) => Math.min(2.5, s + 0.15))}
            title="放大"
            className="p-1 rounded-full hover:bg-zinc-100 transition-colors"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setRotation((r) => r + 90)}
            title="旋轉 90°"
            className="p-1 rounded-full hover:bg-zinc-100 transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          <label
            title="開啟或更換新論文"
            className="p-1 rounded-full hover:bg-zinc-100 transition-colors cursor-pointer text-zinc-700"
          >
            <Upload className="w-3.5 h-3.5" />
            <input
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) loadPdf(f);
              }}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
