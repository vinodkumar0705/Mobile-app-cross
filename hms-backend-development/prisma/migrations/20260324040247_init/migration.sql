-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO', 'PDF', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "BloodGroupType" AS ENUM ('A+', 'B+', 'AB+', 'O+', 'A-', 'B-', 'AB-', 'O-', 'OTHER');

-- CreateEnum
CREATE TYPE "FieldType" AS ENUM ('text', 'number', 'date', 'file', 'select', 'multiSelect');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('NEW_APPOINTMENT', 'FOLLOW_UP');

-- CreateEnum
CREATE TYPE "AdmissionStatus" AS ENUM ('PLANNED', 'ADMITTED', 'DISCHARGE_STARTED', 'READY_FOR_DISCHARGE', 'DISCHARGED', 'DISCHARGE_PENDING', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AdmissionSourceType" AS ENUM ('DIRECT', 'FROM_APPOINTMENT', 'FROM_VISIT', 'FROM_EMERGENCY');

-- CreateEnum
CREATE TYPE "StaySessionStatus" AS ENUM ('ACTIVE', 'DISCHARGED', 'ABSCONDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'CLEANING_IN_PROGRESS', 'RESERVED', 'OUT_OF_SERVICE');

-- CreateEnum
CREATE TYPE "RoomBookingStatus" AS ENUM ('CONFIRMED', 'COMPLETED', 'CHECK_OUT', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "ReferralType" AS ENUM ('INTERNAL', 'EXTERNAL', 'NONE');

-- CreateEnum
CREATE TYPE "VisitType" AS ENUM ('OPD', 'IPD_FOLLOWUP', 'EMERGENCY', 'ROUTINE_CHECKUP');

-- CreateEnum
CREATE TYPE "VisitStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "MealTime" AS ENUM ('BEFORE_MEAL', 'AFTER_MEAL', 'WITH_MEAL', 'EMPTY_STOMACH', 'SOS');

-- CreateEnum
CREATE TYPE "PhysioTherapyStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "MedicalItemType" AS ENUM ('MEDICINE', 'MEDICAL_SUPPLY', 'SURGICAL_SUPPLY', 'DIAGNOSTIC_SUPPLY', 'CONSUMABLE', 'EQUIPMENT', 'INSTRUMENT', 'DISPOSABLE', 'INJECTABLE', 'IV_FLUID', 'DRESSING', 'TABLET', 'CAPSULE', 'SYRUP', 'INJECTION', 'OINTMENT', 'CREAM', 'LOTION', 'POWDER', 'GRANULES', 'DROPS', 'INHALER', 'SPRAY', 'SUPPOSITORY', 'PATCH', 'GEL', 'PASTE', 'WIPE', 'TAMPON', 'PAD', 'BANDAGE', 'GAUZE', 'ADHESIVE_TAPE', 'GLOVES', 'SYRINGE', 'CATHETER', 'STENT', 'IMPLANT', 'PROSTHESIS', 'ORTHOTIC', 'BRACE', 'CRUTCHES', 'WHEELCHAIR', 'OXYGEN_CYLINDER', 'VENTILATOR', 'MONITOR');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('ADD', 'REMOVE');

-- CreateEnum
CREATE TYPE "DispensationStatus" AS ENUM ('PENDING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "BillItemType" AS ENUM ('PHARMACY', 'APPOINTMENT', 'LAB');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('CASH', 'CARD', 'UPI', 'OTHER');

-- CreateEnum
CREATE TYPE "BillStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "HistoryType" AS ENUM ('ALLERGY', 'SURGERY', 'CHRONIC_CONDITION', 'FAMILY_HISTORY', 'SOCIAL_HISTORY');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('LAB_REPORT', 'SCAN_REPORT', 'XRAY', 'MRI', 'CT_SCAN', 'ULTRASOUND', 'PRESCRIPTION', 'MEDICAL_CERTIFICATE', 'DISCHARGE_SUMMARY', 'OTHER');

-- CreateEnum
CREATE TYPE "LabOrderStatus" AS ENUM ('PENDING', 'COLLECTED', 'PROCESSING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'VIEW', 'PRINT', 'DISPENSE');

-- CreateEnum
CREATE TYPE "SurgeryStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "Category" AS ENUM ('BLOOD', 'URINE', 'IMAGING', 'CARDIAC', 'PATHOLOGY', 'MICROBIOLOGY', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('NUMERIC', 'TEXT', 'RANGE', 'IMAGE', 'MULTIPLE');

-- CreateEnum
CREATE TYPE "TreatmentStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'RESCHEDULED', 'DISCONTINUED');

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "type" "MediaType" NOT NULL,
    "url" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "size" INTEGER,
    "isLink" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "licenseNumber" TEXT,
    "licenseExpiryDate" TIMESTAMP(3),
    "establishmentDate" TIMESTAMP(3),
    "taxIdentificationNumber" TEXT,
    "registeredAddress" TEXT,
    "autherizedAdmininstitorName" TEXT,
    "officialEmail" TEXT,
    "officialPhoneNumber" TEXT,
    "organizationLogo" TEXT,
    "organizationTagline" TEXT,
    "opdStartTime" TEXT DEFAULT '09:00',
    "opdEndTime" TEXT DEFAULT '18:00',
    "opdDuration" TEXT DEFAULT '15',
    "patientIdPrefix" TEXT,
    "employeeIdPrefix" TEXT,
    "patientIdCounter" INTEGER NOT NULL DEFAULT 0,
    "employeeIdCounter" INTEGER NOT NULL DEFAULT 0,
    "idLength" INTEGER,
    "consultationSpan" INTEGER DEFAULT 15,
    "consultationAttempts" INTEGER DEFAULT 1,
    "timezone" TEXT DEFAULT 'Asia/Kolkata',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "OrganizationStatus" NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "address" TEXT,
    "phoneNumber" TEXT,
    "email" TEXT,
    "managerName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "patientInfoId" TEXT,
    "employeeInfoId" TEXT,
    "email" TEXT,
    "username" TEXT,
    "phoneNumber" TEXT,
    "fName" TEXT,
    "lName" TEXT,
    "bloodGroup" "BloodGroupType",
    "password" TEXT DEFAULT '00000000',
    "isPatient" BOOLEAN NOT NULL DEFAULT false,
    "isDoctor" BOOLEAN NOT NULL DEFAULT false,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientInfo" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "age" TEXT,
    "gender" TEXT,
    "email" TEXT,
    "phoneNumber" TEXT,
    "weight" TEXT,
    "height" TEXT,
    "insuranceProvider" TEXT,
    "policyNumber" TEXT,
    "policyHolderName" TEXT,
    "policyExpiryDate" TIMESTAMP(3),
    "tpaName" TEXT,
    "emergencyContact" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactRelation" TEXT,
    "emergencyContactNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeInfo" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "highestQualification" TEXT,
    "institutionName" TEXT,
    "graduationYear" TEXT,
    "emergencyContact" TEXT,
    "emergencyName" TEXT,
    "relationship" TEXT,
    "licenseNumber" TEXT,
    "licenseExpiry" TEXT,
    "hireDate" TEXT,
    "dateOfBirth" TEXT,
    "address" TEXT,
    "additionalCertifications" TEXT,
    "experience" INTEGER DEFAULT 0,
    "salary" INTEGER DEFAULT 0,
    "age" TEXT,
    "gender" TEXT,
    "specialityId" TEXT,
    "consultationCharge" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "departmentId" TEXT,

    CONSTRAINT "EmployeeInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "departmentCode" TEXT,
    "medicalSpecialty" TEXT,
    "description" TEXT,
    "headDoctor" TEXT,
    "patientCapacity" INTEGER,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "location" TEXT,
    "departmentType" TEXT,
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Speciality" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "departmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Speciality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Qualification" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Qualification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Form" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Form_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormField" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FieldType" NOT NULL,
    "order" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormFieldOption" (
    "id" TEXT NOT NULL,
    "formFieldId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormFieldOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFormField" (
    "id" TEXT NOT NULL,
    "formfieldId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "valueSecondary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserFormField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeSlot" (
    "id" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "order" INTEGER,

    CONSTRAINT "TimeSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCalendarSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slotDuration" INTEGER NOT NULL DEFAULT 30,
    "bufferTime" INTEGER NOT NULL DEFAULT 5,
    "maxBookingsPerDay" INTEGER NOT NULL DEFAULT 10,
    "advanceBookingDays" INTEGER NOT NULL DEFAULT 30,
    "workingDays" TEXT[],
    "startOfDay" TEXT NOT NULL DEFAULT '09:00',
    "endOfDay" TEXT NOT NULL DEFAULT '17:00',

    CONSTRAINT "UserCalendarSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "patientId" TEXT,
    "title" TEXT,
    "description" TEXT,
    "reason" TEXT,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "appointmentType" "AppointmentType",
    "appointmentDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unavailability" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceRule" TEXT,
    "isAllDay" BOOLEAN NOT NULL DEFAULT false,
    "timeZone" TEXT NOT NULL DEFAULT 'UTC',
    "exceptionDates" TIMESTAMP(3)[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Unavailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admission" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "admittingDoctorId" TEXT NOT NULL,
    "sourceType" "AdmissionSourceType" NOT NULL,
    "sourceAppointmentId" TEXT,
    "sourceVisitId" TEXT,
    "reason" TEXT,
    "admissionDateTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedDischarge" TIMESTAMP(3),
    "actualDischarge" TIMESTAMP(3),
    "status" "AdmissionStatus" NOT NULL DEFAULT 'ADMITTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InpatientStaySession" (
    "id" TEXT NOT NULL,
    "admissionId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "status" "StaySessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentRoomBookingId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InpatientStaySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StayTransfer" (
    "id" TEXT NOT NULL,
    "staySessionId" TEXT NOT NULL,
    "fromRoomId" TEXT,
    "toRoomId" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "reason" TEXT,
    "transferredBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StayTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Building" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "buildingCode" TEXT,
    "numberOfFloors" INTEGER,

    CONSTRAINT "Building_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Floor" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Floor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "amenities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "amenities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "floorId" TEXT NOT NULL,
    "roomNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "equipment" TEXT[],
    "isWheelchairAccessible" BOOLEAN NOT NULL DEFAULT true,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "status" "RoomStatus" NOT NULL DEFAULT 'AVAILABLE',
    "currentOccupancy" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomBooking" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "doctorId" TEXT,
    "patientId" TEXT,
    "title" TEXT,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "timeZone" TEXT NOT NULL DEFAULT 'UTC',
    "attendees" TEXT[],
    "status" "RoomBookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "cancellationReason" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceRule" TEXT,
    "parentBookingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reference" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "visitId" TEXT,
    "referralEmployeeId" TEXT,
    "appointmentId" TEXT NOT NULL,
    "referralDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "referralName" TEXT,
    "referralContact" TEXT,
    "referralType" "ReferralType",
    "concessionPercentage" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Visit" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "inpatientStaySessionId" TEXT,
    "visitType" "VisitType" NOT NULL,
    "visitDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chiefComplaint" TEXT NOT NULL,
    "history" TEXT,
    "examination" TEXT,
    "diagnosis" TEXT,
    "status" "VisitStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "isAdmissionRecommended" BOOLEAN NOT NULL DEFAULT false,
    "testReportsToCarry" TEXT,
    "nextReviewDate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientVitals" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "admissionId" TEXT,
    "vitalsId" TEXT NOT NULL,
    "visitId" TEXT,
    "recordedBy" TEXT,
    "time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientVitals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vitals" (
    "id" TEXT NOT NULL,
    "temperature" TEXT,
    "bp" TEXT,
    "pulse" TEXT,
    "spo2" TEXT,
    "bloodSugar" TEXT,
    "weight" TEXT,
    "height" TEXT,
    "nurseNotes" TEXT,
    "temperatureUnit" TEXT,
    "bpUnit" TEXT,
    "pulseUnit" TEXT,
    "spo2Unit" TEXT,
    "bloodSugarUnit" TEXT,
    "weightUnit" TEXT,
    "heightUnit" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vitals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prescription" (
    "id" TEXT NOT NULL,
    "visitId" TEXT,
    "doctorId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "notes" TEXT,
    "discount" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrescriptionItem" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "dosage" TEXT,
    "frequency" TEXT,
    "duration" TEXT,
    "timing" "MealTime",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrescriptionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhysioTherapy" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "visitId" TEXT,
    "therapistName" TEXT,
    "exercise" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "time" TIMESTAMP(3) NOT NULL,
    "sets" INTEGER,
    "reps" INTEGER,
    "difficultyLevel" TEXT,
    "notes" TEXT,
    "sessionDate" TIMESTAMP(3) NOT NULL,
    "status" "PhysioTherapyStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhysioTherapy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Diet" (
    "id" TEXT NOT NULL,
    "patientId" TEXT,
    "visitId" TEXT,
    "specialInstructions" TEXT,
    "dieticianNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Diet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DischargeSummary" (
    "id" TEXT NOT NULL,
    "admissionId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "approvedByDoctor" BOOLEAN,
    "dischargeDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalDiagnosis" TEXT,
    "proceduresPerformed" TEXT,
    "medicationsAdministered" TEXT,
    "dietInstructions" TEXT,
    "careInstructions" TEXT,
    "followUpAdvice" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "employeeInfoId" TEXT,

    CONSTRAINT "DischargeSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "itemType" "MedicalItemType" NOT NULL,
    "unit" TEXT NOT NULL,
    "strength" TEXT,
    "dosageForm" TEXT,
    "genericName" TEXT,
    "brand" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "hasExpiry" BOOLEAN NOT NULL DEFAULT true,
    "requiresColdChain" BOOLEAN NOT NULL DEFAULT false,
    "isControlled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Batch" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "mfgDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "unitsPerStrip" INTEGER,
    "purchaseDate" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "sellingPrice" DOUBLE PRECISION,
    "costPrice" DOUBLE PRECISION,
    "mrp" DOUBLE PRECISION,
    "supplier" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "movementType" "StockMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT,
    "dispensationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispensation" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT,
    "batchId" TEXT NOT NULL,
    "pharmacistId" TEXT,
    "dispensedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quantity" INTEGER NOT NULL,
    "unitsPerStrip" INTEGER,
    "sellingPrice" DOUBLE PRECISION NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "status" "DispensationStatus" NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dispensation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillItem" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "itemId" TEXT,
    "batchId" TEXT,
    "referenceId" TEXT,
    "type" "BillItemType",
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bill" (
    "id" TEXT NOT NULL,
    "patientId" TEXT,
    "patientName" TEXT,
    "patientPhone" TEXT,
    "txId" TEXT,
    "paymentType" "PaymentType" DEFAULT 'OTHER',
    "discount" INTEGER DEFAULT 0,
    "status" "BillStatus" DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalHistory" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "type" "HistoryType",
    "condition" TEXT,
    "severity" "Severity",
    "startDate" TIMESTAMP(3),
    "isExternal" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "visitId" TEXT,
    "patientVitalsId" TEXT,
    "labOrderId" TEXT,
    "prescriptionId" TEXT,
    "medicalDocumentId" TEXT,
    "admissionId" TEXT,
    "appointmentId" TEXT,
    "dischargeSummaryId" TEXT,
    "recordedByUserId" TEXT,
    "patientProcedureId" TEXT,
    "treatmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalDocument" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "visitId" TEXT,
    "uploadedBy" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "mediaId" TEXT NOT NULL,
    "uploadDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "patientInfoId" TEXT,

    CONSTRAINT "MedicalDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabOrder" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "visitId" TEXT,
    "admissionId" TEXT,
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "LabOrderStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "userRole" TEXT,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Surgery" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "duration" TEXT,
    "cost" TEXT,
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Surgery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientProcedure" (
    "id" TEXT NOT NULL,
    "surgeryId" TEXT NOT NULL,
    "admissionId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "surgeryDate" TIMESTAMP(3),
    "externalDoctor" TEXT,
    "externalDoctorSpeciality" TEXT,
    "hospitalName" TEXT,
    "diagnosis" TEXT,
    "postOperativeNotes" TEXT,
    "followUpDate" TIMESTAMP(3),
    "status" "SurgeryStatus" DEFAULT 'SCHEDULED',
    "estimatedDuration" INTEGER,
    "actualDuration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientProcedure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_configurations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "Category",
    "price" TEXT,
    "duration" TEXT,
    "preparationInstructions" TEXT,
    "reportType" "ReportType",
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_parameters" (
    "id" TEXT NOT NULL,
    "labConfigId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT,
    "normalRange" TEXT,
    "is_critical" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_parameters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Treatment" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "visitId" TEXT,
    "admissionId" TEXT,
    "doctorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "treatmentDate" TIMESTAMP(3) NOT NULL,
    "diagnosis" TEXT NOT NULL,
    "externalDoctor" TEXT,
    "externalDoctorSpecialty" TEXT,
    "medications" TEXT,
    "additionalNotes" TEXT,
    "status" "TreatmentStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Treatment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_organization-user-m2m" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_organization-user-m2m_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_branch-user-m2m" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_branch-user-m2m_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_EmployeeInfoToQualification" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_EmployeeInfoToQualification_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_doctors" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_doctors_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_supportingStaff" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_supportingStaff_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_user-roles-m2m" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_user-roles-m2m_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_DepartmentToEmployeeInfo" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DepartmentToEmployeeInfo_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_PermissionToRole" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PermissionToRole_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_AmenityToRoom" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AmenityToRoom_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_LabConfigurationToLabOrder" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_LabConfigurationToLabOrder_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "Media_url_idx" ON "Media"("url");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_brandName_key" ON "Organization"("brandName");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_legalName_key" ON "Organization"("legalName");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_name_key" ON "Branch"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_phoneNumber_key" ON "User"("phoneNumber");

-- CreateIndex
CREATE INDEX "User_email_phoneNumber_username_idx" ON "User"("email", "phoneNumber", "username");

-- CreateIndex
CREATE UNIQUE INDEX "PatientInfo_userId_key" ON "PatientInfo"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeInfo_userId_key" ON "EmployeeInfo"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Qualification_name_key" ON "Qualification"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Form_name_key" ON "Form"("name");

-- CreateIndex
CREATE UNIQUE INDEX "FormField_name_key" ON "FormField"("name");

-- CreateIndex
CREATE UNIQUE INDEX "FormFieldOption_name_key" ON "FormFieldOption"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_code_key" ON "Permission"("code");

-- CreateIndex
CREATE INDEX "TimeSlot_startTime_endTime_idx" ON "TimeSlot"("startTime", "endTime");

-- CreateIndex
CREATE UNIQUE INDEX "TimeSlot_startTime_endTime_key" ON "TimeSlot"("startTime", "endTime");

-- CreateIndex
CREATE UNIQUE INDEX "UserCalendarSettings_userId_key" ON "UserCalendarSettings"("userId");

-- CreateIndex
CREATE INDEX "Appointment_doctorId_startTime_idx" ON "Appointment"("doctorId", "startTime");

-- CreateIndex
CREATE INDEX "Appointment_patientId_idx" ON "Appointment"("patientId");

-- CreateIndex
CREATE INDEX "Unavailability_userId_idx" ON "Unavailability"("userId");

-- CreateIndex
CREATE INDEX "Unavailability_startTime_endTime_idx" ON "Unavailability"("startTime", "endTime");

-- CreateIndex
CREATE INDEX "Admission_patientId_admissionDateTime_idx" ON "Admission"("patientId", "admissionDateTime");

-- CreateIndex
CREATE INDEX "Admission_admittingDoctorId_admissionDateTime_idx" ON "Admission"("admittingDoctorId", "admissionDateTime");

-- CreateIndex
CREATE INDEX "Admission_status_idx" ON "Admission"("status");

-- CreateIndex
CREATE INDEX "Admission_sourceAppointmentId_idx" ON "Admission"("sourceAppointmentId");

-- CreateIndex
CREATE INDEX "Admission_sourceVisitId_idx" ON "Admission"("sourceVisitId");

-- CreateIndex
CREATE UNIQUE INDEX "InpatientStaySession_admissionId_key" ON "InpatientStaySession"("admissionId");

-- CreateIndex
CREATE INDEX "InpatientStaySession_patientId_startedAt_idx" ON "InpatientStaySession"("patientId", "startedAt");

-- CreateIndex
CREATE INDEX "InpatientStaySession_status_idx" ON "InpatientStaySession"("status");

-- CreateIndex
CREATE INDEX "InpatientStaySession_currentRoomBookingId_idx" ON "InpatientStaySession"("currentRoomBookingId");

-- CreateIndex
CREATE INDEX "StayTransfer_staySessionId_effectiveFrom_idx" ON "StayTransfer"("staySessionId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "StayTransfer_fromRoomId_idx" ON "StayTransfer"("fromRoomId");

-- CreateIndex
CREATE INDEX "StayTransfer_toRoomId_idx" ON "StayTransfer"("toRoomId");

-- CreateIndex
CREATE UNIQUE INDEX "Building_name_key" ON "Building"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Floor_name_key" ON "Floor"("name");

-- CreateIndex
CREATE UNIQUE INDEX "amenities_name_key" ON "amenities"("name");

-- CreateIndex
CREATE UNIQUE INDEX "RoomType_name_key" ON "RoomType"("name");

-- CreateIndex
CREATE INDEX "Room_status_idx" ON "Room"("status");

-- CreateIndex
CREATE INDEX "RoomBooking_roomId_startTime_endTime_idx" ON "RoomBooking"("roomId", "startTime", "endTime");

-- CreateIndex
CREATE INDEX "RoomBooking_appointmentId_idx" ON "RoomBooking"("appointmentId");

-- CreateIndex
CREATE INDEX "RoomBooking_doctorId_startTime_idx" ON "RoomBooking"("doctorId", "startTime");

-- CreateIndex
CREATE INDEX "RoomBooking_startTime_endTime_idx" ON "RoomBooking"("startTime", "endTime");

-- CreateIndex
CREATE UNIQUE INDEX "RoomBooking_appointmentId_key" ON "RoomBooking"("appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Reference_appointmentId_key" ON "Reference"("appointmentId");

-- CreateIndex
CREATE INDEX "Visit_patientId_idx" ON "Visit"("patientId");

-- CreateIndex
CREATE INDEX "Visit_doctorId_visitDate_idx" ON "Visit"("doctorId", "visitDate");

-- CreateIndex
CREATE INDEX "Visit_visitDate_idx" ON "Visit"("visitDate");

-- CreateIndex
CREATE INDEX "PhysioTherapy_patientId_sessionDate_idx" ON "PhysioTherapy"("patientId", "sessionDate");

-- CreateIndex
CREATE INDEX "PhysioTherapy_visitId_idx" ON "PhysioTherapy"("visitId");

-- CreateIndex
CREATE UNIQUE INDEX "DischargeSummary_admissionId_key" ON "DischargeSummary"("admissionId");

-- CreateIndex
CREATE INDEX "MedicalItem_name_idx" ON "MedicalItem"("name");

-- CreateIndex
CREATE INDEX "MedicalItem_itemType_idx" ON "MedicalItem"("itemType");

-- CreateIndex
CREATE INDEX "MedicalItem_isActive_idx" ON "MedicalItem"("isActive");

-- CreateIndex
CREATE INDEX "MedicalItem_hasExpiry_idx" ON "MedicalItem"("hasExpiry");

-- CreateIndex
CREATE UNIQUE INDEX "MedicalItem_name_brand_strength_unit_key" ON "MedicalItem"("name", "brand", "strength", "unit");

-- CreateIndex
CREATE INDEX "Batch_expiryDate_idx" ON "Batch"("expiryDate");

-- CreateIndex
CREATE INDEX "Batch_mfgDate_idx" ON "Batch"("mfgDate");

-- CreateIndex
CREATE INDEX "Batch_isActive_idx" ON "Batch"("isActive");

-- CreateIndex
CREATE INDEX "Batch_itemId_expiryDate_idx" ON "Batch"("itemId", "expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "Batch_itemId_batchNumber_key" ON "Batch"("itemId", "batchNumber");

-- CreateIndex
CREATE INDEX "StockMovement_batchId_idx" ON "StockMovement"("batchId");

-- CreateIndex
CREATE INDEX "StockMovement_movementType_idx" ON "StockMovement"("movementType");

-- CreateIndex
CREATE INDEX "StockMovement_quantity_idx" ON "StockMovement"("quantity");

-- CreateIndex
CREATE INDEX "StockMovement_dispensationId_idx" ON "StockMovement"("dispensationId");

-- CreateIndex
CREATE INDEX "Dispensation_prescriptionId_idx" ON "Dispensation"("prescriptionId");

-- CreateIndex
CREATE INDEX "Dispensation_dispensedDate_idx" ON "Dispensation"("dispensedDate");

-- CreateIndex
CREATE INDEX "Dispensation_customerPhone_idx" ON "Dispensation"("customerPhone");

-- CreateIndex
CREATE INDEX "MedicalHistory_patientId_idx" ON "MedicalHistory"("patientId");

-- CreateIndex
CREATE INDEX "MedicalHistory_visitId_idx" ON "MedicalHistory"("visitId");

-- CreateIndex
CREATE INDEX "MedicalHistory_labOrderId_idx" ON "MedicalHistory"("labOrderId");

-- CreateIndex
CREATE INDEX "MedicalHistory_prescriptionId_idx" ON "MedicalHistory"("prescriptionId");

-- CreateIndex
CREATE INDEX "MedicalHistory_medicalDocumentId_idx" ON "MedicalHistory"("medicalDocumentId");

-- CreateIndex
CREATE INDEX "MedicalHistory_admissionId_idx" ON "MedicalHistory"("admissionId");

-- CreateIndex
CREATE INDEX "MedicalHistory_dischargeSummaryId_idx" ON "MedicalHistory"("dischargeSummaryId");

-- CreateIndex
CREATE INDEX "MedicalDocument_patientId_documentType_idx" ON "MedicalDocument"("patientId", "documentType");

-- CreateIndex
CREATE INDEX "LabOrder_patientId_orderDate_idx" ON "LabOrder"("patientId", "orderDate");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_timestamp_idx" ON "AuditLog"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "Surgery_name_key" ON "Surgery"("name");

-- CreateIndex
CREATE UNIQUE INDEX "lab_configurations_name_key" ON "lab_configurations"("name");

-- CreateIndex
CREATE UNIQUE INDEX "lab_parameters_labConfigId_name_key" ON "lab_parameters"("labConfigId", "name");

-- CreateIndex
CREATE INDEX "Treatment_patientId_treatmentDate_idx" ON "Treatment"("patientId", "treatmentDate");

-- CreateIndex
CREATE INDEX "Treatment_doctorId_idx" ON "Treatment"("doctorId");

-- CreateIndex
CREATE INDEX "_organization-user-m2m_B_index" ON "_organization-user-m2m"("B");

-- CreateIndex
CREATE INDEX "_branch-user-m2m_B_index" ON "_branch-user-m2m"("B");

-- CreateIndex
CREATE INDEX "_EmployeeInfoToQualification_B_index" ON "_EmployeeInfoToQualification"("B");

-- CreateIndex
CREATE INDEX "_doctors_B_index" ON "_doctors"("B");

-- CreateIndex
CREATE INDEX "_supportingStaff_B_index" ON "_supportingStaff"("B");

-- CreateIndex
CREATE INDEX "_user-roles-m2m_B_index" ON "_user-roles-m2m"("B");

-- CreateIndex
CREATE INDEX "_DepartmentToEmployeeInfo_B_index" ON "_DepartmentToEmployeeInfo"("B");

-- CreateIndex
CREATE INDEX "_PermissionToRole_B_index" ON "_PermissionToRole"("B");

-- CreateIndex
CREATE INDEX "_AmenityToRoom_B_index" ON "_AmenityToRoom"("B");

-- CreateIndex
CREATE INDEX "_LabConfigurationToLabOrder_B_index" ON "_LabConfigurationToLabOrder"("B");

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientInfo" ADD CONSTRAINT "PatientInfo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeInfo" ADD CONSTRAINT "EmployeeInfo_specialityId_fkey" FOREIGN KEY ("specialityId") REFERENCES "Speciality"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeInfo" ADD CONSTRAINT "EmployeeInfo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Speciality" ADD CONSTRAINT "Speciality_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormField" ADD CONSTRAINT "FormField_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormFieldOption" ADD CONSTRAINT "FormFieldOption_formFieldId_fkey" FOREIGN KEY ("formFieldId") REFERENCES "FormField"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFormField" ADD CONSTRAINT "UserFormField_formfieldId_fkey" FOREIGN KEY ("formfieldId") REFERENCES "FormField"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFormField" ADD CONSTRAINT "UserFormField_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCalendarSettings" ADD CONSTRAINT "UserCalendarSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "EmployeeInfo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientInfo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unavailability" ADD CONSTRAINT "Unavailability_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientInfo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_admittingDoctorId_fkey" FOREIGN KEY ("admittingDoctorId") REFERENCES "EmployeeInfo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_sourceAppointmentId_fkey" FOREIGN KEY ("sourceAppointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_sourceVisitId_fkey" FOREIGN KEY ("sourceVisitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InpatientStaySession" ADD CONSTRAINT "InpatientStaySession_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "Admission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InpatientStaySession" ADD CONSTRAINT "InpatientStaySession_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientInfo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InpatientStaySession" ADD CONSTRAINT "InpatientStaySession_currentRoomBookingId_fkey" FOREIGN KEY ("currentRoomBookingId") REFERENCES "RoomBooking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StayTransfer" ADD CONSTRAINT "StayTransfer_staySessionId_fkey" FOREIGN KEY ("staySessionId") REFERENCES "InpatientStaySession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StayTransfer" ADD CONSTRAINT "StayTransfer_fromRoomId_fkey" FOREIGN KEY ("fromRoomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StayTransfer" ADD CONSTRAINT "StayTransfer_toRoomId_fkey" FOREIGN KEY ("toRoomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Building" ADD CONSTRAINT "Building_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Floor" ADD CONSTRAINT "Floor_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "RoomType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "Floor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomBooking" ADD CONSTRAINT "RoomBooking_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomBooking" ADD CONSTRAINT "RoomBooking_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomBooking" ADD CONSTRAINT "RoomBooking_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientInfo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reference" ADD CONSTRAINT "Reference_referralEmployeeId_fkey" FOREIGN KEY ("referralEmployeeId") REFERENCES "EmployeeInfo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reference" ADD CONSTRAINT "Reference_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientInfo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reference" ADD CONSTRAINT "Reference_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_inpatientStaySessionId_fkey" FOREIGN KEY ("inpatientStaySessionId") REFERENCES "InpatientStaySession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientInfo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "EmployeeInfo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientVitals" ADD CONSTRAINT "PatientVitals_recordedBy_fkey" FOREIGN KEY ("recordedBy") REFERENCES "EmployeeInfo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientVitals" ADD CONSTRAINT "PatientVitals_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientInfo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientVitals" ADD CONSTRAINT "PatientVitals_vitalsId_fkey" FOREIGN KEY ("vitalsId") REFERENCES "Vitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientVitals" ADD CONSTRAINT "PatientVitals_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientVitals" ADD CONSTRAINT "PatientVitals_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "EmployeeInfo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientInfo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionItem" ADD CONSTRAINT "PrescriptionItem_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionItem" ADD CONSTRAINT "PrescriptionItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "MedicalItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysioTherapy" ADD CONSTRAINT "PhysioTherapy_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientInfo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysioTherapy" ADD CONSTRAINT "PhysioTherapy_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Diet" ADD CONSTRAINT "Diet_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientInfo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DischargeSummary" ADD CONSTRAINT "DischargeSummary_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "Admission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DischargeSummary" ADD CONSTRAINT "DischargeSummary_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "EmployeeInfo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DischargeSummary" ADD CONSTRAINT "DischargeSummary_employeeInfoId_fkey" FOREIGN KEY ("employeeInfoId") REFERENCES "EmployeeInfo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DischargeSummary" ADD CONSTRAINT "DischargeSummary_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientInfo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "MedicalItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_dispensationId_fkey" FOREIGN KEY ("dispensationId") REFERENCES "Dispensation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispensation" ADD CONSTRAINT "Dispensation_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispensation" ADD CONSTRAINT "Dispensation_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispensation" ADD CONSTRAINT "Dispensation_pharmacistId_fkey" FOREIGN KEY ("pharmacistId") REFERENCES "EmployeeInfo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillItem" ADD CONSTRAINT "BillItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillItem" ADD CONSTRAINT "BillItem_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillItem" ADD CONSTRAINT "BillItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "MedicalItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientInfo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalHistory" ADD CONSTRAINT "MedicalHistory_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientInfo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalHistory" ADD CONSTRAINT "MedicalHistory_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalHistory" ADD CONSTRAINT "MedicalHistory_labOrderId_fkey" FOREIGN KEY ("labOrderId") REFERENCES "LabOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalHistory" ADD CONSTRAINT "MedicalHistory_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalHistory" ADD CONSTRAINT "MedicalHistory_medicalDocumentId_fkey" FOREIGN KEY ("medicalDocumentId") REFERENCES "MedicalDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalHistory" ADD CONSTRAINT "MedicalHistory_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "Admission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalHistory" ADD CONSTRAINT "MedicalHistory_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalHistory" ADD CONSTRAINT "MedicalHistory_patientVitalsId_fkey" FOREIGN KEY ("patientVitalsId") REFERENCES "PatientVitals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalHistory" ADD CONSTRAINT "MedicalHistory_dischargeSummaryId_fkey" FOREIGN KEY ("dischargeSummaryId") REFERENCES "DischargeSummary"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalHistory" ADD CONSTRAINT "MedicalHistory_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalHistory" ADD CONSTRAINT "MedicalHistory_patientProcedureId_fkey" FOREIGN KEY ("patientProcedureId") REFERENCES "PatientProcedure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalHistory" ADD CONSTRAINT "MedicalHistory_treatmentId_fkey" FOREIGN KEY ("treatmentId") REFERENCES "Treatment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalDocument" ADD CONSTRAINT "MedicalDocument_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientInfo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalDocument" ADD CONSTRAINT "MedicalDocument_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalDocument" ADD CONSTRAINT "MedicalDocument_patientInfoId_fkey" FOREIGN KEY ("patientInfoId") REFERENCES "PatientInfo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabOrder" ADD CONSTRAINT "LabOrder_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientInfo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabOrder" ADD CONSTRAINT "LabOrder_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "EmployeeInfo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabOrder" ADD CONSTRAINT "LabOrder_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientProcedure" ADD CONSTRAINT "PatientProcedure_surgeryId_fkey" FOREIGN KEY ("surgeryId") REFERENCES "Surgery"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientProcedure" ADD CONSTRAINT "PatientProcedure_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientInfo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientProcedure" ADD CONSTRAINT "PatientProcedure_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "Admission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_parameters" ADD CONSTRAINT "lab_parameters_labConfigId_fkey" FOREIGN KEY ("labConfigId") REFERENCES "lab_configurations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Treatment" ADD CONSTRAINT "Treatment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientInfo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Treatment" ADD CONSTRAINT "Treatment_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "EmployeeInfo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Treatment" ADD CONSTRAINT "Treatment_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Treatment" ADD CONSTRAINT "Treatment_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "Admission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_organization-user-m2m" ADD CONSTRAINT "_organization-user-m2m_A_fkey" FOREIGN KEY ("A") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_organization-user-m2m" ADD CONSTRAINT "_organization-user-m2m_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_branch-user-m2m" ADD CONSTRAINT "_branch-user-m2m_A_fkey" FOREIGN KEY ("A") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_branch-user-m2m" ADD CONSTRAINT "_branch-user-m2m_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EmployeeInfoToQualification" ADD CONSTRAINT "_EmployeeInfoToQualification_A_fkey" FOREIGN KEY ("A") REFERENCES "EmployeeInfo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EmployeeInfoToQualification" ADD CONSTRAINT "_EmployeeInfoToQualification_B_fkey" FOREIGN KEY ("B") REFERENCES "Qualification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_doctors" ADD CONSTRAINT "_doctors_A_fkey" FOREIGN KEY ("A") REFERENCES "EmployeeInfo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_doctors" ADD CONSTRAINT "_doctors_B_fkey" FOREIGN KEY ("B") REFERENCES "PatientProcedure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_supportingStaff" ADD CONSTRAINT "_supportingStaff_A_fkey" FOREIGN KEY ("A") REFERENCES "EmployeeInfo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_supportingStaff" ADD CONSTRAINT "_supportingStaff_B_fkey" FOREIGN KEY ("B") REFERENCES "PatientProcedure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_user-roles-m2m" ADD CONSTRAINT "_user-roles-m2m_A_fkey" FOREIGN KEY ("A") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_user-roles-m2m" ADD CONSTRAINT "_user-roles-m2m_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DepartmentToEmployeeInfo" ADD CONSTRAINT "_DepartmentToEmployeeInfo_A_fkey" FOREIGN KEY ("A") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DepartmentToEmployeeInfo" ADD CONSTRAINT "_DepartmentToEmployeeInfo_B_fkey" FOREIGN KEY ("B") REFERENCES "EmployeeInfo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PermissionToRole" ADD CONSTRAINT "_PermissionToRole_A_fkey" FOREIGN KEY ("A") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PermissionToRole" ADD CONSTRAINT "_PermissionToRole_B_fkey" FOREIGN KEY ("B") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AmenityToRoom" ADD CONSTRAINT "_AmenityToRoom_A_fkey" FOREIGN KEY ("A") REFERENCES "amenities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AmenityToRoom" ADD CONSTRAINT "_AmenityToRoom_B_fkey" FOREIGN KEY ("B") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LabConfigurationToLabOrder" ADD CONSTRAINT "_LabConfigurationToLabOrder_A_fkey" FOREIGN KEY ("A") REFERENCES "lab_configurations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LabConfigurationToLabOrder" ADD CONSTRAINT "_LabConfigurationToLabOrder_B_fkey" FOREIGN KEY ("B") REFERENCES "LabOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
