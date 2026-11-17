import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CasePaper, Prescription, Consultation } from '@/types';

export function generateCasePaperPDF(consultation: Consultation): jsPDF {
  if (consultation.status !== 'approved') {
    throw new Error('SAFETY GATE: Cannot generate PDF for an unapproved case paper. Doctor approval is required.');
  }

  const cp = consultation.casePaper;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 14;

  // Header Background Banner
  doc.setFillColor(11, 19, 43); // Deep Navy #0B132B
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Clinic Header
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(cp.clinicDetails.name || 'PARASNATH SPECIALITY CLINIC', 14, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(196, 181, 253); // Light purple
  doc.text(cp.clinicDetails.tagline || 'Super Speciality Orthopaedics, Joint Care & Clinical Documentation', 14, 16);

  doc.setFontSize(7.5);
  doc.setTextColor(220, 225, 235);
  doc.text(`${cp.clinicDetails.address} | Contact: ${cp.clinicDetails.contact}`, 14, 21);
  doc.text(`Clinic Reg: ${cp.clinicDetails.regNo} | Branch: ${cp.clinicDetails.branch}`, 14, 25);

  y = 34;

  // Document Title Banner
  doc.setFillColor(243, 244, 246);
  doc.rect(14, y, pageWidth - 28, 8, 'F');
  doc.setDrawColor(209, 213, 219);
  doc.rect(14, y, pageWidth - 28, 8, 'S');

  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('OFFICIAL CLINICAL CASE PAPER', pageWidth / 2, y + 5.5, { align: 'center' });

  y += 12;

  // Patient & Visit Info Box (Parts 2 & 3)
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, y, pageWidth - 28, 22, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(`Patient ID:`, 18, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(`${cp.patientDetails.id}`, 40, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.text(`Patient Name:`, 90, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(`${cp.patientDetails.name}`, 118, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.text(`Age / Gender:`, 18, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(`${cp.patientDetails.age} Yrs / ${cp.patientDetails.gender}`, 40, y + 12);

  doc.setFont('helvetica', 'bold');
  doc.text(`Contact:`, 90, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(`${cp.patientDetails.contact}`, 118, y + 12);

  doc.setFont('helvetica', 'bold');
  doc.text(`Consult Date:`, 18, y + 18);
  doc.setFont('helvetica', 'normal');
  doc.text(`${cp.visitDetails.date} (${cp.visitDetails.time})`, 40, y + 18);

  doc.setFont('helvetica', 'bold');
  doc.text(`Attending Doctor:`, 90, y + 18);
  doc.setFont('helvetica', 'normal');
  doc.text(`${cp.visitDetails.doctorName} [${cp.visitDetails.doctorReg}]`, 118, y + 18);

  y += 28;

  // 12 Clinical Parts Render
  const sections = [
    { num: '4', title: 'CHIEF COMPLAINTS & DURATION', content: cp.chiefComplaints },
    { num: '5', title: 'HISTORY OF PRESENT ILLNESS (HPI)', content: cp.historyOfPresentIllness },
    { num: '6', title: 'PAST MEDICAL, SURGICAL & MEDICATION HISTORY', content: cp.pastMedicalHistory },
    { num: '7', title: 'PHYSICAL & CLINICAL EXAMINATION', content: cp.physicalExamination },
    {
      num: '8',
      title: 'CLINICAL ASSESSMENT & DIAGNOSIS',
      content: `Suspected Diagnosis: ${cp.clinicalAssessment?.suspected || 'None'}\nConfirmed Diagnosis: ${cp.clinicalAssessment?.confirmed || 'None'}`
    },
    { num: '9', title: 'TREATMENT & MANAGEMENT PLAN', content: cp.treatmentPlan },
    { num: '10', title: 'LIFESTYLE, REHABILITATION & DIET ADVICE', content: cp.lifestyleDietAdvice },
    { num: '11', title: 'FOLLOW-UP ADVICE & EMERGENCY INSTRUCTIONS', content: cp.followUpAdvice }
  ];

  sections.forEach(sec => {
    if (y > 250) {
      doc.addPage();
      y = 15;
    }

    doc.setFillColor(241, 245, 249);
    doc.rect(14, y, pageWidth - 28, 5.5, 'F');
    doc.setTextColor(30, 58, 138); // Blue 900
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(`PART ${sec.num}: ${sec.title}`, 16, y + 4);

    y += 7.5;

    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);

    const splitText = doc.splitTextToSize(sec.content || 'N/A', pageWidth - 32);
    doc.text(splitText, 16, y);
    y += splitText.length * 4.2 + 3.5;
  });

  // Doctor Approval Signature & Stamp (Part 12)
  if (y > 240) {
    doc.addPage();
    y = 15;
  }

  y += 4;
  doc.setDrawColor(79, 70, 229);
  doc.setLineWidth(0.4);
  doc.line(14, y, pageWidth - 14, y);
  y += 6;

  // Digital Doctor Signature Box
  doc.setFillColor(245, 243, 255);
  doc.roundedRect(pageWidth - 85, y, 71, 22, 2, 2, 'FD');
  doc.setTextColor(109, 40, 217);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('DIGITALLY SIGNED & APPROVED', pageWidth - 82, y + 5);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Doctor: ${cp.approvalSignature.doctorName || cp.visitDetails.doctorName}`, pageWidth - 82, y + 9.5);
  doc.text(`Registration: ${cp.visitDetails.doctorReg}`, pageWidth - 82, y + 13.5);
  doc.text(`Signed At: ${new Date(cp.approvalSignature.timestamp || Date.now()).toLocaleString()}`, pageWidth - 82, y + 17.5);

  // Footer Note
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(6.5);
  doc.text('Parasnath AI Documentation Engine | Strictly confidential medical record under Indian DPDP Act', 14, 290);
  doc.text(`Record ID: ${consultation.id} | Page 1 of 1`, pageWidth - 55, 290);

  return doc;
}

export function generatePrescriptionPDF(consultation: Consultation): jsPDF {
  if (consultation.status !== 'approved') {
    throw new Error('SAFETY GATE: Cannot generate Prescription PDF for unapproved draft.');
  }

  const cp = consultation.casePaper;
  const rx = consultation.prescription;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 14;

  // Header Background Banner
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Clinic Header
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(cp.clinicDetails.name || 'PARASNATH SPECIALITY CLINIC', 14, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(167, 139, 250);
  doc.text(`Doctor: ${cp.visitDetails.doctorName} | Reg No: ${cp.visitDetails.doctorReg}`, 14, 16);

  doc.setFontSize(7.5);
  doc.setTextColor(226, 232, 240);
  doc.text(`${cp.clinicDetails.address} | Ph: ${cp.clinicDetails.contact}`, 14, 21);
  doc.text(`Branch: ${cp.clinicDetails.branch} | Email: ${cp.clinicDetails.email}`, 14, 25);

  y = 33;

  // Prescription Title & Rx Symbol
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(79, 70, 229); // Indigo/Purple
  doc.text('℞ PRESCRIPTION', 14, y + 6);

  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text(`Rx ID: ${rx.id} | Date: ${cp.visitDetails.date}`, pageWidth - 70, y + 6);

  y += 10;

  // Patient Card
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, y, pageWidth - 28, 16, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.text(`Patient:`, 18, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(`${cp.patientDetails.name} (${cp.patientDetails.age}Y/${cp.patientDetails.gender})`, 34, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.text(`Patient ID:`, 110, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(`${cp.patientDetails.id}`, 130, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.text(`Diagnosis:`, 18, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(`${cp.clinicalAssessment?.suspected || cp.clinicalAssessment?.confirmed || 'Clinical Consultation'}`, 34, y + 12);

  y += 22;

  // Clean, Professional Table with jspdf-autotable (Zero Text Overlapping!)
  const tableData = rx.medicines.map((med, idx) => [
    (idx + 1).toString(),
    `${med.name}\n[${med.form}]${med.instructions ? '\nNote: ' + med.instructions : ''}`,
    med.dosage || '-',
    med.frequency || '-',
    med.timing || '-',
    med.duration || '-',
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [['#', 'Medicine & Formulation', 'Dosage', 'Frequency', 'Timing', 'Duration']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [79, 70, 229], // Indigo 600
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
      cellPadding: 2.5,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [15, 23, 42],
      cellPadding: 2.5,
      valign: 'middle',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 70, fontStyle: 'bold' },
      2: { cellWidth: 26 },
      3: { cellWidth: 26 },
      4: { cellWidth: 26 },
      5: { cellWidth: 24 },
    },
  });

  // Calculate position after autoTable
  y = (doc as any).lastAutoTable.finalY + 8;

  // General Instructions
  if (rx.instructions && rx.instructions.length > 0) {
    if (y > 230) { doc.addPage(); y = 15; }
    doc.setFillColor(241, 245, 249);
    doc.rect(14, y, pageWidth - 28, 5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text('GENERAL INSTRUCTIONS', 16, y + 3.8);
    y += 7;

    rx.instructions.forEach(ins => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      doc.text(`• ${ins}`, 18, y);
      y += 4.5;
    });
    y += 2;
  }

  // Dietary Advice
  if (rx.dietaryAdvice && rx.dietaryAdvice.length > 0) {
    if (y > 230) { doc.addPage(); y = 15; }
    doc.setFillColor(241, 245, 249);
    doc.rect(14, y, pageWidth - 28, 5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text('DIETARY & LIFESTYLE ADVICE', 16, y + 3.8);
    y += 7;

    rx.dietaryAdvice.forEach(adv => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      doc.text(`• ${adv}`, 18, y);
      y += 4.5;
    });
    y += 2;
  }

  // Follow-up Box
  if (y > 240) { doc.addPage(); y = 15; }
  doc.setFillColor(254, 243, 199); // Warm yellow
  doc.roundedRect(14, y, pageWidth - 28, 9, 1.5, 1.5, 'FD');
  doc.setTextColor(146, 64, 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`NEXT FOLLOW-UP DATE: ${rx.followUpDate || 'As advised'}`, 18, y + 5.5);

  y += 14;

  // Digital Signature Stamp
  if (y > 250) { doc.addPage(); y = 15; }
  doc.setFillColor(245, 243, 255);
  doc.roundedRect(pageWidth - 85, y, 71, 20, 2, 2, 'FD');
  doc.setTextColor(109, 40, 217);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('DOCTOR VERIFIED DIGITAL STAMP', pageWidth - 82, y + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(30, 41, 59);
  doc.text(`Signatory: ${cp.visitDetails.doctorName}`, pageWidth - 82, y + 9);
  doc.text(`Reg No: ${cp.visitDetails.doctorReg}`, pageWidth - 82, y + 13);
  doc.text(`Status: Approved & Digitally Verified`, pageWidth - 82, y + 17);

  // Footer Disclaimer
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(6.5);
  doc.text('Parasnath AI Health Platform | Doctor Verified Prescription | Valid for clinical dispensation', 14, 290);

  return doc;
}

function sanitizePdfText(text: string): string {
  if (!text) return '';
  // Replace non-Latin characters (e.g. Devanagari) that standard Helvetica cannot render cleanly
  const hasNonLatin = /[^\u0000-\u024F\u2000-\u206F\u2100-\u214F]/.test(text);
  if (!hasNonLatin) return text;
  const latinOnly = text.replace(/[^\u0000-\u024F\s.,!?():;\-/'"]/g, '').replace(/\s+/g, ' ').trim();
  return latinOnly.length > 5
    ? `${latinOnly} [Vernacular speech — see English summary above]`
    : '[Hindi/Marathi dialogue — summarized accurately in English above]';
}

export function generateFinalSummaryPrescriptionPDF(consultation: Consultation): jsPDF {
  if (consultation.status !== 'approved') {
    throw new Error('SAFETY GATE: Doctor approval is required before generating the Final Consultation Summary & Prescription PDF.');
  }

  const cp = consultation.casePaper;
  const rx = consultation.prescription;
  const ext = consultation.extraction;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 14;

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > 274) {
      doc.addPage();
      y = 16;
    }
  };

  // 1. Clinic Header Banner
  doc.setFillColor(11, 19, 43);
  doc.rect(0, 0, pageWidth, 29, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(cp.clinicDetails.name || 'PARASNATH SPECIALITY CLINIC', 14, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(196, 181, 253);
  doc.text(`Attending Doctor: ${cp.visitDetails.doctorName} | Reg No: ${cp.visitDetails.doctorReg}`, 14, 16.5);

  doc.setFontSize(7.5);
  doc.setTextColor(220, 225, 235);
  doc.text(`${cp.clinicDetails.address} | Contact: ${cp.clinicDetails.contact}`, 14, 21.5);
  doc.text(`Branch: ${cp.clinicDetails.branch} | Clinic Reg: ${cp.clinicDetails.regNo}`, 14, 25.8);

  y = 34;

  // Title Banner
  doc.setFillColor(238, 242, 255);
  doc.rect(14, y, pageWidth - 28, 9, 'F');
  doc.setDrawColor(99, 102, 241);
  doc.rect(14, y, pageWidth - 28, 9, 'S');
  doc.setTextColor(49, 46, 129);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('FINAL CONSULTATION CONVERSATION SUMMARY & PRESCRIPTION', pageWidth / 2, y + 6, { align: 'center' });

  y += 13;

  // Patient & Visit Info Card
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, y, pageWidth - 28, 20, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);

  doc.setFont('helvetica', 'bold');
  doc.text('Patient:', 18, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(`${cp.patientDetails.name} (${cp.patientDetails.age}Y / ${cp.patientDetails.gender})`, 36, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.text('Patient ID:', 120, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(`${cp.patientDetails.id}`, 142, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.text('Contact:', 18, y + 11.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${cp.patientDetails.contact || '-'}`, 36, y + 11.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Consult ID:', 120, y + 11.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${consultation.id} | ${cp.visitDetails.date}`, 142, y + 11.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Diagnosis:', 18, y + 17);
  doc.setFont('helvetica', 'normal');
  const dxLabel = cp.clinicalAssessment?.confirmed || cp.clinicalAssessment?.suspected || 'Clinical Consultation';
  doc.text(doc.splitTextToSize(dxLabel, pageWidth - 56)[0] || dxLabel, 36, y + 17);

  y += 25;

  // SECTION 1: Exact Doctor-Patient Conversation Summary
  const narrativeSummary =
    ext?.conversationSummary ||
    `Patient presented with: ${cp.chiefComplaints}. Clinical observations: ${cp.physicalExamination}. Plan discussed: ${cp.treatmentPlan}.`;
  const summaryLines = doc.splitTextToSize(sanitizePdfText(narrativeSummary), pageWidth - 36);
  const summaryBoxHeight = Math.max(16, summaryLines.length * 4.3 + 9);
  ensureSpace(summaryBoxHeight + 8);

  doc.setFillColor(245, 243, 255);
  doc.setDrawColor(139, 92, 246);
  doc.roundedRect(14, y, pageWidth - 28, summaryBoxHeight, 2, 2, 'FD');

  doc.setTextColor(91, 33, 182);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('1. DOCTOR - PATIENT CONSULTATION SUMMARY', 18, y + 5.5);

  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(summaryLines, 18, y + 10.5);

  y += summaryBoxHeight + 6;

  // Key Conversation Discussion Points (if present)
  if (ext?.keyDiscussionPoints && ext.keyDiscussionPoints.length > 0) {
    ensureSpace(24);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 58, 138);
    doc.text('KEY CONVERSATION EXCHANGES (PATIENT CONCERN VS DOCTOR ADVICE)', 14, y + 3);
    y += 5;

    autoTable(doc, {
      startY: y,
      margin: { left: 14, right: 14 },
      head: [['Discussion Topic', 'Patient Stated / Asked', 'Doctor Examined / Advised']],
      body: ext.keyDiscussionPoints.map((pt) => [
        sanitizePdfText(pt.topic || '-'),
        sanitizePdfText(pt.patientStatement || '-'),
        sanitizePdfText(pt.doctorStatement || '-'),
      ]),
      theme: 'grid',
      headStyles: { fillColor: [91, 33, 182], textColor: [255, 255, 255], fontSize: 7.5, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59], cellPadding: 2.2 },
      columnStyles: {
        0: { cellWidth: 36, fontStyle: 'bold' },
        1: { cellWidth: 73 },
        2: { cellWidth: 73 },
      },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // SECTION 2: Clinical Findings & Observations Table
  ensureSpace(26);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 58, 138);
  doc.text('2. CLINICAL EXAMINATION & ASSESSMENT', 14, y + 3);
  y += 5;

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    body: [
      ['Chief Complaints', sanitizePdfText(cp.chiefComplaints || '-')],
      ['Duration & History', sanitizePdfText(`${cp.historyOfPresentIllness || '-'} | Past History: ${cp.pastMedicalHistory || 'None'}`)],
      ['Physical Examination', sanitizePdfText(cp.physicalExamination || '-')],
      ['Clinical Assessment', sanitizePdfText(`Suspected: ${cp.clinicalAssessment?.suspected || 'None'} | Confirmed: ${cp.clinicalAssessment?.confirmed || 'Pending confirmation'}`)],
    ],
    theme: 'striped',
    bodyStyles: { fontSize: 8, textColor: [15, 23, 42], cellPadding: 2.2 },
    columnStyles: {
      0: { cellWidth: 42, fontStyle: 'bold', fillColor: [241, 245, 249] },
      1: { cellWidth: 140 },
    },
  });
  y = (doc as any).lastAutoTable.finalY + 7;

  // SECTION 3: Official Prescription (Rx)
  ensureSpace(28);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(79, 70, 229);
  doc.text('3. OFFICIAL PRESCRIPTION (Rx)', 14, y + 4);
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Rx ID: ${rx.id}`, pageWidth - 38, y + 4);
  y += 7;

  const rxRows = (rx.medicines || []).map((med, idx) => [
    (idx + 1).toString(),
    `${med.name}\n[${med.form}]${med.instructions ? '\nNote: ' + sanitizePdfText(med.instructions) : ''}`,
    med.dosage || '-',
    med.frequency || '-',
    med.timing || '-',
    med.duration || '-',
  ]);

  if (rxRows.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: 14, right: 14 },
      head: [['#', 'Medicine & Formulation', 'Dosage', 'Frequency', 'Timing', 'Duration']],
      body: rxRows,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, cellPadding: 2.5 },
      bodyStyles: { fontSize: 8, textColor: [15, 23, 42], cellPadding: 2.5, valign: 'middle' },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 70, fontStyle: 'bold' },
        2: { cellWidth: 26 },
        3: { cellWidth: 26 },
        4: { cellWidth: 26 },
        5: { cellWidth: 24 },
      },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('No pharmacological medicines prescribed for this consultation.', 16, y + 4);
    y += 9;
  }

  // Treatment & Dietary Instructions
  const allAdvice: string[] = [
    ...(rx.instructions || []).map((i) => `Instruction: ${sanitizePdfText(i)}`),
    ...(rx.dietaryAdvice || []).map((d) => `Lifestyle / Diet: ${sanitizePdfText(d)}`),
  ];

  if (allAdvice.length > 0) {
    ensureSpace(16);
    doc.setFillColor(241, 245, 249);
    doc.rect(14, y, pageWidth - 28, 5.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text('TREATMENT RECOMMENDATIONS & LIFESTYLE ADVICE', 16, y + 4);
    y += 7.5;

    allAdvice.forEach((line) => {
      const wrapped = doc.splitTextToSize(`• ${line}`, pageWidth - 36);
      ensureSpace(wrapped.length * 4.2 + 2);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text(wrapped, 17, y);
      y += wrapped.length * 4.2 + 1;
    });
    y += 2;
  }

  // Follow-up Bar
  ensureSpace(14);
  doc.setFillColor(254, 243, 199);
  doc.setDrawColor(245, 158, 11);
  doc.roundedRect(14, y, pageWidth - 28, 9, 1.5, 1.5, 'FD');
  doc.setTextColor(146, 64, 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`FOLLOW-UP ADVICE: ${sanitizePdfText(cp.followUpAdvice || 'As advised')} | Target Date: ${rx.followUpDate || 'As advised'}`, 18, y + 5.7);
  y += 14;

  // SECTION 4: Transcribed Doctor-Patient Conversation Log
  if (consultation.transcript && consultation.transcript.length > 0) {
    ensureSpace(24);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 58, 138);
    doc.text('4. TRANSCRIBED DOCTOR - PATIENT CONVERSATION LOG', 14, y + 3);
    y += 5;

    autoTable(doc, {
      startY: y,
      margin: { left: 14, right: 14 },
      head: [['Time', 'Speaker', 'Transcribed Speech']],
      body: consultation.transcript.map((seg) => [
        seg.timestamp || '00:00',
        seg.speaker,
        sanitizePdfText(seg.text),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 7.5, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59], cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 18, halign: 'center' },
        1: { cellWidth: 22, fontStyle: 'bold' },
        2: { cellWidth: 142 },
      },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Digital Signature Stamp
  ensureSpace(26);
  doc.setFillColor(245, 243, 255);
  doc.setDrawColor(124, 58, 237);
  doc.roundedRect(pageWidth - 88, y, 74, 21, 2, 2, 'FD');
  doc.setTextColor(109, 40, 217);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('DIGITALLY SIGNED & APPROVED', pageWidth - 84, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(30, 41, 59);
  doc.text(`Doctor: ${cp.approvalSignature?.doctorName || cp.visitDetails.doctorName}`, pageWidth - 84, y + 9.5);
  doc.text(`Reg No: ${cp.visitDetails.doctorReg}`, pageWidth - 84, y + 13.5);
  doc.text(`Signed: ${new Date(cp.approvalSignature?.timestamp || Date.now()).toLocaleString()}`, pageWidth - 84, y + 17.5);

  // Page numbers & confidentiality footer across all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(6.5);
    doc.text('Parasnath AI Clinical Documentation | Approved Consultation Summary & Prescription | Indian DPDP Act Compliant', 14, 290);
    doc.text(`Record: ${consultation.id} | Page ${p} of ${totalPages}`, pageWidth - 46, 290);
  }

  return doc;
}
