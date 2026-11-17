import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getConsultation, saveConsultationRecord } from '@/lib/db';

const audioDir = path.join(process.cwd(), 'data', 'audio');

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { audioBase64, mimeType, consultationId, duration } = body;

    if (!audioBase64 || typeof audioBase64 !== 'string') {
      return NextResponse.json({ error: 'audioBase64 is required' }, { status: 400 });
    }

    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }

    const cleanBase64 = audioBase64.replace(/^data:.*?;base64,/, '').trim();
    const buffer = Buffer.from(cleanBase64, 'base64');

    if (buffer.length === 0) {
      return NextResponse.json({ error: 'Empty audio buffer' }, { status: 400 });
    }

    let ext = 'webm';
    if (mimeType?.includes('wav')) ext = 'wav';
    else if (mimeType?.includes('ogg')) ext = 'ogg';
    else if (mimeType?.includes('mp4') || mimeType?.includes('m4a')) ext = 'm4a';
    else if (mimeType?.includes('mp3') || mimeType?.includes('mpeg')) ext = 'mp3';

    const safePrefix = String(consultationId || 'REC').replace(/[^a-zA-Z0-9_-]/g, '');
    const filename = `${safePrefix}_${Date.now()}.${ext}`;
    const filePath = path.join(audioDir, filename);

    fs.writeFileSync(filePath, buffer);

    const audioUrl = `/api/audio/${filename}`;

    if (consultationId && consultationId !== 'CON-TEMP') {
      const existing = getConsultation(consultationId);
      if (existing) {
        existing.audioUrl = audioUrl;
        if (typeof duration === 'number' && duration > 0) {
          existing.audioDuration = duration;
        }
        saveConsultationRecord(existing);
      }
    }

    return NextResponse.json({
      success: true,
      audioUrl,
      filename,
      sizeBytes: buffer.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

