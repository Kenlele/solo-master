import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

const STORAGE_DIR = path.join(process.cwd(), 'storage', 'papers');

function ensureStorageDir() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
}

import os from 'os';
import { execSync } from 'child_process';

function detectAgentName(): string {
  if (process.env.AGENT_NAME) return process.env.AGENT_NAME;
  if (process.env.AI_AGENT) {
    const raw = process.env.AI_AGENT.toLowerCase();
    if (raw === 'antigravity') return 'Antigravity Agent';
    if (raw === 'claude' || raw === 'claude-code') return 'Claude Code';
    if (raw === 'cursor') return 'Cursor Agent';
    if (raw === 'windsurf') return 'Windsurf Agent';
    if (raw === 'copilot' || raw === 'github-copilot') return 'GitHub Copilot';
    if (raw === 'gemini') return 'Gemini Agent';
    if (raw === 'cline') return 'Cline Agent';
    if (raw === 'roo-code' || raw === 'roo') return 'Roo Code';
    if (raw === 'aider') return 'Aider';
    if (raw === 'goose') return 'Goose Agent';
    return `${raw.charAt(0).toUpperCase() + raw.slice(1)} Agent`;
  }
  if (process.env.ANTIGRAVITY_AGENT || process.env.ANTIGRAVITY_CONVERSATION_ID || process.env.ANTIGRAVITY_LS_ADDRESS || process.env.ANTIGRAVITY_AGENTAPI_EXE) {
    return 'Antigravity Agent';
  }
  if (process.env.CLAUDE_CODE || process.env.CLAUDE_CODE_SSE_PORT || process.env.CLAUDE_ENTRYPOINT) {
    return 'Claude Code';
  }
  if (process.env.CURSOR_AGENT || process.env.CURSOR_TRACE_ID || process.env.CURSOR_VERSION) {
    return 'Cursor Agent';
  }
  if (process.env.WINDSURF || process.env.WINDSURF_AGENT || process.env.CASCADE) {
    return 'Windsurf Agent';
  }
  if (process.env.GEMINI_CLI || process.env.GEMINI_CLI_IDE_SERVER_PORT) {
    return 'Gemini Agent';
  }
  if (process.env.GITHUB_COPILOT || process.env.COPILOT_AGENT) {
    return 'GitHub Copilot';
  }
  if (process.env.CLINE || process.env.CLINE_RUN_ID) {
    return 'Cline Agent';
  }
  if (process.env.ROO_CODE || process.env.ROO_CODE_AGENT) {
    return 'Roo Code';
  }
  if (process.env.AIDER || process.env.AIDER_MODEL) {
    return 'Aider';
  }
  if (process.env.GOOSE_PROVIDER || process.env.GOOSE_MODEL) {
    return 'Goose Agent';
  }

  // Check active running processes
  try {
    const ps = execSync('ps -ax -o comm=', { encoding: 'utf-8', timeout: 500 });
    if (/agy|antigravity/i.test(ps)) return 'Antigravity Agent';
    if (/claude/i.test(ps)) return 'Claude Code';
    if (/cursor/i.test(ps)) return 'Cursor Agent';
    if (/windsurf/i.test(ps)) return 'Windsurf Agent';
    if (/goose/i.test(ps)) return 'Goose Agent';
    if (/aider/i.test(ps)) return 'Aider';
  } catch {}

  // Check workspace & home directory markers
  try {
    const home = os.homedir();
    const cwd = process.cwd();
    if (fs.existsSync(path.join(cwd, '.agent')) || fs.existsSync(path.join(home, '.gemini', 'antigravity-cli')) || fs.existsSync(path.join(home, '.local', 'bin', 'agy'))) {
      return 'Antigravity Agent';
    }
    if (fs.existsSync(path.join(cwd, '.claude')) || fs.existsSync(path.join(home, '.claude'))) {
      return 'Claude Code';
    }
    if (fs.existsSync(path.join(cwd, '.cursor')) || fs.existsSync(path.join(home, '.cursor'))) {
      return 'Cursor Agent';
    }
    if (fs.existsSync(path.join(cwd, '.windsurf')) || fs.existsSync(path.join(home, '.codeium', 'windsurf'))) {
      return 'Windsurf Agent';
    }
  } catch {}

  return 'Antigravity Agent';
}

// Server-side active document state store
let currentActiveDocument: {
  id: string;
  name: string;
  size: number;
  filePath?: string;
  base64Data?: string;
  updatedAt: number;
} | null = null;

let currentAgentInfo: {
  name: string;
  status: string;
  port: number;
} = {
  name: detectAgentName(),
  status: 'connected',
  port: 3000,
};

export async function GET() {
  return NextResponse.json({
    activeDocument: currentActiveDocument,
    agent: currentAgentInfo,
  });
}

export async function POST(req: NextRequest) {
  try {
    ensureStorageDir();
    const body = await req.json();
    let { filePath, fileName, base64Data, agent, agentName } = body;

    const rawHeaderAgent = req.headers.get('x-agent-name');
    let decodedHeaderAgent = '';
    if (rawHeaderAgent) {
      try {
        decodedHeaderAgent = decodeURIComponent(rawHeaderAgent);
      } catch {
        decodedHeaderAgent = rawHeaderAgent;
      }
    }

    const reqAgentName = agentName || agent?.name || decodedHeaderAgent;
    if (reqAgentName) {
      currentAgentInfo = {
        name: reqAgentName,
        status: 'connected',
        port: 3000,
      };
    }

    let resolvedPath = '';
    let fileBuffer: Buffer | null = null;

    // If filePath is passed from local CLI
    if (filePath) {
      resolvedPath = path.isAbsolute(filePath)
        ? filePath
        : path.resolve(process.cwd(), filePath);

      if (!fs.existsSync(resolvedPath)) {
        return NextResponse.json(
          { error: `找不到檔案: ${filePath}` },
          { status: 404 }
        );
      }

      fileBuffer = fs.readFileSync(resolvedPath);
      fileName = fileName || path.basename(resolvedPath);
      if (!base64Data) {
        base64Data = fileBuffer.toString('base64');
      }
    } else if (base64Data) {
      fileBuffer = Buffer.from(base64Data, 'base64');
    }

    if (!fileBuffer && !base64Data && !filePath) {
      return NextResponse.json(
        { error: '請提供 filePath 或 base64Data' },
        { status: 400 }
      );
    }

    fileName = fileName || (resolvedPath ? path.basename(resolvedPath) : 'paper.pdf');
    const docId = `doc-${fileName}-${Date.now()}`;

    // Also persist copy in local storage/papers/ for instant history reload
    if (fileBuffer) {
      const sanitizedId = docId.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
      const targetStoragePath = path.join(STORAGE_DIR, `${sanitizedId}.pdf`);
      try {
        fs.writeFileSync(targetStoragePath, fileBuffer);
      } catch (err) {
        console.warn('Failed to cache file to storage/papers:', err);
      }
    }

    currentActiveDocument = {
      id: docId,
      name: fileName,
      size: base64Data ? Math.round((base64Data.length * 3) / 4) : (fileBuffer?.length || 0),
      filePath: resolvedPath || filePath,
      base64Data,
      updatedAt: Date.now(),
    };

    return NextResponse.json({
      success: true,
      message: `已成功載入 ${fileName} 至 Web 閱讀器`,
      document: {
        id: currentActiveDocument.id,
        name: currentActiveDocument.name,
        size: currentActiveDocument.size,
        filePath: currentActiveDocument.filePath,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to open PDF' },
      { status: 500 }
    );
  }
}
