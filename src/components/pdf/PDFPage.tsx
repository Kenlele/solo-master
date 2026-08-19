'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Highlighter } from 'lucide-react';
import { useReaderStore } from '@/store/useReaderStore';
import { DrawStroke, DrawPoint } from '@/types/reader';

interface PDFPageProps {
  pageNumber: number;
  scale: number;
  rotation: number;
  renderPage: (pageNumber: number, canvas: HTMLCanvasElement, scale: number, rotation: number) => Promise<void>;
  extractPageText: (pageNumber: number) => Promise<string>;
  onVisible?: (pageNumber: number) => void;
}

// Distance from point (px, py) to line segment (x1, y1) - (x2, y2)
function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

export function PDFPage({
  pageNumber,
  scale,
  rotation,
  renderPage,
  extractPageText,
  onVisible,
}: PDFPageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const annotationCanvasRef = useRef<HTMLCanvasElement>(null);

  const [isRendering, setIsRendering] = useState(true);
  const [hasRendered, setHasRendered] = useState(false);
  const [inView, setInView] = useState(false);

  // Drawing state
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef<DrawPoint[]>([]);

  const {
    currentPage,
    file,
    activeDrawingTool,
    activeStrokeColor,
    activeStrokeSize,
    annotations,
    addStroke,
    removeStroke,
  } = useReaderStore();

  const isCurrent = currentPage === pageNumber;
  const isDrawingMode = activeDrawingTool === 'highlighter' || activeDrawingTool === 'pen';
  const isEraserMode = activeDrawingTool === 'eraser';

  // Saved strokes for this page
  const pageStrokes = (file && annotations[file.id]?.[pageNumber]) || [];

  // Redraw annotation strokes onto overlay canvas (completely isolated from base PDF render)
  const redrawAnnotations = useCallback(() => {
    const canvas = annotationCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (pageStrokes.length === 0) return;

    ctx.save();
    ctx.scale(dpr, dpr);

    pageStrokes.forEach((stroke) => {
      if (stroke.points.length === 0) return;

      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size * scale;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = 'source-over';

      const firstPoint = stroke.points[0];
      ctx.moveTo(firstPoint.x * width, firstPoint.y * height);

      if (stroke.points.length === 1) {
        ctx.lineTo(firstPoint.x * width + 0.1, firstPoint.y * height + 0.1);
      } else {
        for (let i = 1; i < stroke.points.length; i++) {
          const pt = stroke.points[i];
          ctx.lineTo(pt.x * width, pt.y * height);
        }
      }

      ctx.stroke();
    });

    ctx.restore();
  }, [pageStrokes, scale]);

  // Viewport Intersection Observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            if (entry.intersectionRatio > 0.45) {
              onVisible?.(pageNumber);
            }
          }
        });
      },
      {
        threshold: [0.1, 0.5, 0.8],
        rootMargin: '250px 0px',
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [pageNumber, onVisible]);

  // Render PDF base canvas - ONLY depends on scale, rotation, inView, and pageNumber
  useEffect(() => {
    let isCancelled = false;

    async function doRender() {
      if (!pdfCanvasRef.current || !inView) return;
      setIsRendering(true);

      try {
        await renderPage(pageNumber, pdfCanvasRef.current, scale, rotation);
        if (!isCancelled) {
          setIsRendering(false);
          setHasRendered(true);
          extractPageText(pageNumber);

          // Synchronize overlay annotation canvas dimensions with base canvas
          if (annotationCanvasRef.current && pdfCanvasRef.current) {
            const baseCanvas = pdfCanvasRef.current;
            const annoCanvas = annotationCanvasRef.current;
            annoCanvas.width = baseCanvas.width;
            annoCanvas.height = baseCanvas.height;
            annoCanvas.style.width = baseCanvas.style.width;
            annoCanvas.style.height = baseCanvas.style.height;
          }
        }
      } catch (err: any) {
        if (!isCancelled) {
          setIsRendering(false);
        }
      }
    }

    doRender();

    return () => {
      isCancelled = true;
    };
  }, [pageNumber, scale, rotation, inView, renderPage, extractPageText]);

  // Redraw annotations when strokes or hasRendered state changes (SEPARATE from PDF rendering)
  useEffect(() => {
    if (hasRendered) {
      redrawAnnotations();
    }
  }, [pageStrokes, hasRendered, redrawAnnotations]);

  // Helper to extract normalized point
  const getNormalizedPoint = (e: React.MouseEvent | React.TouchEvent): DrawPoint | null => {
    const canvas = annotationCanvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

    return { x, y };
  };

  // Check and erase hit stroke
  const checkAndEraseStrokeAtPoint = (pt: DrawPoint) => {
    const canvas = annotationCanvasRef.current;
    if (!canvas) return;

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    const clickX = pt.x * width;
    const clickY = pt.y * height;

    for (let sIdx = pageStrokes.length - 1; sIdx >= 0; sIdx--) {
      const stroke = pageStrokes[sIdx];
      const threshold = Math.max(15, (stroke.size * scale) / 2 + 10);

      for (let i = 0; i < stroke.points.length - 1; i++) {
        const p1 = stroke.points[i];
        const p2 = stroke.points[i + 1];
        const dist = distToSegment(
          clickX,
          clickY,
          p1.x * width,
          p1.y * height,
          p2.x * width,
          p2.y * height
        );

        if (dist <= threshold) {
          removeStroke(pageNumber, stroke.id);
          return;
        }
      }

      if (stroke.points.length === 1) {
        const p = stroke.points[0];
        const dist = Math.hypot(clickX - p.x * width, clickY - p.y * height);
        if (dist <= threshold) {
          removeStroke(pageNumber, stroke.id);
          return;
        }
      }
    }
  };

  // Start Drawing / Erasing
  const handleStartDraw = (e: React.MouseEvent | React.TouchEvent) => {
    const pt = getNormalizedPoint(e);
    if (!pt) return;

    if (isEraserMode) {
      isDrawingRef.current = true;
      checkAndEraseStrokeAtPoint(pt);
      return;
    }

    if (!isDrawingMode) return;

    isDrawingRef.current = true;
    currentStrokeRef.current = [pt];

    const canvas = annotationCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.beginPath();
    ctx.strokeStyle = activeStrokeColor;
    ctx.lineWidth = activeStrokeSize * scale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = 'source-over';

    ctx.moveTo(pt.x * width, pt.y * height);
  };

  // Move Drawing / Erasing
  const handleMoveDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current) return;
    const pt = getNormalizedPoint(e);
    if (!pt) return;

    if (isEraserMode) {
      checkAndEraseStrokeAtPoint(pt);
      return;
    }

    if (!isDrawingMode) return;
    currentStrokeRef.current.push(pt);

    const canvas = annotationCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    ctx.lineTo(pt.x * width, pt.y * height);
    ctx.stroke();
  };

  // End Drawing
  const handleEndDraw = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    if (isEraserMode) return;

    const canvas = annotationCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.restore();
    }

    if (currentStrokeRef.current.length > 0) {
      const newStroke: DrawStroke = {
        id: `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        tool: activeDrawingTool as 'highlighter' | 'pen',
        color: activeStrokeColor,
        size: activeStrokeSize,
        points: currentStrokeRef.current,
      };

      addStroke(pageNumber, newStroke);
      currentStrokeRef.current = [];
    }
  };

  return (
    <div
      ref={containerRef}
      id={`pdf-page-${pageNumber}`}
      className={`relative mx-auto my-3 transition-all duration-150 rounded-xs bg-white shadow-sm border select-none ${
        isCurrent
          ? 'ring-2 ring-zinc-400/80 border-zinc-300 shadow-md'
          : 'border-zinc-200 hover:border-zinc-300'
      }`}
      style={{
        minHeight: hasRendered ? undefined : `${650 * scale}px`,
        minWidth: hasRendered ? undefined : `${480 * scale}px`,
      }}
    >
      {/* Top Left Page Badge */}
      <div className="absolute top-2 left-2 z-20 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-zinc-900/80 text-white shadow-xs pointer-events-none">
        {pageNumber}
      </div>

      {/* Note / Highlight count badge */}
      {pageStrokes.length > 0 && (
        <div 
          className="absolute top-2 right-2 z-20 px-2 py-0.5 rounded-full text-[10px] font-medium bg-yellow-100/90 text-yellow-800 border border-yellow-300 shadow-xs flex items-center gap-1 pointer-events-none"
        >
          <Highlighter className="w-2.5 h-2.5 text-yellow-600" />
          <span>{pageStrokes.length} 處筆記</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {isRendering && !hasRendered && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 z-5">
          <div className="w-5 h-5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin mb-1.5" />
          <span className="text-[11px] text-zinc-400">載入第 {pageNumber} 頁...</span>
        </div>
      )}

      {/* 1. Base PDF Vector Canvas */}
      <canvas
        ref={pdfCanvasRef}
        className="block max-w-full h-auto mx-auto"
      />

      {/* 2. Freehand Annotation Overlay Canvas with Optical Multiply Blend */}
      <canvas
        ref={annotationCanvasRef}
        onMouseDown={handleStartDraw}
        onMouseMove={handleMoveDraw}
        onMouseUp={handleEndDraw}
        onMouseLeave={handleEndDraw}
        onTouchStart={handleStartDraw}
        onTouchMove={handleMoveDraw}
        onTouchEnd={handleEndDraw}
        style={{ mixBlendMode: 'multiply' }}
        className={`absolute inset-0 z-10 touch-none ${
          isEraserMode
            ? 'cursor-pointer'
            : isDrawingMode
            ? 'cursor-crosshair'
            : 'pointer-events-none'
        }`}
      />
    </div>
  );
}
