// ─────────────────────ADMISSION NOTIFICATIONS────────────────────

export const admissionPatientMessage = (
    patientName: string,
    admissionDate: string,
    admissionTime: string,
    roomNumber: string,
    doctorName: string,
    portalLink: string
): string => {
    return (
        `*Admission Confirmed*\n\n` +
        `Dear ${patientName},\n` +
        `You have been successfully admitted.\n\n` +
        `Date: ${admissionDate}\n` +
        `Time: ${admissionTime}\n` +
        `Room: ${roomNumber}\n` +
        `Doctor: Dr. ${doctorName}\n\n` +
        `View your admission details:\n${portalLink}\n\n` +
        `For any queries, please contact the hospital reception.`
    );
};

export const admissionDoctorMessage = (
    doctorName: string,
    patientName: string,
    patientAge: string,
    patientGender: string,
    admissionDate: string,
    admissionTime: string,
    roomNumber: string,
    referralSource: string
): string => {
    return (
        `New Patient Admitted\n\n` +
        `Dear Dr. ${doctorName},\n` +
        `A new patient has been assigned to you.\n\n` +
        `Patient: ${patientName}\n` +
        `Age: ${patientAge}\n` +
        `Gender: ${patientGender}\n` +
        `Admitted On: ${admissionDate} at ${admissionTime}\n` +
        `Room: ${roomNumber}\n` +
        `Referral: ${referralSource}\n\n` +
        `Please review the patient at your earliest convenience.`
    );
};

export const admissionReferrerMessage = (
    referrerName: string,
    patientName: string,
    admissionDate: string,
    doctorName: string
): string => {
    return (
        `Admission Acknowledgment\n\n` +
        `Dear ${referrerName},\n` +
        `We acknowledge the referral of your patient.\n\n` +
        `Patient: ${patientName}\n` +
        `Admitted On: ${admissionDate}\n` +
        `Assigned Doctor: Dr. ${doctorName}\n\n` +
        `Thank you for your referral. We will ensure the best care.`
    );
};

export const admissionManagingPersonMessage = (
    patientName: string,
    admissionDate: string,
    admissionTime: string,
    doctorName: string,
    roomNumber: string,
    referralSource: string
): string => {
    return (
        `New Admission Alert\n\n` +
        `Patient: ${patientName}\n` +
        `Date: ${admissionDate} at ${admissionTime}\n` +
        `Doctor: Dr. ${doctorName}\n` +
        `Room: ${roomNumber}\n` +
        `Referral: ${referralSource}\n\n` +
        `Please monitor and update records accordingly.`
    );
};

// ─────────────────────FOLLOW-UP REMINDERS────────────────────

export const followUpReminderPatientMessage = (
    patientName: string,
    followUpDate: string,
    followUpTime: string,
    doctorName: string
): string => {
    return (
        `Follow-Up Reminder\n\n` +
        `Dear ${patientName},\n` +
        `This is a reminder for your follow-up appointment *tomorrow*.\n\n` +
        `Date: ${followUpDate}\n` +
        `Time: ${followUpTime}\n` +
        `Doctor: Dr. ${doctorName}\n\n` +
        `Please arrive 10 minutes early. Contact reception if you need to reschedule.`
    );
};

export const followUpReminderDoctorMessage = (
    doctorName: string,
    patientName: string,
    patientAge: string,
    followUpDate: string,
    followUpTime: string,
    visitType: string
): string => {
    return (
        `Follow-Up Appointment Tomorrow\n\n` +
        `Dear Dr. ${doctorName},\n` +
        `You have a follow-up scheduled for tomorrow.\n\n` +
        `Patient: ${patientName}\n` +
        `Age: ${patientAge}\n` +
        `Date: ${followUpDate}\n` +
        `Time: ${followUpTime}\n` +
        `Visit Type: ${visitType}\n\n` +
        `Please review the patient history before the appointment.`
    );
};

// ─────────────────────OPD APPOINTMENT────────────────────

export const appointmentConfirmationPatientMessage = (
    patientName: string,
    appointmentDate: string,
    appointmentTime: string,
    doctorName: string,
    portalLink: string
): string => {
    return (
        `*Appointment Confirmed*\n\n` +
        `Dear ${patientName},\n` +
        `Your OPD appointment has been confirmed.\n\n` +
        `Date: ${appointmentDate}\n` +
        `Time: ${appointmentTime}\n` +
        `Doctor: Dr. ${doctorName}\n\n` +
        `View your appointment:\n${portalLink}\n\n` +
        `Please arrive 10 minutes early.`
    );
};


// ─────────────────────OPD DOCTOR NOTIFICATION────────────────────

export const opdDoctorNotificationMessage = (
    doctorName: string,
    patientName: string,
    patientAge: string,
    patientGender: string,
    appointmentDate: string,
    appointmentTime: string,
    referralSource: string
): string => {
    return (
        `*New OPD Appointment Assigned*\n\n` +
        `Dear Dr. ${doctorName},\n` +
        `You have a new patient appointment.\n\n` +
        `Patient: ${patientName}\n` +
        `Age: ${patientAge}\n` +
        `Gender: ${patientGender}\n` +
        `Date: ${appointmentDate}\n` +
        `Time: ${appointmentTime}\n` +
        `Referral: ${referralSource}\n\n` +
        `Please be available at the scheduled time.`
    );
};

// ─────────────────────OPD REFERRER NOTIFICATION────────────────────

export const opdReferrerNotificationMessage = (
    referrerName: string,
    patientName: string,
    appointmentDate: string,
    appointmentTime: string,
    doctorName: string
): string => {
    return (
        `*OPD Appointment Acknowledgment*\n\n` +
        `Dear ${referrerName},\n` +
        `The patient you referred has been given an OPD appointment.\n\n` +
        `Patient: ${patientName}\n` +
        `Date: ${appointmentDate}\n` +
        `Time: ${appointmentTime}\n` +
        `Consulting Doctor: Dr. ${doctorName}\n\n` +
        `Thank you for your referral.`
    );
};

// ─────────────────────HELPERS────────────────────

export const formatDate = (date: Date): string => {
    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
    });
};

export const formatTime = (date: Date): string => {
    return date.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
    });
};

const baseUrl = (): string =>
    process.env.PATIENT_PORTAL_URL ?? "http://localhost:3000";

export const getAppointmentLink = (appointmentId: string): string =>
    `${baseUrl()}/patient-portal/appointment/${appointmentId}`;

export const getPatientPortalLink = (patientInfoId: string): string =>
    `${baseUrl()}/patient-portal/${patientInfoId}`;