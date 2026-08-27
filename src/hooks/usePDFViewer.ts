'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from 'pdfjs-dist';
import { useReaderStore } from '@/store/useReaderStore';
import { savePdfToStorage } from '@/lib/pdfCache';

let pdfjsLibPromise: Promise<typeof import('pdfjs-dist')> | null = null;
let activePdfDoc: PDFDocumentProxy | null = null;

async function getPdfjsLib() {
  if (typeof window === 'undefined') {
    throw new Error('PDF.js can only be loaded in the browser');
  }
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = import('pdfjs-dist').then((pdfjs) => {
      if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
      }
      return pdfjs;
    });
  }
  return pdfjsLibPromise;
}

export function usePDFViewer() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const renderTasksRef = useRef<Map<number, RenderTask>>(new Map());

  const {
    setFile,
    setTotalPages,
    setExtractedPageText,
  } = useReaderStore();

  /**
   * Load PDF from File, ArrayBuffer, or URL with local filePath support & auto local folder caching
   */
  const loadPdf = useCallback(
    async (source: File | ArrayBuffer | string, customName?: string, customFilePath?: string, customDocId?: string) => {
      setIsLoading(true);
      setError(null);

      // Cancel all existing page render tasks
      renderTasksRef.current.forEach((task) => {
        try {
          task.cancel();
        } catch {}
      });
      renderTasksRef.current.clear();

      // Clean destroy previous PDF document instance
      if (activePdfDoc) {
        try {
          activePdfDoc.destroy();
        } catch {}
        activePdfDoc = null;
      }

      try {
        const pdfjs = await getPdfjsLib();
        let arrayBuffer: ArrayBuffer | undefined;
        let fileName = customName || 'paper.pdf';
        let fileSize = 0;
        let docId = customDocId || '';
        let resolvedFilePath = customFilePath;

        let loadingTask;

        if (source instanceof File) {
          fileName = source.name;
          fileSize = source.size;
          docId = customDocId || `doc-${source.name}-${source.size}`;
          
          const rawBuffer = await source.arrayBuffer();
          // Clone buffers safely: one for PDF.js worker (may be detached) and one for storage
          const bufferForPdf = rawBuffer.slice(0);
          const bufferForStorage = rawBuffer.slice(0);
          arrayBuffer = bufferForStorage;

          // Save to IndexedDB immediately before worker detachment
          savePdfToStorage(docId, bufferForStorage);

          loadingTask = pdfjs.getDocument({
            data: new Uint8Array(bufferForPdf),
            cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
            cMapPacked: true,
          });

          // Upload/copy to server-side local storage folder (storage/papers/)
          try {
            const formData = new FormData();
            formData.append('file', source);
            formData.append('id', docId);
            fetch('/api/agent/file', {
              method: 'POST',
              body: formData,
            }).then(async (res) => {
              if (res.ok) {
                const data = await res.json();
                if (data.storagePath) {
                  resolvedFilePath = data.storagePath;
                  useReaderStore.getState().addOrUpdateHistory({
                    id: docId,
                    name: fileName,
                    filePath: data.storagePath,
                  });
                }
              }
            }).catch(() => {});
          } catch {}

        } else if (source instanceof ArrayBuffer) {
          fileSize = source.byteLength;
          docId = customDocId || `doc-${fileName}-${fileSize}`;

          const bufferForPdf = source.slice(0);
          const bufferForStorage = source.slice(0);
          arrayBuffer = bufferForStorage;

          savePdfToStorage(docId, bufferForStorage);

          loadingTask = pdfjs.getDocument({
            data: new Uint8Array(bufferForPdf),
            cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
            cMapPacked: true,
          });

          // Upload/copy arrayBuffer to server storage
          try {
            const blob = new Blob([bufferForStorage], { type: 'application/pdf' });
            const formData = new FormData();
            formData.append('file', blob, fileName);
            formData.append('id', docId);
            fetch('/api/agent/file', {
              method: 'POST',
              body: formData,
            }).then(async (res) => {
              if (res.ok) {
                const data = await res.json();
                if (data.storagePath) {
                  resolvedFilePath = data.storagePath;
                  useReaderStore.getState().addOrUpdateHistory({
                    id: docId,
                    name: fileName,
                    filePath: data.storagePath,
                  });
                }
              }
            }).catch(() => {});
          } catch {}

        } else {
          // Remote URL or local API URL
          fileName = customName || source.split('/').pop() || 'paper.pdf';
          docId = customDocId || `doc-${fileName}`;
          loadingTask = pdfjs.getDocument({
            url: source,
            cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
            cMapPacked: true,
          });
        }

        const doc = await loadingTask.promise;
        activePdfDoc = doc;

        setFile({
          id: docId,
          name: fileName,
          size: fileSize,
          totalPages: doc.numPages,
          filePath: resolvedFilePath,
          arrayBuffer,
          url: typeof source === 'string' ? source : undefined,
        });

        setTotalPages(doc.numPages);
        setIsLoading(false);
        return doc;
      } catch (err: any) {
        console.error('Failed to load PDF:', err);
        const errMsg = err?.message || '無法解析該 PDF 檔案，請確認檔案格式是否正確。';
        setError(errMsg);
        setIsLoading(false);
        throw err;
      }
    },
    [setFile, setTotalPages]
  );

  /**
   * Extract text from a specific page
   */
  const extractPageText = useCallback(
    async (pageNumber: number): Promise<string> => {
      if (!activePdfDoc) return '';

      try {
        const page: PDFPageProxy = await activePdfDoc.getPage(pageNumber);
        const textContent = await page.getTextContent();
        const items = textContent.items as any[];
        if (!items || items.length === 0) return '';

        let pageText = '';
        let lastY: number | null = null;

        for (const item of items) {
          if (!('str' in item)) continue;
          const currentY = item.transform ? item.transform[5] : null;

          if (lastY !== null && currentY !== null && Math.abs(currentY - lastY) > 8) {
            pageText += '\n';
          } else if (pageText.length > 0 && !pageText.endsWith(' ') && !pageText.endsWith('\n')) {
            pageText += ' ';
          }

          pageText += item.str;
          lastY = currentY;
        }

        const cleanText = pageText.replace(/[\r\n]{3,}/g, '\n\n').trim();
        setExtractedPageText(pageNumber, cleanText);
        return cleanText;
      } catch {
        return '';
      }
    },
    [setExtractedPageText]
  );

  /**
   * Render a specific page to an HTML5 Canvas with concurrency safety
   */
  const renderPage = useCallback(
    async (
      pageNumber: number,
      canvas: HTMLCanvasElement,
      scale: number,
      rotation: number = 0
    ) => {
      if (!activePdfDoc || !canvas) return;

      const existingTask = renderTasksRef.current.get(pageNumber);
      if (existingTask) {
        try {
          existingTask.cancel();
        } catch {}
        renderTasksRef.current.delete(pageNumber);
      }

      try {
        const page: PDFPageProxy = await activePdfDoc.getPage(pageNumber);
        const viewport = page.getViewport({ scale, rotation });
        const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
          canvas: canvas,
        };

        const renderTask = page.render(renderContext);
        renderTasksRef.current.set(pageNumber, renderTask);

        await renderTask.promise;
        renderTasksRef.current.delete(pageNumber);
      } catch (err: any) {
        if (err?.name === 'RenderingCancelledException') {
          return;
        }
        console.warn(`Render page ${pageNumber} notice:`, err?.message || err);
      }
    },
    []
  );

  useEffect(() => {
    return () => {
      renderTasksRef.current.forEach((task) => {
        try {
          task.cancel();
        } catch {}
      });
      renderTasksRef.current.clear();
    };
  }, []);

  return {
    pdfDoc: activePdfDoc,
    isLoading,
    error,
    loadPdf,
    extractPageText,
    renderPage,
  };
}
