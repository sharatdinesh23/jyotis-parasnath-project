'use client';

import React, { useState } from 'react';
import { Consultation } from '@/types';
import {
  Volume2,
  Search,
  Download,
  User,
  Stethoscope,
  Calendar,
  Mic,
  FileAudio
} from 'lucide-react';

interface AudioArchiveViewProps {
  consultations: Consultation[];
  patientVoiceNotes: any[];
  onOpenConsultation?: (id: string) => void;
}

export const AudioArchiveView: React.FC<AudioArchiveViewProps> = ({
  consultations,
  patientVoiceNotes,
  onOpenConsultation,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'consultations' | 'patient_notes'>('all');

  const query = searchTerm.trim().toLowerCase();

  const consultationAudios = consultations
    .filter((c) => Boolean(c.audioUrl))
    .filter((c) => {
      if (!query) return true;
      return (
        c.id.toLowerCase().includes(query) ||
        c.patientId.toLowerCase().includes(query) ||
        (c.casePaper?.patientDetails?.name || '').toLowerCase().includes(query) ||
        (c.doctorName || '').toLowerCase().includes(query) ||
        (c.branch || '').toLowerCase().includes(query)
      );
    });

  const voiceNoteAudios = patientVoiceNotes
    .filter((vn) => Boolean(vn.audioData))
    .filter((vn) => {
      if (!query) return true;
      return (
        (vn.id || '').toLowerCase().includes(query) ||
        (vn.patientId || '').toLowerCase().includes(query) ||
        (vn.patientName || '').toLowerCase().includes(query) ||
        (vn.chiefIssue || '').toLowerCase().includes(query)
      );
    });

  return (
    <div className="space-y-6">
      {/* Header & Filter Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-extrabold text-white">
              Clinic Audio Recordings Archive (Consultations & Patient Voice Notes)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Persistent audio repository accessible anytime by Doctors, Patients (own records), Admins, and Superadmins.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search patient, doctor, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex bg-slate-950 border border-slate-800 rounded-xl p-0.5 text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-lg font-semibold ${filterType === 'all' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              All ({consultationAudios.length + voiceNoteAudios.length})
            </button>
            <button
              onClick={() => setFilterType('consultations')}
              className={`px-2.5 py-1 rounded-lg font-semibold ${filterType === 'consultations' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Consultations ({consultationAudios.length})
            </button>
            <button
              onClick={() => setFilterType('patient_notes')}
              className={`px-2.5 py-1 rounded-lg font-semibold ${filterType === 'patient_notes' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Patient Notes ({voiceNoteAudios.length})
            </button>
          </div>
        </div>
      </div>

      {/* Consultation Audio Recordings */}
      {(filterType === 'all' || filterType === 'consultations') && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileAudio className="w-4 h-4 text-emerald-400" />
              <span>Doctor–Patient Consultation Audio Recordings ({consultationAudios.length})</span>
            </h3>
          </div>

          {consultationAudios.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
              No stored consultation audio files match your filter yet. Record a consultation in the Doctor Voice Assistant to archive it here permanently.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {consultationAudios.map((c) => (
                <div key={c.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-purple-400" />
                          {c.casePaper?.patientDetails?.name || c.patientId}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800/50">
                          {c.id}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 flex flex-wrap items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Stethoscope className="w-3 h-3 text-cyan-400" />
                          {c.doctorName}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          {c.date}
                        </span>
                        <span className="font-mono text-amber-300">{c.audioDuration || 0}s</span>
                      </div>
                    </div>

                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                      c.status === 'approved' ? 'bg-emerald-950 text-emerald-300' : 'bg-amber-950 text-amber-300'
                    }`}>
                      {c.status === 'approved' ? 'Approved' : 'Pending'}
                    </span>
                  </div>

                  {c.extraction?.conversationSummary && (
                    <p className="text-[11px] text-slate-300 line-clamp-2 bg-slate-900/70 p-2 rounded-lg border border-slate-800/70">
                      {c.extraction.conversationSummary}
                    </p>
                  )}

                  <audio controls src={c.audioUrl} className="w-full h-9" />

                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <a
                      href={c.audioUrl}
                      download={`Consultation_${c.id}.webm`}
                      className="flex items-center gap-1 text-cyan-400 hover:underline font-semibold"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download Audio</span>
                    </a>
                    {onOpenConsultation && (
                      <button
                        onClick={() => onOpenConsultation(c.id)}
                        className="text-purple-400 hover:text-purple-300 font-semibold"
                      >
                        Open Record →
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Patient Pre-Visit Voice Notes */}
      {(filterType === 'all' || filterType === 'patient_notes') && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Mic className="w-4 h-4 text-cyan-400" />
              <span>Patient Pre-Consultation Voice Notes ({voiceNoteAudios.length})</span>
            </h3>
          </div>

          {voiceNoteAudios.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
              No patient-submitted voice note recordings match your filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {voiceNoteAudios.map((vn) => (
                <div key={vn.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white text-sm">{vn.patientName}</span>
                      <span className="text-[10px] font-mono text-cyan-400 ml-2">{vn.patientId}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      {new Date(vn.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-300 font-semibold">
                    Issue: {vn.chiefIssue || 'Patient voice intake'}
                  </p>
                  <audio controls src={vn.audioData} className="w-full h-9" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

