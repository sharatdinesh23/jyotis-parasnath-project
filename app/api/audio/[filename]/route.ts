import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const audioDir = path.join(process.cwd(), 'data', 'audio');

function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.wav') return 'audio/wav';
  if (ext === '.mp3') return 'audio/mpeg';
  if (ext === '.ogg') return 'audio/ogg';
  if (ext === '.m4a' || ext === '.mp4') return 'audio/mp4';
  return 'audio/webm';
}

export async function GET(req: Request, { params }: { params: { filename: string } }) {
  try {
    const safeName = path.basename(params.filename || '');
    const resolvedPath = path.resolve(audioDir, safeName);

    if (!resolvedPath.startsWith(path.resolve(audioDir)) || !fs.existsSync(resolvedPath)) {
      return NextResponse.json({ error: 'Audio recording not found' }, { status: 404 });
    }

    const stat = fs.statSync(resolvedPath);
    const totalSize = stat.size;
    const contentType = getMimeType(safeName);
    const range = req.headers.get('range');

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

      if (isNaN(start) || start >= totalSize || end >= totalSize) {
        return new NextResponse(null, {
          status: 416,
          headers: { 'Content-Range': `bytes */${totalSize}` },
        });
      }

      const chunkSize = end - start + 1;
      const fileBuffer = Buffer.alloc(chunkSize);
      const fd = fs.openSync(resolvedPath, 'r');
      try {
        fs.readSync(fd, fileBuffer, 0, chunkSize, start);
      } finally {
        fs.closeSync(fd);
      }

      return new NextResponse(fileBuffer, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${totalSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize.toString(),
          'Content-Type': contentType,
          'Cache-Control': 'private, max-age=3600',
        },
      });
    }

    const fullBuffer = fs.readFileSync(resolvedPath);
    return new NextResponse(fullBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': totalSize.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

