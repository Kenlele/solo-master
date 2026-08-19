import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

export const runtime = 'nodejs';

// Local storage folder in current working directory
const STORAGE_DIR = path.join(process.cwd(), 'storage', 'papers');

function ensureStorageDir() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
}

/**
 * GET: Retrieve PDF file by id, path, or filename
 */
export async function GET(req: NextRequest) {
  try {
    ensureStorageDir();
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get('id');
    const filePath = searchParams.get('path');
    const fileNameParam = searchParams.get('name');

    let targetPath = '';

    // 1. Check if fileId exists in storage/papers/
    if (fileId) {
      const sanitizedId = fileId.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
      const storedPathWithExt = path.join(STORAGE_DIR, `${sanitizedId}.pdf`);
      const storedPathRaw = path.join(STORAGE_DIR, sanitizedId);

      if (fs.existsSync(storedPathWithExt)) {
        targetPath = storedPathWithExt;
      } else if (fs.existsSync(storedPathRaw)) {
        targetPath = storedPathRaw;
      }
    }

    // 2. Check if absolute or relative filePath exists
    if (!targetPath && filePath) {
      const resolved = path.isAbsolute(filePath)
        ? filePath
        : path.resolve(process.cwd(), filePath);

      if (fs.existsSync(resolved)) {
        targetPath = resolved;
      }
    }

    // 3. Check storage/papers/ by fileName
    if (!targetPath && fileNameParam) {
      const candidate = path.join(STORAGE_DIR, fileNameParam);
      if (fs.existsSync(candidate)) {
        targetPath = candidate;
      }
    }

    // 4. Fallback search common user directories
    if (!targetPath && (fileNameParam || filePath)) {
      const searchName = fileNameParam || (filePath ? path.basename(filePath) : '');
      if (searchName) {
        const home = os.homedir();
        const searchDirs = [
          STORAGE_DIR,
          process.cwd(),
          path.join(process.cwd(), 'public'),
          path.join(home, 'Downloads'),
          path.join(home, 'Desktop'),
          path.join(home, 'Documents'),
        ];

        for (const dir of searchDirs) {
          if (fs.existsSync(dir)) {
            const direct = path.join(dir, searchName);
            if (fs.existsSync(direct)) {
              targetPath = direct;
              break;
            }
          }
        }
      }
    }

    if (!targetPath || !fs.existsSync(targetPath)) {
      return NextResponse.json(
        { error: `找不到本機暫存檔案: ${fileId || filePath || fileNameParam}` },
        { status: 404 }
      );
    }

    const fileBuffer = fs.readFileSync(targetPath);
    const fileName = path.basename(targetPath);

    return new Response(fileBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${encodeURIComponent(fileName)}"`,
        'X-File-Name': encodeURIComponent(fileName),
        'X-File-Path': encodeURIComponent(targetPath),
        'X-File-Size': fileBuffer.byteLength.toString(),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to read file from local storage' },
      { status: 500 }
    );
  }
}

/**
 * POST: Upload and copy PDF into local temporary storage (storage/papers/)
 */
export async function POST(req: NextRequest) {
  try {
    ensureStorageDir();
    const contentType = req.headers.get('content-type') || '';

    let fileId = '';
    let fileName = 'paper.pdf';
    let fileBuffer: Buffer | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      fileId = (formData.get('id') as string) || '';
      
      if (!file) {
        return NextResponse.json({ error: '未提供檔案' }, { status: 400 });
      }

      fileName = file.name;
      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    } else {
      // JSON with base64Data
      const body = await req.json();
      fileId = body.id || '';
      fileName = body.name || body.fileName || 'paper.pdf';

      if (body.base64Data) {
        fileBuffer = Buffer.from(body.base64Data, 'base64');
      } else if (body.filePath) {
        const resolved = path.isAbsolute(body.filePath)
          ? body.filePath
          : path.resolve(process.cwd(), body.filePath);

        if (fs.existsSync(resolved)) {
          fileBuffer = fs.readFileSync(resolved);
        }
      }
    }

    if (!fileBuffer) {
      return NextResponse.json({ error: '檔案內容為空' }, { status: 400 });
    }

    if (!fileId) {
      fileId = `doc-${fileName}-${fileBuffer.length}`;
    }

    const sanitizedId = fileId.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    const targetFilePath = path.join(STORAGE_DIR, `${sanitizedId}.pdf`);

    // Write file to local project storage
    fs.writeFileSync(targetFilePath, fileBuffer);

    return NextResponse.json({
      success: true,
      message: '檔案已自動暫存至本地專案資料夾',
      fileId,
      fileName,
      size: fileBuffer.length,
      storagePath: targetFilePath,
      url: `/api/agent/file?id=${encodeURIComponent(fileId)}`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to save file to storage' },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Delete cached PDF from local storage when user removes from history
 */
export async function DELETE(req: NextRequest) {
  try {
    ensureStorageDir();
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get('id');
    const filePath = searchParams.get('path');

    let deleted = false;

    if (fileId) {
      const sanitizedId = fileId.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
      const targetWithExt = path.join(STORAGE_DIR, `${sanitizedId}.pdf`);
      const targetRaw = path.join(STORAGE_DIR, sanitizedId);

      if (fs.existsSync(targetWithExt)) {
        fs.unlinkSync(targetWithExt);
        deleted = true;
      }
      if (fs.existsSync(targetRaw)) {
        fs.unlinkSync(targetRaw);
        deleted = true;
      }
    }

    if (filePath && fs.existsSync(filePath)) {
      // Only delete if it's inside the STORAGE_DIR to avoid deleting user's primary files
      const normalizedTarget = path.resolve(filePath);
      const normalizedStorage = path.resolve(STORAGE_DIR);
      if (normalizedTarget.startsWith(normalizedStorage)) {
        fs.unlinkSync(normalizedTarget);
        deleted = true;
      }
    }

    return NextResponse.json({
      success: true,
      message: deleted ? '已從本地暫存資料夾刪除該論文' : '暫存檔案已不存在',
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to delete file from storage' },
      { status: 500 }
    );
  }
}
