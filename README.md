# Solo-Master

Dual-Pane Academic Paper Reader & Real-Time Contextual Translator

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-black?style=flat-square)](./LICENSE)

Solo-Master is a distraction-free, full-bleed dual-pane PDF reader designed for researchers and engineers. It renders original vector PDF pages on the left while streaming synchronous Traditional Chinese translation and structural takeaways on the right, equipped with optical freehand annotations, local project persistence, and local AI agent CLI bridges.

---

## Overview

Traditional translation workflows for academic papers usually require constant context switching or destroy original document formatting:
- **Fragmented copy-pasting**: Breaks mathematical notation, disrupts reading flow, and requires constant window switching.
- **Layout destruction**: Full-page machine translation replaces vector documents with unstable HTML layouts, breaking figures and tables.
- **Configuration overhead**: Often requires paid API keys and lacks robust local document state persistence.

Solo-Master addresses these issues with a synchronous, 1:1 original-to-translation split-view engine that maintains vector fidelity while providing real-time academic translation.

---

## Key Capabilities

### 1. Synchronous Dual-Pane Reader
- **1:1 Viewport Tracking**: Dynamically observes visible PDF pages and streams real-time Traditional Chinese translation alongside key technical takeaways.
- **Full-Bleed Layout**: Minimalist workspace with dashed resizable divider and zero unnecessary UI chrome.

### 2. Optical Freehand Annotation Engine
- **Non-Obscuring Highlighter**: Uses hardware-accelerated optical multiply blending (`mix-blend-mode: multiply`), ensuring handwritten highlights never occlude underlying vector text.
- **Selective Stroke Eraser**: Distance-based vector segment hit testing for single-stroke removal.
- **Undo & Stroke Control**: History stack with `Ctrl+Z` / `⌘Z` support and fine/medium/thick stroke presets.

### 3. Local Storage Sync & Persistence
- **Automatic Document Cache**: Uploaded papers are mirrored to the local project storage directory (`storage/papers/`), eliminating missing path issues upon history reload.
- **Synchronized Cleanup**: Removing documents from history automatically cleans up associated files on disk.
- **Drag-to-Open Everywhere**: Dropping a new PDF anywhere in the viewer instantly archives current reading progress and loads the new document.

### 4. Agent & CLI Integration
- **Slash Command Support**: Native Antigravity agent skill (`/solo-master <path>`) for opening papers directly from agent conversations.
- **Terminal Bridge**: Standalone Node CLI connector for pushing local PDF paths from external shell sessions.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SOLO-MASTER WORKSPACE                              │
├──────────────┬───────────────────────────────┬──────────────────────────────┤
│ Left Sidebar │ Left Column: Original PDF     │ Right Column: Live Stream    │
│              │                               │                              │
│ - History    │ - Vector Canvas Layer (PDF.js)│ - Neural Academic Translation│
│ - Bookmarks  │ - Freehand Optical Overlay    │ - Structural Key Takeaways   │
│ - Local Sync │ - Window-Wide Drag & Drop     │ - Agent Bridge Status        │
└──────────────┴───────────────────────────────┴──────────────────────────────┘
```

---

## Getting Started

### Installation

```bash
git clone https://github.com/Kenlele/solo-master.git
cd solo-master
npm install
```

### Development

```bash
npm run dev
```

---

## Agent & CLI Usage

### CLI Push
Push any local PDF into the reader from a terminal session:

```bash
npm run solo-master -- /path/to/paper.pdf
```

Or execute directly via Node:
```bash
node bin/solo-master.mjs /path/to/paper.pdf
```

### Agent Skill
When interacting with an AI agent in the workspace, trigger the built-in skill:

```text
/solo-master ./path/to/paper.pdf
```

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **Runtime & Language** | React 19, TypeScript 5, Node.js |
| **Styling** | Tailwind CSS v4, Lucide Icons |
| **PDF Rendering** | Mozilla PDF.js v5.x |
| **State & Cache** | Zustand, IndexedDB, Local Disk Storage (`storage/papers/`) |
| **Translation** | Neural Academic Chinese Translation Stream (with Ollama bridge) |

---

## Project Structure

```text
solo_master/
├── .agent/skills/solo-master/   # Agent skill definitions
├── bin/
│   └── solo-master.mjs          # Standalone CLI bridge
├── src/
│   ├── app/
│   │   ├── api/agent/
│   │   │   ├── file/            # Local storage read/delete endpoint
│   │   │   ├── open-pdf/        # Agent CLI bridge endpoint
│   │   │   └── stream/          # Translation streaming route
│   │   └── page.tsx             # Root workspace container
│   ├── components/
│   │   ├── agent/               # Translation stream view & status
│   │   ├── layout/              # SplitView & document history drawer
│   │   └── pdf/                 # PDF page canvas & annotation overlay
│   ├── hooks/                   # PDF.js render pipeline & agent stream
│   ├── lib/                     # IndexedDB binary persistence
│   └── store/                   # Zustand global state management
└── storage/papers/              # Local server-side PDF storage cache
```

---

## License

This project is licensed under the [MIT License](./LICENSE).
