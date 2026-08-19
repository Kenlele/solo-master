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

// Server-side active document state store
let currentActiveDocument: {
  id: string;
  name: string;
  size: number;
  filePath?: string;
  base64Data?: string;
  updatedAt: number;
} | null = null;

export async function GET() {
  return NextResponse.json({
    activeDocument: currentActiveDocument,
    agent: {
      name: 'Antigravity Agent (CLI Bridge)',
      status: 'connected',
      port: 3000,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    ensureStorageDir();
    const body = await req.json();
    let { filePath, fileName, base64Data } = body;

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
