'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useReaderStore } from '@/store/useReaderStore';
import { LeftSidebar } from './LeftSidebar';
import { PDFViewer } from '../pdf/PDFViewer';
import { TranslationView } from '../agent/TranslationView';
import { GripVertical } from 'lucide-react';

export function SplitView() {
  const { splitRatio, setSplitRatio } = useReaderStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);

  // Prevent browser default behavior of navigating away when dropping files outside DropZone
  useEffect(() => {
    const preventDragDefault = (e: DragEvent) => {
      e.preventDefault();
    };
    window.addEventListener('dragover', preventDragDefault);
    window.addEventListener('drop', preventDragDefault);
    return () => {
      window.removeEventListener('dragover', preventDragDefault);
      window.removeEventListener('drop', preventDragDefault);
    };
  }, []);

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
    </div>
  );
}
