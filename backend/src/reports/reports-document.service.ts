import { Injectable } from '@nestjs/common';
import {
  addCompactParagraph,
  addCompactTable,
  addMiniKeyValueGrid,
  addSectionTitle,
  addSignatureBlock,
  createHospitalPdfBuffer,
  formatPdfDate,
  patientName,
  staffName,
} from '../common/pdf/hospital-pdf';

/** Renders report documents from records already queried and authorized. */
@Injectable()
export class ReportsDocumentService {
  createConsultationMedicalReport(consultation: any, labOrders: any[]) {
    const latestTriage = consultation.appointment.triages[0];
    const reference = consultation.consultationNumber;

    return createHospitalPdfBuffer(
      {
        title: 'Medical Report',
        subtitle: 'Consultation clinical summary',
        reference,
        verificationCode: `MR-${reference}`,
        facility: consultation.facility,
        branch: consultation.branch,
        compact: true,
        qrPayload: `/reports/medical/consultations/${consultation.id}.pdf`,
      },
      (doc) => {
        addMiniKeyValueGrid(
          doc,
          [
            { label: 'Patient', value: patientName(consultation.patient) },
            { label: 'Patient No.', value: consultation.patient.patientNumber },
            { label: 'Phone', value: consultation.patient.phonePrimary },
            { label: 'Gender', value: consultation.patient.gender },
            { label: 'Consultation', value: reference },
            {
              label: 'Appointment',
              value: consultation.appointment.appointmentNumber,
            },
            { label: 'Doctor', value: staffName(consultation.doctor) },
            { label: 'Started', value: consultation.startedAt },
            { label: 'Status', value: consultation.statusCode },
            { label: 'Reason', value: consultation.appointment.visitReason },
          ],
          4,
        );

        if (latestTriage) {
          addSectionTitle(doc, 'Triage snapshot');
          addMiniKeyValueGrid(
            doc,
            [
              { label: 'Priority', value: latestTriage.triagePriority },
              { label: 'Temperature', value: latestTriage.temperatureC },
              {
                label: 'Blood pressure',
                value:
                  latestTriage.systolicBp || latestTriage.diastolicBp
                    ? `${latestTriage.systolicBp ?? '-'}/${latestTriage.diastolicBp ?? '-'}`
                    : '-',
              },
              { label: 'Pulse', value: latestTriage.pulseRate },
              { label: 'SPO2', value: latestTriage.oxygenSaturation },
              { label: 'Pain score', value: latestTriage.painScore },
            ],
            6,
          );
        }

        addSectionTitle(doc, 'Clinical notes');
        addCompactParagraph(
          doc,
          'Chief complaint',
          consultation.chiefComplaint,
        );
        addCompactParagraph(
          doc,
          'History of presenting illness',
          consultation.historyOfPresenting,
        );
        addCompactParagraph(
          doc,
          'Examination findings',
          consultation.examinationFindings,
        );
        addCompactParagraph(doc, 'Diagnosis', consultation.diagnosis);
        addCompactParagraph(doc, 'Treatment plan', consultation.treatmentPlan);
        addCompactParagraph(doc, 'Additional notes', consultation.notes);

        addSectionTitle(doc, 'Prescriptions');
        const prescriptionRows: Array<{
          date: string;
          medicine: string;
          dose: string;
          quantity: number;
          status: string;
        }> = consultation.prescriptions.flatMap((rx: any) =>
          rx.items.map((item: any) => ({
            date: formatPdfDate(rx.prescribedAt),
            medicine:
              item.medicineNameSnapshot ||
              item.medicine?.name ||
              `Medicine #${item.medicineId}`,
            dose: [item.dosage, item.route, item.frequency, item.duration]
              .filter(Boolean)
              .join(' / '),
            quantity: item.quantity,
            status: item.statusCode,
          })),
        );
        addCompactTable(
          doc,
          [
            { header: 'Date', width: 70, render: (row) => row.date },
            { header: 'Medicine', width: 180, render: (row) => row.medicine },
            {
              header: 'Dose / Route / Frequency',
              width: 160,
              render: (row) => row.dose,
            },
            { header: 'Qty', width: 45, render: (row) => row.quantity },
            { header: 'Status', width: 72, render: (row) => row.status },
          ],
          prescriptionRows,
          'No prescription items recorded for this consultation.',
        );

        addSectionTitle(doc, 'Lab orders and results');
        const labRows: Array<{
          order: string;
          test: string;
          status: string;
          result?: string | null;
          recordedAt?: Date | null;
        }> = labOrders.flatMap((order) =>
          order.items.map((item: any) => {
            const result = item.results[0];
            return {
              order: order.orderNumber,
              test: item.test.testName,
              status: item.status,
              result: result?.resultValue,
              recordedAt: result?.recordedAt,
            };
          }),
        );
        addCompactTable(
          doc,
          [
            { header: 'Order', width: 88, render: (row) => row.order },
            { header: 'Test', width: 170, render: (row) => row.test },
            { header: 'Status', width: 75, render: (row) => row.status },
            { header: 'Result', width: 126, render: (row) => row.result },
            { header: 'Recorded', width: 68, render: (row) => row.recordedAt },
          ],
          labRows,
          'No lab orders/results recorded for this consultation.',
        );

        addSignatureBlock(
          doc,
          [
            { label: 'Prepared by', value: staffName(consultation.doctor) },
            {
              label: 'Designation',
              value: consultation.doctor.designation || 'Clinician',
            },
            { label: 'Generated', value: new Date() },
          ],
          'Clinician sign off',
        );
      },
    );
  }
}
