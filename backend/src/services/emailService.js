const { sendMail } = require('../config/mailer');
const { run } = require('../config/db');

const logNotification = (careProfileId, recipientEmail, type, subject) => {
  try {
    run(
      `INSERT INTO notification_logs (care_profile_id, recipient_email, notification_type, subject)
       VALUES (?, ?, ?, ?)`,
      [careProfileId, recipientEmail, type, subject]
    );
  } catch (err) {
    console.error('Failed to log notification:', err.message);
  }
};

/**
 * Upcoming dose reminder (sent ~15 mins prior)
 */
const sendUpcomingDoseReminder = async (careProfileId, email, patientName, medName, dosage, time) => {
  const subject = `⏰ Medication Reminder: ${patientName} has a dose at ${time}`;
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #2d3748; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #2b6cb0;">Medication Reminder</h2>
      <p>Hello,</p>
      <p>This is a scheduled reminder for <strong>${patientName}</strong>:</p>
      <div style="background: #ebf8ff; border-left: 4px solid #3182ce; padding: 12px; margin: 16px 0;">
        <p style="margin: 0; font-size: 16px;"><strong>Medication:</strong> ${medName} (${dosage})</p>
        <p style="margin: 4px 0 0; color: #4a5568;"><strong>Scheduled Time:</strong> Today at ${time}</p>
      </div>
      <p>Please ensure this dose is taken on schedule to maintain adherence.</p>
    </div>
  `;
  await sendMail({ to: email, subject, html });
  logNotification(careProfileId, email, 'upcoming_dose', subject);
};

/**
 * Missed dose escalation alert (Tier 1, Tier 2, or Terminal)
 */
const sendMissedDoseEscalation = async ({
  careProfileId,
  email,
  recipientName,
  patientName,
  medName,
  dosage,
  scheduledTime,
  tier,
  unresponsiveName
}) => {
  let urgencyHeader = `⚠️ Missed Dose Alert (Tier ${tier})`;
  let explanation = `The scheduled dose for <strong>${patientName}</strong> was not marked as taken within the grace period.`;
  
  if (tier === 99) {
    urgencyHeader = `🛑 CRITICAL: Unresolved Missed Dose - All Caretakers Alerted`;
    explanation = `<strong>${patientName}</strong>'s missed medication alert remains completely unacknowledged across all escalation tiers. Immediate contact or wellness check required!`;
  } else if (tier > 1) {
    urgencyHeader = `🚨 URGENT: Missed Dose Escalation (Tier ${tier})`;
    explanation = `<strong>${patientName}</strong> missed their medication, and the previous caretaker (${unresponsiveName || 'Tier ' + (tier - 1)}) did not acknowledge the alert within 30 minutes. You are now the active emergency contact.`;
  }

  const subject = `${urgencyHeader}: ${medName} for ${patientName}`;
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #2d3748; max-width: 600px; border: 2px solid #e53e3e; border-radius: 8px;">
      <h2 style="color: #c53030; margin-top: 0;">${urgencyHeader}</h2>
      <p>Hello ${recipientName || 'Caregiver'},</p>
      <p>${explanation}</p>
      
      <div style="background: #fff5f5; border-left: 4px solid #e53e3e; padding: 14px; margin: 16px 0;">
        <p style="margin: 0;"><strong>Patient:</strong> ${patientName}</p>
        <p style="margin: 4px 0;"><strong>Medication:</strong> ${medName} - ${dosage}</p>
        <p style="margin: 4px 0;"><strong>Scheduled For:</strong> ${scheduledTime}</p>
        <p style="margin: 4px 0; color: #e53e3e;"><strong>Status:</strong> Unacknowledged Missed Dose</p>
      </div>

      <p>Please check on ${patientName} immediately and mark the dose or acknowledge the alert on the care dashboard.</p>
    </div>
  `;
  await sendMail({ to: email, subject, html });
  logNotification(careProfileId, email, 'missed_escalation', subject);
};

/**
 * Doctor appointment reminder (24h or morning of)
 */
const sendAppointmentReminder = async (careProfileId, email, patientName, doctorName, specialty, datetime, location, notes) => {
  const subject = `🗓️ Upcoming Appointment: ${patientName} with ${doctorName}`;
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #2d3748; max-width: 600px; border: 1px solid #cbd5e0; border-radius: 8px;">
      <h2 style="color: #2b6cb0;">Upcoming Doctor Appointment</h2>
      <p>This is a reminder for <strong>${patientName}</strong>'s upcoming medical visit:</p>
      <div style="background: #edf2f7; border-left: 4px solid #4a5568; padding: 14px; margin: 16px 0;">
        <p style="margin: 0;"><strong>Doctor:</strong> ${doctorName} (${specialty || 'General'})</p>
        <p style="margin: 4px 0;"><strong>Date & Time:</strong> ${datetime}</p>
        <p style="margin: 4px 0;"><strong>Location:</strong> ${location || 'Clinic'}</p>
        ${notes ? `<p style="margin: 4px 0;"><strong>Instructions/Notes:</strong> ${notes}</p>` : ''}
      </div>
      <p>Please coordinate transportation and prepare any required medical records.</p>
    </div>
  `;
  await sendMail({ to: email, subject, html });
  logNotification(careProfileId, email, 'appointment', subject);
};

/**
 * AI check-in concerning risk alert
 */
const sendCheckinRiskAlert = async (careProfileId, email, patientName, riskLevel, responseText, flaggedSymptoms, summary) => {
  const subject = `⚠️ AI Wellbeing Alert: ${patientName} reported ${riskLevel.toUpperCase()} symptoms`;
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #2d3748; max-width: 600px; border: 2px solid ${riskLevel === 'high' ? '#e53e3e' : '#dd6b20'}; border-radius: 8px;">
      <h2 style="color: ${riskLevel === 'high' ? '#c53030' : '#c05621'};">Daily Wellbeing Check-In Alert</h2>
      <p>The AI monitoring system flagged potential concerns from <strong>${patientName}</strong>'s daily check-in:</p>
      
      <div style="background: #fffaf0; border-left: 4px solid #dd6b20; padding: 14px; margin: 16px 0;">
        <p style="margin: 0;"><strong>Assessed Risk Level:</strong> <span style="text-transform: uppercase; font-weight: bold;">${riskLevel}</span></p>
        <p style="margin: 6px 0;"><strong>Flagged Symptoms:</strong> ${flaggedSymptoms.join(', ') || 'General distress'}</p>
        <p style="margin: 6px 0;"><strong>Patient Words:</strong> "${responseText}"</p>
        <p style="margin: 6px 0; color: #744210;"><strong>Clinical Summary:</strong> ${summary}</p>
      </div>
      <p>Please reach out to ${patientName} to verify their current condition and comfort.</p>
    </div>
  `;
  await sendMail({ to: email, subject, html });
  logNotification(careProfileId, email, 'checkin_risk', subject);
};

module.exports = {
  sendUpcomingDoseReminder,
  sendMissedDoseEscalation,
  sendAppointmentReminder,
  sendCheckinRiskAlert
};
