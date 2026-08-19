'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useReaderStore } from '@/store/useReaderStore';
import { usePDFViewer } from '@/hooks/usePDFViewer';
import { LeftSidebar } from './LeftSidebar';
import { PDFViewer } from '../pdf/PDFViewer';
import { TranslationView } from '../agent/TranslationView';
import { GripVertical, UploadCloud } from 'lucide-react';

export function SplitView() {
  const { splitRatio, setSplitRatio } = useReaderStore();
  const { loadPdf } = usePDFViewer();

  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isGlobalDragOver, setIsGlobalDragOver] = useState(false);
  const dragCounterRef = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    setIsDragging(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !containerRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const currentX = e.clientX - containerRect.left;
      const newRatio = (currentX / containerRect.width) * 100;
      
      setSplitRatio(newRatio);
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setIsDragging(false);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [setSplitRatio]);

  // Global Drag & Drop Handler (allows dropping a new PDF at any time while reading)
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.types.includes('Files')) {
      setIsGlobalDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      setIsGlobalDragOver(false);
      dragCounterRef.current = 0;
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsGlobalDragOver(false);
    dragCounterRef.current = 0;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        await loadPdf(file);
      } else {
        alert('請上傳 PDF 格式論文檔案 (.pdf)');
      }
    }
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="h-screen w-screen flex overflow-hidden select-none bg-white relative"
    >
      {/* 1. 最左側功能 Bar：歷史閱讀紀錄與筆記 */}
      <LeftSidebar />

      {/* 2. 雙欄主視圖容器 */}
      <div
        ref={containerRef}
        className={`flex-1 h-full flex overflow-hidden relative ${
          isDragging ? 'cursor-col-resize select-none' : ''
        }`}
      >
        {/* 左欄：論文原文 (PDF View) */}
        <div
          style={{ width: `${splitRatio}%` }}
          className="h-full overflow-hidden flex flex-col min-w-[300px]"
        >
          <PDFViewer />
        </div>

        {/* 虛線區隔線 (Dashed Divider Line) */}
        <div
          onMouseDown={handleMouseDown}
          className={`w-3 -mx-1.5 cursor-col-resize relative z-30 flex items-center justify-center shrink-0 group ${
            isDragging ? 'bg-zinc-100/60' : ''
          }`}
        >
          <div className="h-full w-0 border-r-2 border-dashed border-zinc-300 group-hover:border-zinc-500 transition-colors" />
          <div className="absolute top-1/2 -translate-y-1/2 p-1 rounded-md bg-white border border-zinc-200 text-zinc-400 shadow-xs opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="w-3 h-3" />
          </div>
        </div>

        {/* 右欄：即時中文翻譯 (Live Translation View) */}
        <div
          style={{ width: `${100 - splitRatio}%` }}
          className="h-full overflow-hidden flex flex-col min-w-[300px] bg-white"
        >
          <TranslationView />
        </div>
      </div>

      {/* Global Drag-to-Open Overlay (when dragging new PDF over window) */}
      {isGlobalDragOver && (
        <div className="absolute inset-0 z-50 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center p-8 border-4 border-dashed border-zinc-500 animate-in fade-in duration-150 pointer-events-none">
          <div className="w-16 h-16 rounded-3xl bg-zinc-900 text-white flex items-center justify-center mb-4 shadow-xl scale-110 transition-transform">
            <UploadCloud className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-zinc-900 mb-2">
            放開以開啟新論文
          </h2>
          <p className="text-sm text-zinc-500 max-w-sm text-center">
            當前閱讀的論文與手繪筆記將自動保存至左側「歷史紀錄」，並立即切換至新文章。
          </p>
        </div>
      )}
    </div>
  );
}
