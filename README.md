# Solo-Master

雙欄對照式學術論文閱讀與即時翻譯器  
Dual-Pane Academic Paper Reader & Real-Time Contextual Translator

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-black?style=flat-square)](./LICENSE)

Solo-Master 是一款專為研究員與工程師打造的雙欄滿版學術 PDF 閱讀器。左欄採用向量畫布即時渲染論文原文，右欄即時串流輸出繁體中文翻譯與結構化核心重點；整合光學透光手繪註解系統、本地專案檔案暫存同步機制，以及本地 AI Agent CLI 呼叫橋接。

---

## 專案概述 (Overview)

傳統學術論文翻譯流程通常伴隨嚴重的上下文切換或排版破壞問題：
- **段落複製貼上**：數學公式與排版遺失、閱讀節奏中斷，且需頻繁在多視窗間切換。
- **全頁機器翻譯**：以不穩定的 HTML 取代原始 PDF 向量版面，導致圖表與表格錯位走鐘。
- **繁瑣設定依賴**：常需綁定付費 API Key，且欠缺穩健的本地閱讀狀態與筆記持久化。

Solo-Master 透過 1:1 原文對照分割引擎解決上述問題，在維持 PDF 原文向量排版精度的同時，提供低延遲的學術繁中即時翻譯。

---

## 核心能力 (Key Capabilities)

### 1. 雙欄同步對照閱讀器 (Synchronous Dual-Pane Reader)
- **視口即時追蹤**：動態感測當前可視 PDF 頁面，即時串流輸出繁體中文翻譯與技術要點整理。
- **滿版無干擾佈局**：極簡白淨介面，配備可拖曳調節寬度的虛線分隔線，消除冗餘操作干擾。

### 2. 光學手繪註解引擎 (Optical Freehand Annotation Engine)
- **真·光學透光螢光筆**：採用硬體加速光學乘法混合模式（`mix-blend-mode: multiply`），手繪筆跡 100% 不遮擋底層英文黑字印刷。
- **單筆點選橡皮擦**：基於向量線段距離演算法，點擊單一筆跡即可獨立刪除，不誤清整頁標記。
- **復原與筆觸控制**：內建歷史操作堆疊，支援快捷鍵 `Ctrl + Z` / `⌘ + Z` 復原上一筆，提供細／中／粗三段筆觸預設。

### 3. 本地儲存同步與持久化 (Local Storage Sync & Persistence)
- **自動本機暫存**：上傳之論文自動備份至專案本地目錄（`storage/papers/`），徹底消除重啟後歷史路徑丟失問題。
- **連動安全清理**：於歷史紀錄點選刪除時，同步清理磁碟對應檔案，避免無效佔用空間。
- **全視窗隨時拖曳即開**：在閱讀過程中將新 PDF 拖入視窗任意處，系統自動封裝歸檔舊文並即刻加載新論文。

### 4. Agent 與 CLI 整合 (Agent & CLI Integration)
- **Slash Command 支援**：內建 Antigravity Agent Skill（`/solo-master <path>`），可直接於 Agent 對話中開啟指定論文。
- **終端機連線工具**：提供獨立 Node CLI 橋接腳本，支援自外部 Shell 終端推送本機 PDF 路徑至閱讀器。

---

## 系統架構 (Architecture)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SOLO-MASTER WORKSPACE                              │
├──────────────┬───────────────────────────────┬──────────────────────────────┤
│ Left Sidebar │ Left Column: Original PDF     │ Right Column: Live Stream    │
│              │                               │                              │
│ - 閱讀歷史   │ - PDF.js 向量畫布渲染層       │ - 神經網路學術繁中即時翻譯   │
│ - 筆記標記   │ - 光學透光手繪註解層          │ - 結構化核心重點提煉         │
│ - 本地同步   │ - 全視窗拖曳開文監聽          │ - 本地 Agent 橋接連線狀態    │
└──────────────┴───────────────────────────────┴──────────────────────────────┘
```

---

## 快速開始 (Getting Started)

### 環境安裝

```bash
git clone https://github.com/Kenlele/solo-master.git
cd solo-master
npm install
```

### 啟動服務

```bash
npm run dev
```

---

## Agent 與 CLI 使用說明 (Usage)

### 終端機 CLI 推送
於本機終端機將指定 PDF 檔案推送至閱讀器：

```bash
npm run solo-master -- /path/to/paper.pdf
```

或直接以 Node 執行：
```bash
node bin/solo-master.mjs /path/to/paper.pdf
```

### AI Agent Skill 呼叫
於工作區與 AI Agent 對話時，可直接輸入 Slash Command 指令：

```text
/solo-master ./path/to/paper.pdf
```

---

## 技術棧 (Tech Stack)

| 層級 (Layer) | 技術選型 (Technology) |
| :--- | :--- |
| **應用框架 (Framework)** | Next.js 16 (App Router, Turbopack) |
| **執行環境與語言 (Runtime & Language)** | React 19, TypeScript 5, Node.js |
| **樣式系統 (Styling)** | Tailwind CSS v4, Lucide Icons |
| **PDF 核心引擎 (PDF Rendering)** | Mozilla PDF.js v5.x |
| **狀態與快取 (State & Cache)** | Zustand, IndexedDB, 本地伺服器磁碟存儲 (`storage/papers/`) |
| **翻譯引擎 (Translation Engine)** | 神經網路學術翻譯串流（支援本地 Ollama 守護進程自動掛載） |

---

## 專案目錄結構 (Project Structure)

```text
solo_master/
├── .agent/skills/solo-master/   # Agent Skill 指令定義檔
├── bin/
│   └── solo-master.mjs          # 獨立 CLI 終端推送橋接腳本
├── src/
│   ├── app/
│   │   ├── api/agent/
│   │   │   ├── file/            # 本地暫存檔案讀取與刪除端點
│   │   │   ├── open-pdf/        # Agent CLI 接收端點
│   │   │   └── stream/          # 學術翻譯 SSE 串流路由
│   │   └── page.tsx             # 雙欄核心入口容器
│   ├── components/
│   │   ├── agent/               # 即時翻譯視圖與 Agent 狀態指示
│   │   ├── layout/              # 滿版 SplitView 與歷史閱讀側邊欄
│   │   └── pdf/                 # PDF 畫布與光學手繪註解層
│   ├── hooks/                   # PDF.js 渲染與 Agent 串流 Hook
│   ├── lib/                     # IndexedDB 二進位本地持久化模組
│   └── store/                   # Zustand 全域狀態管理
└── storage/papers/              # 本機論文暫存資料夾 (自動維護)
```

---

## 授權協議 (License)

本專案採用 [MIT License](./LICENSE) 授權開源。
