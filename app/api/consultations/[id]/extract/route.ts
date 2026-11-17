import { NextResponse } from 'next/server';
import { extractMedicalData } from '@/lib/adapters/ai-service';
import { clinicStore } from '@/lib/store';

function toText(val: any): string {
  if (!val) return '';
  if (Array.isArray(val)) return val.filter(Boolean).join('; ');
  return String(val);
}

function toArray(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(v => String(v).trim()).filter(Boolean);
  return [String(val).trim()].filter(Boolean);
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const consultation = clinicStore.getConsultationById(params.id);
    
    const transcript = body.transcript || consultation?.transcript || [];
    if (!transcript || transcript.length === 0) {
      return NextResponse.json({ error: 'No transcript provided for extraction' }, { status: 400 });
    }

    const rawExtraction = await extractMedicalData({
      transcript,
      patientName: body.patientName || consultation?.casePaper?.patientDetails?.name,
      patientAge: body.patientAge || consultation?.casePaper?.patientDetails?.age,
      patientGender: body.patientGender || consultation?.casePaper?.patientDetails?.gender,
      providerOverride: body.providerOverride,
      modelOverride: body.modelOverride,
      apiKeyOverride: body.apiKeyOverride,
    });

    const normalizedMedicines = (rawExtraction.medicinesMentioned || []).map((m: any, idx: number) => ({
      id: m.id || `med-${idx + 1}`,
      name: m.name || 'Unnamed Medicine',
      form: m.form || 'Tablet',
      dosage: m.dosage || '',
      frequency: m.frequency || 'As advised',
      timing: m.timing || 'After Food',
      duration: m.duration || '5 days',
      instructions: m.instructions || '',
      flagged: Boolean(m.flagged || !m.frequency || !m.dosage),
      flagReason: m.flagReason || (!m.frequency ? 'Frequency not stated in consultation' : '')
    }));

    const normalizedFlags = (rawExtraction.flags || []).map((f: any, idx: number) => {
      if (typeof f === 'string') {
        return {
          id: `fl-${idx + 1}`,
          type: 'missing_frequency' as const,
          message: f,
          field: 'medicinesMentioned',
          resolved: false
        };
      }
      return {
        id: f.id || `fl-${idx + 1}`,
        type: f.type || 'low_confidence',
        message: f.message || 'Requires doctor verification',
        field: f.field || 'general',
        resolved: Boolean(f.resolved)
      };
    });

    const extraction = {
      conversationSummary: toText(rawExtraction.conversationSummary) || toText(rawExtraction.patientSymptomsReported),
      keyDiscussionPoints: Array.isArray(rawExtraction.keyDiscussionPoints) ? rawExtraction.keyDiscussionPoints : [],
      patientSymptomsReported: toText(rawExtraction.patientSymptomsReported) || 'See consultation transcript.',
      durationAndSeverity: toText(rawExtraction.durationAndSeverity) || 'Not specified',
      relevantMedicalHistory: toText(rawExtraction.relevantMedicalHistory) || 'None reported',
      doctorClinicalObservations: toText(rawExtraction.doctorClinicalObservations) || 'Examination notes pending doctor confirmation',
      suspectedDiagnoses: toArray(rawExtraction.suspectedDiagnoses),
      confirmedDiagnoses: toArray(rawExtraction.confirmedDiagnoses),
      treatmentRecommendations: toArray(rawExtraction.treatmentRecommendations),
      medicinesMentioned: normalizedMedicines,
      lifestyleDietInstructions: toArray(rawExtraction.lifestyleDietInstructions),
      followUpRecommendation: toText(rawExtraction.followUpRecommendation) || 'Follow up as advised.',
      followUpDate: rawExtraction.followUpDate || '',
      flags: normalizedFlags,
      providerUsed: rawExtraction.providerUsed || 'Parasnath AI'
    };

    if (consultation) {
      consultation.extraction = extraction;
      
      // Update case paper fields from extraction
      consultation.casePaper.chiefComplaints = extraction.patientSymptomsReported || consultation.casePaper.chiefComplaints;
      consultation.casePaper.historyOfPresentIllness = extraction.durationAndSeverity || consultation.casePaper.historyOfPresentIllness;
      consultation.casePaper.pastMedicalHistory = extraction.relevantMedicalHistory || consultation.casePaper.pastMedicalHistory;
      consultation.casePaper.physicalExamination = extraction.doctorClinicalObservations || consultation.casePaper.physicalExamination;
      consultation.casePaper.clinicalAssessment = {
        suspected: extraction.suspectedDiagnoses.join('; '),
        confirmed: extraction.confirmedDiagnoses.join('; ')
      };
      consultation.casePaper.treatmentPlan = extraction.treatmentRecommendations.join('\n') || consultation.casePaper.treatmentPlan;
      consultation.casePaper.lifestyleDietAdvice = extraction.lifestyleDietInstructions.join('\n') || consultation.casePaper.lifestyleDietAdvice;
      consultation.casePaper.followUpAdvice = extraction.followUpRecommendation || consultation.casePaper.followUpAdvice;

      consultation.prescription.medicines = extraction.medicinesMentioned;
      consultation.prescription.instructions = extraction.treatmentRecommendations;
      consultation.prescription.dietaryAdvice = extraction.lifestyleDietInstructions;
      consultation.prescription.followUpDate = extraction.followUpDate;
      consultation.prescription.flags = extraction.flags;

      clinicStore.saveConsultation(consultation);
    }

    return NextResponse.json({
      success: true,
      extraction,
      providerUsed: extraction.providerUsed
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

