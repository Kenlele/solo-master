#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import http from 'http';

const args = process.argv.slice(2);
const targetFile = args[0];

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
  node bin/solo-master.mjs sample.pdf
  node bin/solo-master.mjs /Users/username/Downloads/paper.pdf
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

const fileName = path.basename(resolvedPath);
console.log(`\x1b[33m⏳ 正在讀取並推送 ${fileName} 至 Web 雙欄閱讀器... \x1b[0m`);

const fileBuffer = fs.readFileSync(resolvedPath);
const base64Data = fileBuffer.toString('base64');

const postData = JSON.stringify({
  fileName,
  base64Data,
  filePath: resolvedPath,
});

const req = http.request(
  {
    hostname: 'localhost',
    port: 3000,
    path: '/api/agent/open-pdf',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
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
