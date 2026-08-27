'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useReaderStore } from '@/store/useReaderStore';
import { LeftSidebar } from './LeftSidebar';
import { PDFViewer } from '../pdf/PDFViewer';
import { TranslationView } from '../agent/TranslationView';
import { GripVertical, Upload } from 'lucide-react';
import { usePDFViewer } from '@/hooks/usePDFViewer';

export function SplitView() {
  const { splitRatio, setSplitRatio } = useReaderStore();
  const { loadPdf } = usePDFViewer();
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isWindowDragOver, setIsWindowDragOver] = useState(false);
  const dragCounterRef = useRef(0);

  // Global window drag and drop listener for instant PDF loading from anywhere
  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current += 1;
      if (e.dataTransfer && e.dataTransfer.types.includes('Files')) {
        setIsWindowDragOver(true);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current -= 1;
      if (dragCounterRef.current <= 0) {
        dragCounterRef.current = 0;
        setIsWindowDragOver(false);
      }
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current = 0;
      setIsWindowDragOver(false);

      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          await loadPdf(file);
        }
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);
    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, [loadPdf]);

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

  return (
    <div className="h-screen w-screen flex overflow-hidden select-none bg-white">
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

      {/* Global Drag & Drop Overlay Indicator */}
      {isWindowDragOver && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center pointer-events-none transition-all">
          <div className="p-8 rounded-2xl bg-white border-2 border-dashed border-zinc-800 shadow-2xl flex flex-col items-center gap-3 text-center max-w-md mx-4">
            <div className="w-14 h-14 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-900 shadow-inner">
              <Upload className="w-7 h-7 animate-bounce" />
            </div>
            <div className="text-base font-bold text-zinc-900">放開以開啟新論文 PDF</div>
            <div className="text-xs text-zinc-500">當前論文進度與筆記將自動保存於歷史紀錄中</div>
          </div>
        </div>
      )}
    </div>
  );
}
