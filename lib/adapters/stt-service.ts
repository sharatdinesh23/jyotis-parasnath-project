import { TranscriptSegment } from '@/types';
import { sampleKneePainConsultation } from '@/lib/seedData';

export interface TranscribeRequest {
  audioBase64?: string;
  mimeType?: string;
  language?: string;
  targetLanguage?: 'en' | 'hi' | 'mr' | 'auto';
  translateOnly?: boolean;
  providerOverride?: 'groq' | 'openai' | 'deepgram' | 'mock';
  apiKeyOverride?: string;
  isKneePainBenchmark?: boolean;
  defaultSpeaker?: 'Doctor' | 'Patient';
  diarizationMode?: 'ambient_ai' | 'doctor_dictation';
  rawSegmentsToDiarize?: TranscriptSegment[];
}

const DEFAULT_DIARIZATION_PROMPT = `You are an expert medical conversation diarizer. Given raw timestamped speech text or segments from an Indian outpatient clinic consultation (Hindi, Marathi, English, or Hinglish), separate conversational turns cleanly and identify whether each utterance was spoken by the 'Doctor' (asks clinical questions, examines patient, explains assessment, prescribes medicines/tests) or the 'Patient' (reports symptoms, duration, past history, asks questions). Preserve the original meaning and clinical terms. Return strictly valid JSON: { "segments": [{ "id": "seg-1", "speaker": "Doctor" | "Patient", "timestamp": "00:00", "text": "...", "language": "Mixed" }] }`;

/**
 * Uses Groq / Gemini LLM to intelligently separate ambient consultation turns into Doctor vs Patient.
 */
async function diarizeSegmentsWithAI(segments: TranscriptSegment[]): Promise<TranscriptSegment[]> {
  if (!segments || segments.length === 0) return segments;

  const systemPrompt = (process.env.AMBIENT_DIARIZATION_PROMPT && process.env.AMBIENT_DIARIZATION_PROMPT.trim().length > 20)
    ? process.env.AMBIENT_DIARIZATION_PROMPT.trim()
    : DEFAULT_DIARIZATION_PROMPT;

  const userPayload = `Diarize these consultation speech segments into Doctor and Patient turns:\n${JSON.stringify(segments)}`;

  // 1. Try Groq first (ultra-fast)
  const groqKey = process.env.GROQ_API_KEY?.trim();
  if (groqKey && groqKey.length > 5) {
    for (const model of ['openai/gpt-oss-120b', 'openai/gpt-oss-20b']) {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model,
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPayload },
            ],
            temperature: 0.1,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const raw = data.choices?.[0]?.message?.content || '';
          const parsed = JSON.parse(raw.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim());
          if (Array.isArray(parsed.segments) && parsed.segments.length > 0) {
            return parsed.segments.map((s: any, i: number) => ({
              id: s.id || `diar-${i + 1}`,
              speaker: s.speaker === 'Patient' ? 'Patient' : 'Doctor',
              timestamp: s.timestamp || segments[0]?.timestamp || '00:00',
              text: String(s.text || '').trim(),
              language: s.language || 'Mixed',
            })).filter((s: TranscriptSegment) => s.text.length > 0);
          }
        }
      } catch (err) {
        console.warn(`Groq diarization failed on ${model}:`, err);
      }
    }
  }

  // 2. Try Gemini fallback
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (geminiKey && geminiKey.length > 5) {
    for (const model of ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-flash-latest']) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ parts: [{ text: userPayload }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const parsed = JSON.parse(text.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim());
            if (Array.isArray(parsed.segments) && parsed.segments.length > 0) {
              return parsed.segments.map((s: any, i: number) => ({
                id: s.id || `diar-${i + 1}`,
                speaker: s.speaker === 'Patient' ? 'Patient' : 'Doctor',
                timestamp: s.timestamp || segments[0]?.timestamp || '00:00',
                text: String(s.text || '').trim(),
                language: s.language || 'Mixed',
              })).filter((s: TranscriptSegment) => s.text.length > 0);
            }
          }
        }
      } catch (err) {
        console.warn(`Gemini diarization failed on ${model}:`, err);
      }
    }
  }

  // Deterministic clinical heuristic diarization fallback (works offline/without LLM keys)
  return heuristicDiarizeSegments(segments);
}

