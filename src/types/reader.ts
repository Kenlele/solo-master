export type DrawingTool = 'cursor' | 'highlighter' | 'pen' | 'eraser';

export interface DrawPoint {
  x: number; // Normalized coordinate (0.0 to 1.0)
  y: number; // Normalized coordinate (0.0 to 1.0)
}

export interface DrawStroke {
  id: string;
  tool: 'highlighter' | 'pen';
  color: string;
  size: number;
  points: DrawPoint[];
}

export interface PDFFileInfo {
  id: string;
  name: string;
  size: number;
  totalPages: number;
  filePath?: string; // Local absolute disk path for history reload
  arrayBuffer?: ArrayBuffer;
  url?: string;
}

export interface DocumentHistoryItem {
  id: string;
  name: string;
  size: number;
  totalPages: number;
  lastReadPage: number;
  lastReadTime: number;
  filePath?: string; // Local absolute disk path
  arrayBuffer?: ArrayBuffer;
  url?: string;
}

export type TranslationStatus = 'idle' | 'translating' | 'completed' | 'error';

export interface TranslationItem {
  pageNumber: number;
  originalText: string;
  translatedMarkdown: string;
  status: TranslationStatus;
  error?: string;
  timestamp: number;
}

export interface TranslationSettings {
  systemPrompt: string;
  provider: 'auto' | 'custom_llm' | 'openai' | 'gemini' | 'deepseek' | 'anthropic' | 'ollama';
  apiKey?: string;
  apiEndpoint?: string;
  modelName?: string;
}

export interface ReaderState {
  // PDF File & Doc
  file: PDFFileInfo | null;
  currentPage: number;
  totalPages: number;
  scale: number;
  rotation: number;
  
  // Left Sidebar & Drawing Tools
  isLeftSidebarOpen: boolean;
  activeDrawingTool: DrawingTool;
  activeStrokeColor: string;
  activeStrokeSize: number;
  
  // Freehand Annotations: Record<fileId, Record<pageNumber, DrawStroke[]>>
  annotations: Record<string, Record<number, DrawStroke[]>>;
  
  // History
  history: DocumentHistoryItem[];
  splitRatio: number;
  
  // Extraction & Translation Cache
  extractedPages: Record<number, string>;
  translationsCache: Record<number, TranslationItem>;
  isStreaming: boolean;
  translationSettings: TranslationSettings;
  
  // Actions
  setFile: (file: PDFFileInfo | null) => void;
  setCurrentPage: (page: number) => void;
  setTotalPages: (total: number) => void;
  setScale: (scale: number | ((prev: number) => number)) => void;
  setRotation: (rotation: number | ((prev: number) => number)) => void;
  setSplitRatio: (ratio: number) => void;
  setIsLeftSidebarOpen: (isOpen: boolean) => void;
  setTranslationSettings: (settings: Partial<TranslationSettings>) => void;
  
  // Annotation Actions
  setActiveDrawingTool: (tool: DrawingTool) => void;
  setActiveStrokeColor: (color: string) => void;
  setActiveStrokeSize: (size: number) => void;
  addStroke: (pageNumber: number, stroke: DrawStroke) => void;
  removeStroke: (pageNumber: number, strokeId: string) => void;
  undoStroke: (pageNumber: number) => void;
  clearPageStrokes: (pageNumber: number) => void;
  
  // History Actions
  addOrUpdateHistory: (item: Partial<DocumentHistoryItem> & { id: string; name: string }) => void;
  removeHistoryItem: (id: string) => void;
  
  // Cache & Translation Actions
  setExtractedPageText: (pageNumber: number, text: string) => void;
  setTranslation: (pageNumber: number, item: Partial<TranslationItem>) => void;
  appendTranslationStream: (pageNumber: number, chunk: string) => void;
  resetReader: () => void;
}
