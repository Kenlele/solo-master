<div align="center">

# 📖 Solo-Master

**極簡、零干擾的雙欄對照式學術論文閱讀與即時翻譯器**  
*Minimalist, Full-Bleed Dual-Pane Academic PDF Reader & Live Translator*

[![Next.js](https://img.shields.io/badge/Next.js-16.3.1-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-emerald?style=flat-square)](./LICENSE)

<br />

[✨ 核心功能](#-核心特色) • [🚀 快速開始](#-快速開始) • [🤖 Agent 與 CLI 聯動](#-agent-與-cli-終端聯動) • [🛠️ 技術架構](#-技術架構) • [📄 授權協議](#-授權協議)

</div>

---

## 💡 為什麼打造 Solo-Master？

讀論文時，傳統的翻譯方式往往令人抓狂：
- **複製貼上派**：一段一段複製到翻譯網頁，排版亂掉、公式消失、視窗切來切去。
- **整頁機翻派**：PDF 被轉成排版走鐘的雜亂網頁，原本的圖表、排版結構全部毀滅。
- **繁瑣設定派**：動不動就要綁定付費 API Key，還常因快取丟失而找不到先前的筆記。

**Solo-Master** 為極致專注的論文閱讀而生：
**左欄 100% 還原 PDF 原文排版，右欄即時呈現流暢精準的繁體中文翻譯與重點提煉**。同時支援如 Apple Notes 般的**光學透光手繪螢光筆、單段點選橡皮擦**，並可直接從 **終端機或 AI Agent 指令** 一鍵開文！

---

## ✨ 核心特色

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 📚 SOLO-MASTER WORKSPACE (100vw × 100vh)                                    │
├──────────────┬───────────────────────────────┬──────────────────────────────┤
│ 📂 歷史與標記 │ 📄 左欄：PDF 原文向量渲染      │ 🌐 右欄：繁體中文即時對照翻譯 │
│              │                               │                              │
│ • 本地暫存   │ • 隨時拖曳即開新論文           │ • 即時神經網路學術翻譯       │
│ • 頁碼記憶   │ • 🖍️ 光學透光螢光筆 (Multiply) │ • 📌 章節重點與創新點提煉    │
│ • 筆記快跳   │ • 🧹 點選單筆精準橡皮擦       │ • 🟢 本地 Agent 連線狀態     │
│ • 一鍵刪除   │ • ↩️ 復原 (Ctrl+Z / ⌘Z)        │ • 零 API Key 門檻開箱即用    │
└──────────────┴───────────────────────────────┴──────────────────────────────┘
```

### 1. 雙欄極簡對照佈局
- **滿版無干擾**：100vw × 100vh 淺色高對比閱讀視圖，中線支援虛線拖曳調節欄寬。
- **視口聯動**：閱讀或翻頁至第 N 頁時，右欄自動解析並即時串流輸出該頁的中文翻譯與重點摘要。

### 2. Apple Notes 風格手繪筆記系統
- **真·光學透光螢光筆**：採用 `mix-blend-mode: multiply` 光學混合，筆跡完全不遮蔽底層英文黑字印刷。
- **單筆點選橡皮擦**：點擊哪一段筆跡就單獨刪除那一段，不再誤刪整頁筆記。
- **快捷操作**：支援 `Ctrl + Z` / `⌘ + Z` 一鍵復原上一筆，提供【細 / 中 / 粗】筆觸快速調整。

### 3. 本地硬碟同步與暫存資料夾
- **拖曳自動暫存**：論文拖入後自動複製至本機 `storage/papers/` 目錄。
- **歷史紀錄秒開**：點擊左側歷史列表瞬間還原至上次閱讀的頁碼、筆記與翻譯。
- **連動釋放**：點擊左側垃圾桶刪除紀錄時，同步清除本地暫存檔案，不佔硬碟空間。

### 4. 隨時拖曳即開新文（Instant Drop-to-Open Everywhere）
- 即使畫面中已有開啟中的論文，將新 PDF 丟進視窗任意處即可立即開新文，舊文自動完整歸檔至歷史紀錄。

---

## 🚀 快速開始

### 1. 安裝與啟動

```bash
# 複製專案
git clone https://github.com/Kenlele/solo-master.git
cd solo-master

# 安裝相依套件
npm install

# 啟動本機閱讀器
npm run dev
```

開啟瀏覽器前往 **[http://localhost:3000](http://localhost:3000)** 即可開始使用！

---

## 🤖 Agent 與 CLI 終端聯動

Solo-Master 內建本地橋接器，支援透過終端機或 AI Agent 對話直接遠端開啟論文：

### 方式 A：終端機 CLI 推送
在任何終端機視窗中直接執行：
```bash
# 方式 1：npm 指令
npm run solo-master -- /path/to/your_paper.pdf

# 方式 2：Node 直接執行
node bin/solo-master.mjs ~/Downloads/Attention_Is_All_You_Need.pdf
```
> ✨ 執行後系統會自動喚起瀏覽器並在 [http://localhost:3000](http://localhost:3000) 呈現該論文與即時翻譯！

### 方式 B：AI Agent 對話指令（Antigravity Skill）
專案內建 `.agent/skills/solo-master/SKILL.md`，在與 AI Agent 對話時直接輸入：
```text
/solo-master ./my_paper.pdf
```
或：
```text
幫我用 solo-master 打開這篇論文 /Users/username/Downloads/DeepSeek_R1.pdf
```
Agent 將自動觸發 Skill 載入論文並開啟瀏覽器雙欄對照閱讀。

---

## 🛠️ 技術架構

- **Framework**: [Next.js 16.3.1](https://nextjs.org/) (App Router, Turbopack)
- **Frontend**: [React 19](https://react.dev/) + [TypeScript 5](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) + [Lucide Icons](https://lucide.dev/)
- **PDF Engine**: [pdfjs-dist v5.x](https://github.com/mozilla/pdf.js) (Canvas 向量渲染 + 文字提取)
- **Storage & State**: [Zustand](https://github.com/pmndrs/zustand) + 本地 IndexedDB + Node.js 本機暫存目錄 (`storage/papers/`)
- **Translation Engine**: 內建神經網路學術翻譯引擎（支援本地 Ollama `localhost:11434` 守護進程自動掛載）

```text
solo_master/
├── .agent/skills/solo-master/   # Agent 專屬 Slash Command Skill
├── bin/
│   └── solo-master.mjs          # 本地 CLI 終端推播腳本
├── src/
│   ├── app/
│   │   ├── api/agent/
│   │   │   ├── file/            # 本地暫存讀取與刪除 API
│   │   │   ├── open-pdf/        # Agent CLI 接收端點
│   │   │   └── stream/          # 學術翻譯 SSE 串流引擎
│   │   └── page.tsx             # 雙欄核心入口
│   ├── components/
│   │   ├── agent/               # 繁中翻譯與重點提煉視圖
│   │   ├── layout/              # 滿版 SplitView 與歷史側邊欄
│   │   └── pdf/                 # PDF 畫布與光學手繪註解層
│   ├── hooks/                   # PDF.js 渲染與 Agent 串流 Hook
│   ├── lib/                     # IndexedDB 二進位本地持久化快取
│   └── store/                   # Zustand 全域狀態管理
└── storage/papers/              # 本機論文暫存資料夾 (自動管理)
```

---

## 📄 授權協議

本專案基於 [MIT License](./LICENSE) 協議開源，歡迎自由使用、修改與貢獻！

---

<div align="center">
Made with ❤️ for Researchers, Engineers, and Builders.
</div>