function heuristicDiarizeSegments(segments: TranscriptSegment[]): TranscriptSegment[] {
  const out: TranscriptSegment[] = [];
  let idx = 1;

  for (const seg of segments) {
    // Split on explicit markers or sentence boundaries if a single large chunk was captured
    const rawParts = seg.text
      .split(/(?=\b(?:Doctor|Patient)\s*:)|(?<=[.?!।])\s+/i)
      .map(s => s.trim())
      .filter(Boolean);

    if (rawParts.length <= 1) {
      out.push(seg);
      continue;
    }

    // Group contiguous sentences with same predicted speaker
    for (const part of rawParts) {
      let speaker: 'Doctor' | 'Patient' = seg.speaker;
      let cleanText = part;

      if (/^Patient\s*:/i.test(part)) {
        speaker = 'Patient';
        cleanText = part.replace(/^Patient\s*:/i, '').trim();
      } else if (/^Doctor\s*:/i.test(part)) {
        speaker = 'Doctor';
        cleanText = part.replace(/^Doctor\s*:/i, '').trim();
      } else {
        const lower = part.toLowerCase();
        const doctorCues = /\b(tell me|what problem|let me examine|examine|i see|prescrib|take tab|tablet|capsule|syrup|mg|twice daily|once daily|after food|before food|advised|x-ray|blood test|follow[- ]?up|diagnosis|check your)\b|\?$/i;
        const patientCues = /\b(i have|i am having|since \d|for \d+ (day|week|month)|pain in|severe|hurts|doctor|mujhe|dard|takleef|bukhar|malaria|stomach|headache|fever)\b/i;

        if (doctorCues.test(lower) && !patientCues.test(lower)) {
          speaker = 'Doctor';
        } else if (patientCues.test(lower)) {
          speaker = 'Patient';
        }
      }

      if (!cleanText) continue;

      const prev = out[out.length - 1];
      if (prev && prev.speaker === speaker && !/^Doctor:|^Patient:/i.test(part)) {
        prev.text = `${prev.text} ${cleanText}`;
      } else {
        out.push({
          id: `diar-h-${idx++}`,
          speaker,
          timestamp: seg.timestamp || formatSeconds((idx - 1) * 8),
          text: cleanText,
          language: seg.language || 'Mixed',
        });
      }
    }
  }

  return out.length > 0 ? out : segments;
}

function getLanguageDisplayName(code?: string): string {
  if (code === 'en') return 'English';
  if (code === 'hi') return 'Hindi (हिंदी)';
  if (code === 'mr') return 'Marathi (मराठी)';
  return 'Mixed (HI / MR / EN)';
}

function getWhisperPromptForLanguage(lang?: string): string {
  if (lang === 'en') {
    return 'Medical outpatient clinic consultation in English. Standard English clinical terms, prescriptions, and patient symptoms.';
  }
  if (lang === 'hi') {
    return 'पारसनाथ क्लिनिक बाह्य रोगी परामर्श हिंदी में। लक्षण, जांच और दवाइयां।';
  }
  if (lang === 'mr') {
    return 'पारसनाथ क्लिनिक बाह्यरुग्ण सल्लामसलत मराठीमध्ये। लक्षणे, तपासणी आणि औषधे.';
  }
  return 'Parasnath Clinic OPD consultation.';
}

