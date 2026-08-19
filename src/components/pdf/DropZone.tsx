'use client';

import React, { useState, useRef } from 'react';
import { Upload, Sparkles } from 'lucide-react';
import { usePDFViewer } from '@/hooks/usePDFViewer';

interface DropZoneProps {
  onFileSelect?: (file: File) => void;
  onSampleSelect?: (url: string, name: string) => void;
}

export function DropZone({ onFileSelect, onSampleSelect }: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { loadPdf, isLoading } = usePDFViewer();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        if (onFileSelect) {
          onFileSelect(file);
        } else {
          await loadPdf(file);
        }
      }
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (onFileSelect) {
        onFileSelect(file);
      } else {
        await loadPdf(file);
      }
    }
  };

  const handleLoadSample = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = 'https://arxiv.org/pdf/1706.03762.pdf';
    const name = 'Attention_Is_All_You_Need.pdf';
    if (onSampleSelect) {
      onSampleSelect(url, name);
    } else {
      try {
        await loadPdf(url, name);
      } catch {
        alert('線上範例載入失敗，請直接從本地拖入 PDF 檔案。');
      }
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`h-full w-full flex flex-col items-center justify-center p-8 cursor-pointer transition-all duration-150 ${
        isDragOver
          ? 'bg-zinc-100/80'
          : 'bg-[#fafafa] hover:bg-zinc-100/50'
      }`}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept="application/pdf,.pdf"
        className="hidden"
      />

      <div className="max-w-md w-full p-10 rounded-2xl border-2 border-dashed border-zinc-200 hover:border-zinc-400 flex flex-col items-center text-center bg-white shadow-xs transition-all duration-200">
        <div className="w-12 h-12 mb-4 rounded-full bg-zinc-50 border border-zinc-200 flex items-center justify-center text-zinc-600">
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-zinc-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Upload className="w-5 h-5" />
          )}
        </div>

        <h3 className="text-base font-semibold text-zinc-900 mb-1">
          {isLoading ? '正在載入並解析論文...' : '拖曳論文 PDF 至此處'}
        </h3>
        
        <p className="text-xs text-zinc-400 mb-6">
          或點擊選擇本機檔案，左側將立即呈現原文，右側即時翻譯
        </p>

        <button
          type="button"
          onClick={handleLoadSample}
          className="px-4 py-2 rounded-xl text-xs bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border border-zinc-200 transition-colors flex items-center gap-1.5 font-medium"
        >
          <Sparkles className="w-3.5 h-3.5 text-zinc-500" />
          載入範例論文 (Attention Is All You Need)
        </button>
      </div>
    </div>
  );
}
