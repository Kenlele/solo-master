#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import http from 'http';

const args = process.argv.slice(2);
let targetFile = null;
let customAgent = null;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--agent' || arg === '--agent-name') {
    customAgent = args[i + 1];
    i++;
  } else if (arg.startsWith('--agent=')) {
    customAgent = arg.split('=')[1];
  } else if (arg.startsWith('--agent-name=')) {
    customAgent = arg.split('=')[1];
  } else if (!arg.startsWith('-') && !targetFile) {
    targetFile = arg;
  }
}

import os from 'os';
import { execSync } from 'child_process';

function detectAgentName(cliAgentArg) {
  if (cliAgentArg) return cliAgentArg;
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

if (!targetFile) {
  console.log(`
\x1b[36m╔════════════════════════════════════════════════════════════════╗
║             📖 Solo-Master PDF 閱讀與翻譯終端連接器              ║
╚════════════════════════════════════════════════════════════════╝\x1b[0m

使用方式:
  \x1b[32m/solo-master <pdf-file-path>\x1b[0m
  \x1b[32mnpm run solo-master -- <pdf-file-path>\x1b[0m
  \x1b[32mnode bin/solo-master.mjs <pdf-file-path>\x1b[0m

範例:
  node bin/solo-master.mjs ./paper.pdf
  node bin/solo-master.mjs ~/Downloads/paper.pdf
`);
  process.exit(0);
}

const resolvedPath = path.isAbsolute(targetFile)
  ? targetFile
  : path.resolve(process.cwd(), targetFile);

if (!fs.existsSync(resolvedPath)) {
  console.error(`\x1b[31m❌ 錯誤: 找不到 PDF 檔案: ${resolvedPath}\x1b[0m`);
  process.exit(1);
}

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const host = process.env.HOST || '127.0.0.1';
const fileName = path.basename(resolvedPath);
const agentName = detectAgentName(customAgent);
console.log(`\x1b[33m⏳ [${agentName}] 正在讀取並推送 ${fileName} 至 Web 雙欄閱讀器... \x1b[0m`);

const fileBuffer = fs.readFileSync(resolvedPath);
const base64Data = fileBuffer.toString('base64');

const postData = JSON.stringify({
  fileName,
  base64Data,
  filePath: resolvedPath,
  agentName,
  agent: {
    name: agentName,
    status: 'connected',
    port,
  },
});

const req = http.request(
  {
    hostname: host,
    port,
    path: '/api/agent/open-pdf',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'X-Agent-Name': encodeURIComponent(agentName),
    },
  },
  (res) => {
    let data = '';
    res.on('data', (chunk) => (data += chunk));
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        if (res.statusCode === 200 && json.success) {
          console.log(`\x1b[32m✨ 成功！已在當前 Web 閱讀器中開啟: ${fileName}\x1b[0m`);
        } else {
          console.error(`\x1b[31m❌ 推送失敗: ${json.error || data}\x1b[0m`);
        }
      } catch {
        console.log(`\x1b[32m✨ 已發送指令至 Web 閱讀器\x1b[0m`);
      }
    });
  }
);

req.on('error', (e) => {
  console.error(`\x1b[31m❌ 連線至 Web 服務失敗: ${e.message}\x1b[0m`);
  console.log(`\x1b[33m💡 請確認是否已在終端機執行: npm run dev\x1b[0m`);
});

req.write(postData);
req.end();
