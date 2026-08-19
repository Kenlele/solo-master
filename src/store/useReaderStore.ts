import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { 
  ReaderState, 
  TranslationItem, 
  PDFFileInfo,
  DocumentHistoryItem,
  DrawingTool,
  DrawStroke
} from '@/types/reader';

export const useReaderStore = create<ReaderState>()(
  persist(
    (set, get) => ({
      // PDF File & Doc
      file: null,
      currentPage: 1,
      totalPages: 0,
      scale: 1.15,
      rotation: 0,

      // Left Sidebar & Drawing Tools
      isLeftSidebarOpen: true,
      activeDrawingTool: 'cursor' as DrawingTool,
      activeStrokeColor: 'rgba(250, 204, 21, 0.4)', // Translucent yellow highlighter
      activeStrokeSize: 22,
      annotations: {},

      // History
      history: [],
      splitRatio: 50,
      isStreaming: false,

      // Cache
      extractedPages: {},
      translationsCache: {},

      // Actions
      setFile: (file: PDFFileInfo | null) => {
        if (!file) {
          set({
            file: null,
            currentPage: 1,
            totalPages: 0,
            extractedPages: {},
            translationsCache: {},
          });
          return;
        }

        const existingHistory = get().history.find((h) => h.id === file.id || (file.filePath && h.filePath === file.filePath));
        const startPage = existingHistory?.lastReadPage || 1;

        set({ 
          file, 
          currentPage: startPage, 
          totalPages: file.totalPages || 0,
          extractedPages: {},
          translationsCache: {},
        });

        get().addOrUpdateHistory({
          id: file.id,
          name: file.name,
          size: file.size,
          totalPages: file.totalPages,
          lastReadPage: startPage,
          lastReadTime: Date.now(),
          filePath: file.filePath || existingHistory?.filePath,
          url: file.url,
        });
      },

      setCurrentPage: (currentPage: number) => {
        const { totalPages, currentPage: prevPage, file } = get();
        if (currentPage === prevPage) return;
        const validPage = Math.max(1, totalPages > 0 ? Math.min(currentPage, totalPages) : currentPage);
        
        set({ currentPage: validPage });

        if (file) {
          get().addOrUpdateHistory({
            id: file.id,
            name: file.name,
            lastReadPage: validPage,
            lastReadTime: Date.now(),
            filePath: file.filePath,
          });
        }
      },

      setTotalPages: (totalPages: number) => {
        set({ totalPages });
        const { file } = get();
        if (file) {
          get().addOrUpdateHistory({
            id: file.id,
            name: file.name,
            totalPages,
            filePath: file.filePath,
          });
        }
      },

      setScale: (scaleOrUpdater) => set((state) => {
        const newScale = typeof scaleOrUpdater === 'function' ? scaleOrUpdater(state.scale) : scaleOrUpdater;
        return { scale: Math.max(0.5, Math.min(3.0, Math.round(newScale * 100) / 100)) };
      }),

      setRotation: (rotationOrUpdater) => set((state) => {
        const newRot = typeof rotationOrUpdater === 'function' ? rotationOrUpdater(state.rotation) : rotationOrUpdater;
        return { rotation: (newRot % 360 + 360) % 360 };
      }),

      setSplitRatio: (splitRatio: number) => set({ splitRatio: Math.max(20, Math.min(80, splitRatio)) }),
      setIsLeftSidebarOpen: (isOpen: boolean) => set({ isLeftSidebarOpen: isOpen }),
      
      // Annotation Tool Selection
      setActiveDrawingTool: (tool: DrawingTool) => {
        set({ activeDrawingTool: tool });
        if (tool === 'highlighter') {
          set({
            activeStrokeColor: 'rgba(250, 204, 21, 0.4)',
            activeStrokeSize: 22,
          });
        } else if (tool === 'pen') {
          set({
            activeStrokeColor: '#2563eb',
            activeStrokeSize: 2.5,
          });
        }
      },

      setActiveStrokeColor: (color: string) => set({ activeStrokeColor: color }),
      setActiveStrokeSize: (size: number) => set({ activeStrokeSize: size }),

      // Add Stroke
      addStroke: (pageNumber: number, stroke: DrawStroke) => {
        const { file } = get();
        if (!file) return;

        set((state) => {
          const docAnnotations = state.annotations[file.id] || {};
          const pageStrokes = docAnnotations[pageNumber] || [];

          return {
            annotations: {
              ...state.annotations,
              [file.id]: {
                ...docAnnotations,
                [pageNumber]: [...pageStrokes, stroke],
              },
            },
          };
        });
      },

      // Delete specific single stroke (Eraser click)
      removeStroke: (pageNumber: number, strokeId: string) => {
        const { file } = get();
        if (!file) return;

        set((state) => {
          const docAnnotations = state.annotations[file.id] || {};
          const pageStrokes = docAnnotations[pageNumber] || [];

          return {
            annotations: {
              ...state.annotations,
              [file.id]: {
                ...docAnnotations,
                [pageNumber]: pageStrokes.filter((s) => s.id !== strokeId),
              },
            },
          };
        });
      },

      // Undo last stroke on this page
      undoStroke: (pageNumber: number) => {
        const { file } = get();
        if (!file) return;

        set((state) => {
          const docAnnotations = state.annotations[file.id] || {};
          const pageStrokes = docAnnotations[pageNumber] || [];
          if (pageStrokes.length === 0) return state;

          return {
            annotations: {
              ...state.annotations,
              [file.id]: {
                ...docAnnotations,
                [pageNumber]: pageStrokes.slice(0, -1),
              },
            },
          };
        });
      },

      // Clear all strokes for a page
      clearPageStrokes: (pageNumber: number) => {
        const { file } = get();
        if (!file) return;

        set((state) => {
          const docAnnotations = state.annotations[file.id] || {};
          return {
            annotations: {
              ...state.annotations,
              [file.id]: {
                ...docAnnotations,
                [pageNumber]: [],
              },
            },
          };
        });
      },

      // History Actions
      addOrUpdateHistory: (item) => set((state) => {
        const index = state.history.findIndex((h) => h.id === item.id || (item.filePath && h.filePath === item.filePath));
        if (index >= 0) {
          const updated = [...state.history];
          updated[index] = {
            ...updated[index],
            ...item,
            lastReadTime: Date.now(),
          };
          const [moved] = updated.splice(index, 1);
          return { history: [moved, ...updated] };
        } else {
          const newDoc: DocumentHistoryItem = {
            id: item.id,
            name: item.name,
            size: item.size || 0,
            totalPages: item.totalPages || 0,
            lastReadPage: item.lastReadPage || 1,
            lastReadTime: Date.now(),
            filePath: item.filePath,
            url: item.url,
          };
          return { history: [newDoc, ...state.history] };
        }
      }),

      removeHistoryItem: (id: string) => set((state) => ({
        history: state.history.filter((h) => h.id !== id),
      })),

      // Cache Actions
      setExtractedPageText: (pageNumber: number, text: string) => set((state) => ({
        extractedPages: {
          ...state.extractedPages,
          [pageNumber]: text,
        }
      })),

      setTranslation: (pageNumber: number, item: Partial<TranslationItem>) => set((state) => {
        const existing = state.translationsCache[pageNumber] || {
          pageNumber,
          originalText: state.extractedPages[pageNumber] || '',
          translatedMarkdown: '',
          status: 'idle',
          timestamp: Date.now(),
        };

        return {
          translationsCache: {
            ...state.translationsCache,
            [pageNumber]: {
              ...existing,
              ...item,
              pageNumber,
              timestamp: Date.now(),
            }
          }
        };
      }),

      appendTranslationStream: (pageNumber: number, chunk: string) => set((state) => {
        const existing = state.translationsCache[pageNumber] || {
          pageNumber,
          originalText: state.extractedPages[pageNumber] || '',
          translatedMarkdown: '',
          status: 'translating',
          timestamp: Date.now(),
        };

        return {
          translationsCache: {
            ...state.translationsCache,
            [pageNumber]: {
              ...existing,
              translatedMarkdown: existing.translatedMarkdown + chunk,
              status: 'translating',
              timestamp: Date.now(),
            }
          }
        };
      }),

      resetReader: () => set({
        file: null,
        currentPage: 1,
        totalPages: 0,
        extractedPages: {},
        translationsCache: {},
      }),
    }),
    {
      name: 'open-paper-reader-storage-v5',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        splitRatio: state.splitRatio,
        history: state.history,
        annotations: state.annotations,
        isLeftSidebarOpen: state.isLeftSidebarOpen,
      }),
    }
  )
);