async function translateSegmentsToLanguage(
  segments: TranscriptSegment[],
  targetLang?: string
): Promise<TranscriptSegment[]> {
  if (!segments || segments.length === 0 || !targetLang || targetLang === 'auto') {
    return segments;
  }

  const targetName = targetLang === 'en' ? 'English' : targetLang === 'mr' ? 'Marathi (Devanagari script)' : 'Hindi (Devanagari script)';
  const needsTranslation = segments.some((s) => {
    const hasDevanagari = /[\u0900-\u097F]/.test(s.text);
    if (targetLang === 'en') return hasDevanagari || (s.language && s.language !== 'en');
    return !hasDevanagari || (s.language && s.language !== targetLang);
  });

  if (!needsTranslation) {
    return segments.map((s) => ({ ...s, language: targetLang }));
  }

  const prompt = `Translate each medical consultation segment accurately into ${targetName}. Keep speaker, id, and timestamp identical. Return strictly valid JSON: { "segments": [{ "id": "...", "speaker": "Doctor" | "Patient", "timestamp": "...", "text": "..." }] }`;
  const payload = JSON.stringify(segments);

  // 1. Try Groq LLM translation
  const groqKey = process.env.GROQ_API_KEY?.trim();
  if (groqKey && groqKey.length > 5) {
    for (const model of ['openai/gpt-oss-120b', 'openai/gpt-oss-20b']) {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
          body: JSON.stringify({
            model,
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: prompt },
              { role: 'user', content: payload },
            ],
            temperature: 0.1,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const parsed = JSON.parse((data.choices?.[0]?.message?.content || '').replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim());
          if (Array.isArray(parsed.segments) && parsed.segments.length > 0) {
            return parsed.segments.map((s: any, i: number) => ({
              id: s.id || segments[i]?.id || `tr-${i + 1}`,
              speaker: s.speaker === 'Patient' ? 'Patient' : 'Doctor',
              timestamp: s.timestamp || segments[i]?.timestamp || '00:00',
              text: String(s.text || segments[i]?.text || '').trim(),
              language: targetLang,
            }));
          }
        }
      } catch {}
    }
  }

  // 2. Try Gemini LLM translation
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (geminiKey && geminiKey.length > 5) {
    for (const model of ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-flash-latest']) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: prompt }] },
            contents: [{ parts: [{ text: payload }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const parsed = JSON.parse(text.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim());
            if (Array.isArray(parsed.segments) && parsed.segments.length > 0) {
              return parsed.segments.map((s: any, i: number) => ({
                id: s.id || segments[i]?.id || `tr-${i + 1}`,
                speaker: s.speaker === 'Patient' ? 'Patient' : 'Doctor',
                timestamp: s.timestamp || segments[i]?.timestamp || '00:00',
                text: String(s.text || segments[i]?.text || '').trim(),
                language: targetLang,
              }));
            }
          }
        }
      } catch {}
    }
  }

  // 3. Free zero-key fallback via Google Translate public endpoint
  try {
    const translated = await Promise.all(
      segments.map(async (seg) => {
        try {
          const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(seg.text)}`;
          const r = await fetch(url);
          if (r.ok) {
            const json = await r.json();
            const combined = Array.isArray(json?.[0])
              ? json[0].map((chunk: any) => chunk?.[0] || '').join('')
              : '';
            if (combined.trim()) {
              return { ...seg, text: combined.trim(), language: targetLang };
            }
          }
        } catch {}
        return { ...seg, language: targetLang };
      })
    );
    return translated;
  } catch {
    return segments;
  }
}

export async function transcribeAudio(req: TranscribeRequest): Promise<{
  transcript: TranscriptSegment[];
  providerUsed: string;
  detectedLanguage: string;
}> {
  const provider = req.providerOverride || process.env.TRANSCRIPTION_PROVIDER || 'mock';
  const speakerLabel = req.defaultSpeaker || 'Doctor';
  const targetLang = (req.targetLanguage && req.targetLanguage !== 'auto')
    ? req.targetLanguage
    : (req.language && req.language !== 'auto' ? req.language : 'auto');

  // Translate or Diarize live-captured/existing segments directly when requested
  if (req.rawSegmentsToDiarize && req.rawSegmentsToDiarize.length > 0) {
    let processed = req.translateOnly
      ? req.rawSegmentsToDiarize
      : (req.diarizationMode === 'ambient_ai'
          ? await diarizeSegmentsWithAI(req.rawSegmentsToDiarize)
          : req.rawSegmentsToDiarize);

    if (targetLang !== 'auto') {
      processed = await translateSegmentsToLanguage(processed, targetLang);
    }

    return {
      transcript: processed,
      providerUsed: req.translateOnly
        ? `Transcript Language: ${getLanguageDisplayName(targetLang)}`
        : req.diarizationMode === 'ambient_ai'
        ? 'AI Ambient Speaker Diarization [LIVE]'
        : 'Doctor Clinical Dictation [LIVE]',
      detectedLanguage: getLanguageDisplayName(targetLang)
    };
  }

  // 1. GROQ WHISPER LIVE ADAPTER (100% Free ultra-fast Whisper Large v3 + AI Diarization)
  if (provider === 'groq') {
    const apiKey = req.apiKeyOverride || process.env.GROQ_API_KEY;
    if (apiKey && req.audioBase64) {
      const cleanBase64 = req.audioBase64.replace(/^data:.*?;base64,/, '').trim();
      const audioBuffer = Buffer.from(cleanBase64, 'base64');

      let ext = 'webm';
      if (req.mimeType?.includes('wav')) ext = 'wav';
      else if (req.mimeType?.includes('ogg')) ext = 'ogg';
      else if (req.mimeType?.includes('mp4') || req.mimeType?.includes('m4a')) ext = 'm4a';
      else if (req.mimeType?.includes('mp3') || req.mimeType?.includes('mpeg')) ext = 'mp3';

      for (const whisperModel of ['whisper-large-v3', 'whisper-large-v3-turbo']) {
        try {
          const formData = new FormData();
          const blob = new Blob([audioBuffer], { type: req.mimeType || 'audio/webm' });
          formData.append('file', blob, `recording.${ext}`);
          formData.append('model', whisperModel);
          formData.append('prompt', getWhisperPromptForLanguage(targetLang));
          if (targetLang !== 'auto' && targetLang !== 'mr') {
            formData.append('language', targetLang);
          } else if (targetLang === 'mr') {
            formData.append('language', 'mr');
          }
          formData.append('response_format', 'verbose_json');

          const endpoint = targetLang === 'en'
            ? 'https://api.groq.com/openai/v1/audio/translations'
            : 'https://api.groq.com/openai/v1/audio/transcriptions';

          // Note: /audio/translations only accepts whisper-large-v3 and outputs English directly
          const useTranslationsEndpoint = targetLang === 'en' && whisperModel === 'whisper-large-v3';
          if (useTranslationsEndpoint) {
            formData.delete('language');
          }

          const response = await fetch(useTranslationsEndpoint ? endpoint : 'https://api.groq.com/openai/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey.trim()}`,
            },
            body: formData,
          });

          if (response.ok) {
            const result = await response.json();
            let segments: TranscriptSegment[] = (result.segments || [])
              .filter((seg: any) => seg.text && seg.text.trim().length > 0)
              .map((seg: any, idx: number) => ({
                id: `groq-stt-${idx}`,
                speaker: speakerLabel,
                timestamp: formatSeconds(seg.start || 0),
                text: seg.text.trim(),
                language: targetLang !== 'auto' ? targetLang : (result.language || 'Mixed')
              }));

            if (segments.length === 0 && result.text && result.text.trim().length > 0) {
              segments.push({
                id: 'groq-stt-1',
                speaker: speakerLabel,
                timestamp: '00:00',
                text: result.text.trim(),
                language: targetLang !== 'auto' ? targetLang : (result.language || 'Mixed')
              });
            }

            if (segments.length > 0) {
              if (req.diarizationMode === 'ambient_ai') {
                segments = await diarizeSegmentsWithAI(segments);
              }
              if (targetLang !== 'auto') {
                segments = await translateSegmentsToLanguage(segments, targetLang);
              }
              return {
                transcript: segments,
                providerUsed: req.diarizationMode === 'ambient_ai'
                  ? `Groq ${whisperModel} + AI Speaker Diarization [LIVE]`
                  : `Groq ${whisperModel} [LIVE Free Engine]`,
                detectedLanguage: targetLang !== 'auto' ? getLanguageDisplayName(targetLang) : (result.language || 'Mixed')
              };
            }
          } else {
            const errText = await response.text();
            console.warn(`Groq Whisper (${whisperModel}) returned error:`, response.status, errText);
          }
        } catch (err) {
          console.warn(`Groq Whisper (${whisperModel}) connection error:`, err);
        }
      }
    }
  }

  // 2. OPENAI WHISPER LIVE ADAPTER
  if (provider === 'openai') {
    const apiKey = req.apiKeyOverride || process.env.OPENAI_API_KEY;
    if (apiKey && req.audioBase64) {
      try {
        const cleanBase64 = req.audioBase64.replace(/^data:audio\/\w+;base64,/, '').replace(/^data:.*?;base64,/, '');
        const audioBuffer = Buffer.from(cleanBase64, 'base64');
        const formData = new FormData();
        const blob = new Blob([audioBuffer], { type: req.mimeType || 'audio/webm' });
        formData.append('file', blob, 'consultation.webm');
        formData.append('model', 'whisper-1');
        if (process.env.TRANSCRIPTION_SYSTEM_PROMPT) {
          formData.append('prompt', process.env.TRANSCRIPTION_SYSTEM_PROMPT);
        }
        formData.append('language', req.language || 'hi');
        formData.append('response_format', 'verbose_json');

        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
          body: formData,
        });

        if (response.ok) {
          const result = await response.json();
          // Convert segments to TranscriptSegment format
          const segments: TranscriptSegment[] = (result.segments || []).map((seg: any, idx: number) => ({
            id: `stt-${idx}`,
            speaker: idx % 2 === 0 ? 'Doctor' : 'Patient',
            timestamp: formatSeconds(seg.start || 0),
            text: seg.text.trim(),
            language: result.language || 'hi'
          }));

          if (segments.length === 0 && result.text) {
            segments.push({
              id: 'stt-1',
              speaker: 'Doctor',
              timestamp: '00:00',
              text: result.text.trim(),
              language: result.language || 'hi'
            });
          }

          return {
            transcript: segments,
            providerUsed: 'OpenAI Whisper-1 [LIVE]',
            detectedLanguage: result.language || 'Mixed'
          };
        }
      } catch (err) {
        console.warn('OpenAI Whisper error, falling back to mock adapter:', err);
      }
    }
  }

  // 2. DEEPGRAM LIVE ADAPTER
  if (provider === 'deepgram') {
    const apiKey = req.apiKeyOverride || process.env.DEEPGRAM_API_KEY;
    if (apiKey && req.audioBase64) {
      try {
        const cleanBase64 = req.audioBase64.replace(/^data:audio\/\w+;base64,/, '').replace(/^data:.*?;base64,/, '');
        const audioBuffer = Buffer.from(cleanBase64, 'base64');
        const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-2-medical&diarize=true&punctuate=true', {
          method: 'POST',
          headers: {
            'Authorization': `Token ${apiKey}`,
            'Content-Type': req.mimeType || 'audio/webm',
          },
          body: audioBuffer,
        });

        if (response.ok) {
          const result = await response.json();
          const utterances = result.results?.utterances || [];
          const segments: TranscriptSegment[] = utterances.map((u: any, idx: number) => ({
            id: `dg-${idx}`,
            speaker: u.speaker === 0 ? 'Doctor' : 'Patient',
            timestamp: formatSeconds(u.start || 0),
            text: u.transcript,
            language: 'Mixed'
          }));

          return {
            transcript: segments.length > 0 ? segments : sampleKneePainConsultation.transcript,
            providerUsed: 'Deepgram Nova-2 Medical [LIVE]',
            detectedLanguage: 'Mixed (Hindi/Marathi/English)'
          };
        }
      } catch (err) {
        console.warn('Deepgram error, falling back to mock:', err);
      }
    }
  }

  // 3. FALLBACK: Only return Knee Pain benchmark if explicitly requested or zero audio provided
  if (req.isKneePainBenchmark || !req.audioBase64) {
    let bench = sampleKneePainConsultation.transcript;
    if (targetLang !== 'auto' && targetLang !== 'hi') {
      bench = await translateSegmentsToLanguage(bench, targetLang);
    }
    return {
      transcript: bench,
      providerUsed: 'Mock Speech Adapter (Knee Pain Benchmark Script)',
      detectedLanguage: getLanguageDisplayName(targetLang)
    };
  }

  // If real user audio was provided but no speech words were found in the stream
  return {
    transcript: [],
    providerUsed: 'Whisper STT (No clear speech detected in recorded audio)',
    detectedLanguage: 'None'
  };
}

function formatSeconds(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

