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

export const DEFAULT_SYSTEM_PROMPT = `你是一位頂尖專業的電腦科學與 AI 學術論文翻譯專家。請將輸入的英文學術內容翻譯為專業、通順、精準的台灣繁體中文。
要求：
1. 【純翻譯】：100% 忠實對照原文逐段翻譯，嚴禁輸出任何結論、心得、額外解讀或摘要。
2. 【專有名詞】：專業術語請保留中英對照（例如：自注意力機制 Self-Attention、多頭注意力機制 Multi-Head Attention、殘差連接 Residual Connection、位置編碼 Positional Encoding）。
3. 【排版與公式】：完整保留數學符號、公式變數（如 $W_Q$, $\text{Softmax}$）與原始段落層次。`;

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

      // Cache & Translation Settings
      extractedPages: {},
      translationsCache: {},
      translationSettings: {
        systemPrompt: DEFAULT_SYSTEM_PROMPT,
        provider: 'auto',
        apiKey: '',
        apiEndpoint: '',
        modelName: '',
      },

      // Actions
      setTranslationSettings: (newSettings) =>
        set((state) => ({
          translationSettings: {
            ...state.translationSettings,
            ...newSettings,
          },
        })),

      setFile: (file: PDFFileInfo | null) => {
        const prevFile = get().file;
        const prevPage = get().currentPage;
        if (prevFile) {
          get().addOrUpdateHistory({
            id: prevFile.id,
            name: prevFile.name,
            lastReadPage: prevPage,
            lastReadTime: Date.now(),
            filePath: prevFile.filePath,
            totalPages: prevFile.totalPages,
          });
        }

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
        translationSettings: state.translationSettings,
      }),
    }
  )
);
