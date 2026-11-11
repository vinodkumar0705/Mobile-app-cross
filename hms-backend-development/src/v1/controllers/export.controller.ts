import { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { buildExcelBuffer, sendExcelResponse, formatDate, todayStr, ExcelColumn } from "../utils/excel.util";
import { PriceEntityType } from "@prisma/client";
import { getActivePrice, getActivePriceAmount } from "../utils/pricing.util";
import { apiSuccess } from "../utils/formatter";


// ─── Helpers ─────────────────────────────────────────────────────────────────


function parseDateRange(query: any): { from?: Date; to?: Date } {
    const result: { from?: Date; to?: Date } = {};

    if (query.from) {
        const d = new Date(query.from);
        if (!isNaN(d.getTime())) {
            // Set to start of day in IST (UTC+5:30 = -330 minutes offset)
            d.setHours(0, 0, 0, 0);   // local midnight, not UTC midnight
            result.from = d;
        }
    }
    if (query.to) {
        const d = new Date(query.to);
        if (!isNaN(d.getTime())) {
            d.setHours(23, 59, 59, 999); // local end-of-day
            result.to = d;
        }
    }
    return result;
}


function fullName(user: any): string {
    if (!user) return "";
    return `${user.fName || ""} ${user.lName || ""}`.trim();
}


const PREVIEW_ROW_LIMIT = 100;


function isPreviewRequest(req: Request): boolean {
    return req.query.preview === "true" || req.query.preview === "1";
}


function sendExportPreview(res: Response, columns: ExcelColumn[], rows: Record<string, any>[]) {
    const previewRows = rows.slice(0, PREVIEW_ROW_LIMIT);
    return apiSuccess(res, {
        data: {
            columns: columns.map((col) => ({ header: col.header, key: col.key })),
            rows: previewRows,
            totalCount: rows.length,
            previewCount: previewRows.length,
        },
        message: "Export preview loaded",
    });
}


async function finishExport(
    req: Request,
    res: Response,
    sheetName: string,
    filePrefix: string,
    columns: ExcelColumn[],
    rows: Record<string, any>[]
) {
    if (isPreviewRequest(req)) {
        return sendExportPreview(res, columns, rows);
    }
    const buffer = await buildExcelBuffer({ sheetName, columns, rows });
    sendExcelResponse(res, buffer, `${filePrefix}_${todayStr()}.xlsx`);
}


// ─── Export Controller ───────────────────────────────────────────────────────


export interface ExportController {
    exportPatients: (req: Request, res: Response) => void;
    exportAppointments: (req: Request, res: Response) => void;
    exportAdmissions: (req: Request, res: Response) => void;
    exportLabOrders: (req: Request, res: Response) => void;
    exportLabResults: (req: Request, res: Response) => void;
    exportPharmacyStock: (req: Request, res: Response) => void;
    exportPharmacyBatches: (req: Request, res: Response) => void;
    exportEmployees: (req: Request, res: Response) => void;
    exportBilling: (req: Request, res: Response) => void;
}


export const ExportController: ExportController = {


    // ── Patients ────────────────────────────────────────────────────────────
    async exportPatients(req, res) {
        try {
            const { from, to } = parseDateRange(req.query);
            const where: any = { isPatient: true };

            if (from || to) {
                where.createdAt = {};
                if (from) where.createdAt.gte = from;
                if (to) where.createdAt.lte = to;
            }

            const patients = await prisma.user.findMany({
                where,
                select: {
                    fName: true, lName: true, email: true, phoneNumber: true, bloodGroup: true,
                    patientInfo: {
                        select: {
                            id: true, age: true, gender: true,
                            patientAppointments: { orderBy: { startTime: "desc" }, take: 1, select: { startTime: true } },
                            admissions: { orderBy: { admissionDateTime: "desc" }, take: 1, select: { admissionDateTime: true } },
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
            });

            const columns: ExcelColumn[] = [
                { header: "Patient ID", key: "patientId", width: 14 },
                { header: "Name", key: "name", width: 22 },
                { header: "Phone", key: "phone", width: 16 },
                { header: "Email", key: "email", width: 26 },
                { header: "Blood Group", key: "bloodGroup", width: 14 },
                { header: "Age", key: "age", width: 8 },
                { header: "Gender", key: "gender", width: 10 },
                { header: "Last Visit", key: "lastVisit", width: 18 },
            ];

            const rows = patients.map((p) => {
                const lastAppt = p.patientInfo?.patientAppointments?.[0]?.startTime;
                const lastAdm = p.patientInfo?.admissions?.[0]?.admissionDateTime;
                let lastVisit: Date | null = null;
                if (lastAppt && lastAdm) lastVisit = lastAppt > lastAdm ? lastAppt : lastAdm;
                else lastVisit = lastAppt || lastAdm || null;

                return {
                    patientId: p.patientInfo?.id || "",
                    name: fullName(p),
                    phone: p.phoneNumber || "",
                    email: p.email || "",
                    bloodGroup: p.bloodGroup || "",
                    age: p.patientInfo?.age ?? "",
                    gender: p.patientInfo?.gender || "",
                    lastVisit: formatDate(lastVisit),
                };
            });

            await finishExport(req, res, "Patients", "patients", columns, rows);
        } catch (error) {
            console.error("Export patients error:", error);
            res.status(500).json({ message: "Failed to export patients" });
        }
    },


    // ── Appointments ────────────────────────────────────────────────────────
    async exportAppointments(req, res) {
        try {
            const { from, to } = parseDateRange(req.query);
            const status = req.query.status as string | undefined;

            const where: any = {};
            if (from || to) {
                where.appointmentDate = {};
                if (from) where.appointmentDate.gte = from;
                if (to) where.appointmentDate.lte = to;
            }
            if (status) where.status = status;

            const appointments = await prisma.appointment.findMany({
                where,
                select: {
                    id: true, appointmentDate: true, startTime: true, status: true, paidAmount: true, appointmentType: true,
                    patient: { select: { id: true, age: true, gender: true, user: { select: { fName: true, lName: true, phoneNumber: true } } } },
                    doctor: { select: { id: true, user: { select: { fName: true, lName: true } } } },
                },
                orderBy: { startTime: "desc" },
            });

            const columns: ExcelColumn[] = [
                { header: "Patient", key: "patient", width: 22 },
                { header: "Phone", key: "phone", width: 16 },
                { header: "Doctor", key: "doctor", width: 22 },
                { header: "Date", key: "date", width: 14 },
                { header: "Start Time", key: "startTime", width: 14 },
                { header: "Type", key: "type", width: 16 },
                { header: "Status", key: "status", width: 14 },
                { header: "Paid Amount", key: "paidAmount", width: 14 },
            ];

            const rows = appointments.map((a) => ({
                patient: fullName(a.patient?.user),
                phone: a.patient?.user?.phoneNumber || "",
                doctor: fullName(a.doctor?.user),
                date: formatDate(a.appointmentDate),
                startTime: a.startTime ? new Date(a.startTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "",
                type: a.appointmentType || "",
                status: a.status,
                paidAmount: a.paidAmount ?? 0,
            }));

            await finishExport(req, res, "Appointments", "appointments", columns, rows);
        } catch (error) {
            console.error("Export appointments error:", error);
            res.status(500).json({ message: "Failed to export appointments" });
        }
    },


    // ── Admissions ──────────────────────────────────────────────────────────
    async exportAdmissions(req, res) {
        try {
            const { from, to } = parseDateRange(req.query);
            const status = req.query.status as string | undefined;

            const where: any = {};
            if (from || to) {
                where.admissionDateTime = {};
                if (from) where.admissionDateTime.gte = from;
                if (to) where.admissionDateTime.lte = to;
            }
            if (status) where.status = status;

            const admissions = await prisma.admission.findMany({
                where,
                select: {
                    id: true, status: true, admissionDateTime: true, expectedDischarge: true, reason: true,
                    patient: { select: { id: true, user: { select: { fName: true, lName: true, phoneNumber: true } } } },
                    admittingDoctor: { select: { user: { select: { fName: true, lName: true } } } },
                    staySession: { select: { currentRoomBooking: { select: { room: { select: { roomNumber: true } } } } } },
                },
                orderBy: { admissionDateTime: "desc" },
            });

            const columns: ExcelColumn[] = [
                { header: "Patient", key: "patient", width: 22 },
                { header: "Phone", key: "phone", width: 16 },
                { header: "Doctor", key: "doctor", width: 22 },
                { header: "Admission Date", key: "admissionDate", width: 16 },
                { header: "Expected Discharge", key: "expectedDischarge", width: 18 },
                { header: "Status", key: "status", width: 14 },
                { header: "Room", key: "room", width: 10 },
                { header: "Reason", key: "reason", width: 28 },
            ];

            const rows = admissions.map((a) => ({
                patient: fullName(a.patient?.user),
                phone: a.patient?.user?.phoneNumber || "",
                doctor: fullName(a.admittingDoctor?.user),
                admissionDate: formatDate(a.admissionDateTime),
                expectedDischarge: formatDate(a.expectedDischarge),
                status: a.status,
                room: a.staySession?.currentRoomBooking?.room?.roomNumber || "",
                reason: a.reason || "",
            }));

            await finishExport(req, res, "Admissions", "admissions", columns, rows);
        } catch (error) {
            console.error("Export admissions error:", error);
            res.status(500).json({ message: "Failed to export admissions" });
        }
    },


    // ── Lab Orders ──────────────────────────────────────────────────────────
    async exportLabOrders(req, res) {
        try {
            const { from, to } = parseDateRange(req.query);
            const status = req.query.status as string | undefined;

            const where: any = {};
            if (from || to) {
                where.orderDate = {};
                if (from) where.orderDate.gte = from;
                if (to) where.orderDate.lte = to;
            }
            if (status) where.status = status;

            const labOrders = await prisma.labOrder.findMany({
                where,
                orderBy: { orderDate: "desc" },
                include: {
                    patient: { include: { user: { select: { fName: true, lName: true, phoneNumber: true } } } },
                    doctor: { include: { user: { select: { fName: true, lName: true } } } },
                    testIds: { select: { name: true } },
                },
            });

            const columns: ExcelColumn[] = [
                { header: "Patient", key: "patient", width: 22 },
                { header: "Phone", key: "phone", width: 16 },
                { header: "Tests", key: "tests", width: 30 },
                { header: "Status", key: "status", width: 14 },
                { header: "Ordered By", key: "orderedBy", width: 22 },
                { header: "Order Date", key: "orderDate", width: 16 },
                { header: "Notes", key: "notes", width: 28 },
            ];

            const rows = labOrders.map((o) => ({
                patient: fullName(o.patient?.user),
                phone: o.patient?.user?.phoneNumber || "",
                tests: o.testIds.map((t: any) => t.name).join(", "),
                status: o.status,
                orderedBy: fullName(o.doctor?.user),
                orderDate: formatDate(o.orderDate),
                notes: o.notes || "",
            }));

            await finishExport(req, res, "Lab Orders", "lab_orders", columns, rows);
        } catch (error) {
            console.error("Export lab orders error:", error);
            res.status(500).json({ message: "Failed to export lab orders" });
        }
    },


    // ── Lab Results ─────────────────────────────────────────────────────────
    async exportLabResults(req, res) {
        try {
            const { from, to } = parseDateRange(req.query); // ← added
            const status = req.query.status as string | undefined;

            const where: any = {};
            if (from || to) {                               // ← added
                where.testDate = {};
                if (from) where.testDate.gte = from;
                if (to) where.testDate.lte = to;
            }
            if (status) where.status = status;

            const labResults = await prisma.labTestResult.findMany({
                where,
                orderBy: { testDate: "desc" },
                include: {
                    patient: { include: { user: { select: { fName: true, lName: true } } } },
                    doctor: { include: { user: { select: { fName: true, lName: true } } } },
                    enteredBy: { include: { user: { select: { fName: true, lName: true } } } },
                    verifiedBy: { include: { user: { select: { fName: true, lName: true } } } },
                    labOrder: { select: { testIds: { select: { name: true } } } },
                },
            });

            const columns: ExcelColumn[] = [
                { header: "Patient", key: "patient", width: 22 },
                { header: "Tests", key: "tests", width: 30 },
                { header: "Status", key: "status", width: 14 },
                { header: "Doctor", key: "doctor", width: 22 },
                { header: "Entered By", key: "enteredBy", width: 20 },
                { header: "Verified By", key: "verifiedBy", width: 20 },
                { header: "Date", key: "date", width: 14 },
                { header: "Remarks", key: "remarks", width: 28 },
            ];

            const rows = labResults.map((r) => ({
                patient: fullName(r.patient?.user),
                tests: r.labOrder?.testIds?.map((t: any) => t.name).join(", ") || "",
                status: r.status,
                doctor: fullName(r.doctor?.user),
                enteredBy: fullName(r.enteredBy?.user),
                verifiedBy: fullName(r.verifiedBy?.user),
                date: formatDate(r.testDate),
                remarks: r.remarks || "",
            }));

            await finishExport(req, res, "Lab Results", "lab_results", columns, rows);
        } catch (error) {
            console.error("Export lab results error:", error);
            res.status(500).json({ message: "Failed to export lab results" });
        }
    },


    // ── Pharmacy Stock ──────────────────────────────────────────────────────
    async exportPharmacyStock(req, res) {
        try {
            const { from, to } = parseDateRange(req.query); // ← added

            const where: any = { isActive: true };
            if (from || to) {                               // ← added
                where.createdAt = {};
                if (from) where.createdAt.gte = from;
                if (to) where.createdAt.lte = to;
            }

            const items = await prisma.medicalItem.findMany({
                where,
                select: {
                    id: true, name: true, itemType: true, brand: true, genericName: true,
                    dosageForm: true, strength: true, unit: true,
                    batches: { where: { isActive: true }, select: { id: true, quantity: true } },
                },
                orderBy: { name: "asc" },
            });

            const enriched = await Promise.all(
                items.map(async (item) => {
                    const totalStock = item.batches.reduce((s, b) => s + b.quantity, 0);
                    let mrp = 0, sellingPrice = 0;
                    if (item.batches.length > 0) {
                        const priceRule = await getActivePrice(PriceEntityType.PHARMACY, item.batches[0].id);
                        mrp = priceRule?.mrp || 0;
                        sellingPrice = priceRule?.price || 0;
                    }
                    return { ...item, totalStock, mrp, sellingPrice };
                })
            );

            const columns: ExcelColumn[] = [
                { header: "Item Name", key: "name", width: 24 },
                { header: "Type", key: "itemType", width: 14 },
                { header: "Brand", key: "brand", width: 18 },
                { header: "Generic Name", key: "genericName", width: 22 },
                { header: "Dosage Form", key: "dosageForm", width: 14 },
                { header: "Strength", key: "strength", width: 12 },
                { header: "Unit", key: "unit", width: 10 },
                { header: "Total Stock", key: "totalStock", width: 12 },
                { header: "MRP", key: "mrp", width: 10 },
                { header: "Selling Price", key: "sellingPrice", width: 14 },
            ];

            const rows = enriched.map((i) => ({
                name: i.name, itemType: i.itemType || "", brand: i.brand || "",
                genericName: i.genericName || "", dosageForm: i.dosageForm || "",
                strength: i.strength || "", unit: i.unit || "",
                totalStock: i.totalStock, mrp: i.mrp, sellingPrice: i.sellingPrice,
            }));

            await finishExport(req, res, "Pharmacy Stock", "pharmacy_stock", columns, rows);
        } catch (error) {
            console.error("Export pharmacy stock error:", error);
            res.status(500).json({ message: "Failed to export pharmacy stock" });
        }
    },


    // ── Pharmacy Batches ────────────────────────────────────────────────────
    async exportPharmacyBatches(req, res) {
        try {
            const { from, to } = parseDateRange(req.query); // ← added

            const where: any = { isActive: true };
            if (from || to) {                               // ← added
                where.expiryDate = {};
                if (from) where.expiryDate.gte = from;
                if (to) where.expiryDate.lte = to;
            }

            const batches = await prisma.batch.findMany({
                where,
                include: { item: { select: { name: true, brand: true, strength: true, unit: true } } },
                orderBy: { expiryDate: "asc" },
            });

            const enriched = await Promise.all(
                batches.map(async (b) => {
                    const priceRule = await getActivePrice(PriceEntityType.PHARMACY, b.id);
                    return { ...b, costPrice: priceRule?.costPrice || 0, mrp: priceRule?.mrp || 0, sellingPrice: priceRule?.price || 0 };
                })
            );

            const columns: ExcelColumn[] = [
                { header: "Item", key: "item", width: 24 },
                { header: "Batch No.", key: "batchNumber", width: 16 },
                { header: "Expiry", key: "expiry", width: 14 },
                { header: "Quantity", key: "quantity", width: 12 },
                { header: "Cost Price", key: "costPrice", width: 12 },
                { header: "MRP", key: "mrp", width: 10 },
                { header: "Selling Price", key: "sellingPrice", width: 14 },
            ];

            const rows = enriched.map((b) => ({
                item: b.item?.name || "", batchNumber: b.batchNumber || "",
                expiry: formatDate(b.expiryDate), quantity: b.quantity,
                costPrice: b.costPrice, mrp: b.mrp, sellingPrice: b.sellingPrice,
            }));

            await finishExport(req, res, "Pharmacy Batches", "pharmacy_batches", columns, rows);
        } catch (error) {
            console.error("Export pharmacy batches error:", error);
            res.status(500).json({ message: "Failed to export pharmacy batches" });
        }
    },


    // ── Employees ───────────────────────────────────────────────────────────
    async exportEmployees(req, res) {
        try {
            const { from, to } = parseDateRange(req.query); // ← added

            const where: any = { isPatient: false };
            if (from || to) {                               // ← added
                where.employeeInfo = {
                    hireDate: {},
                };
                if (from) where.employeeInfo.hireDate.gte = from;
                if (to) where.employeeInfo.hireDate.lte = to;
            }

            const employees = await prisma.user.findMany({
                where,
                select: {
                    fName: true, lName: true, email: true, phoneNumber: true,
                    roles: { select: { name: true } },
                    employeeInfo: {
                        select: {
                            id: true, hireDate: true,
                            department: { select: { name: true } },
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
            });

            const columns: ExcelColumn[] = [
                { header: "Name", key: "name", width: 22 },
                { header: "Email", key: "email", width: 26 },
                { header: "Phone", key: "phone", width: 16 },
                { header: "Role", key: "role", width: 16 },
                { header: "Department", key: "department", width: 20 },
                { header: "Joining Date", key: "joiningDate", width: 14 },
            ];

            const rows = employees.map((e) => ({
                name: fullName(e),
                email: e.email || "",
                phone: e.phoneNumber || "",
                role: e.roles?.map((r) => r.name).join(", ") || "",
                department: e.employeeInfo?.department?.map((d: any) => d.name).join(", ") || "",
                joiningDate: formatDate(e.employeeInfo?.hireDate),
            }));

            await finishExport(req, res, "Employees", "employees", columns, rows);
        } catch (error) {
            console.error("Export employees error:", error);
            res.status(500).json({ message: "Failed to export employees" });
        }
    },


    // ── Billing ──────────────────────────────────────────────────────────────
    async exportBilling(req, res) {
        try {
            const { from, to } = parseDateRange(req.query);
            const status = req.query.status as string | undefined;

            const where: any = {};
            if (from || to) {
                where.createdAt = {};
                if (from) where.createdAt.gte = from;
                if (to) where.createdAt.lte = to;
            }
            if (status) where.status = status;

            const bills: any[] = await prisma.bill.findMany({
                where,
                orderBy: { createdAt: "desc" },
                include: {
                    patient: { include: { user: { select: { fName: true, lName: true, phoneNumber: true } } } },
                    items: { where: { status: "ACTIVE" }, select: { unitPrice: true, quantity: true } },
                    adjustments: { where: { active: true }, select: { type: true, mode: true, value: true } },
                    payments: { select: { amount: true, type: true } },
                },
            });

            const columns: ExcelColumn[] = [
                { header: "Bill ID", key: "billId", width: 18 },
                { header: "Patient / Name", key: "patient", width: 22 },
                { header: "Phone", key: "phone", width: 16 },
                { header: "Bill Type", key: "billType", width: 10 },
                { header: "Status", key: "status", width: 12 },
                { header: "Subtotal", key: "subtotal", width: 12 },
                { header: "Adjustments", key: "adjustments", width: 14 },
                { header: "Final Amount", key: "finalAmount", width: 14 },
                { header: "Paid", key: "paid", width: 12 },
                { header: "Outstanding", key: "outstanding", width: 14 },
                { header: "Date", key: "date", width: 14 },
            ];

            const rows = bills.map((b: any) => {
                const subtotal = b.items.reduce((s: number, i: any) => s + i.unitPrice * i.quantity, 0);
                let adjTotal = 0;
                for (const adj of b.adjustments) {
                    const val = adj.mode === "PERCENTAGE" ? (subtotal * adj.value) / 100 : adj.value;
                    if (adj.type === "DISCOUNT" || adj.type === "WAIVER") adjTotal -= val;
                    else if (adj.type === "EXTRA_CHARGE") adjTotal += val;
                }
                const finalAmount = Math.max(0, subtotal + adjTotal);
                const paid = b.payments.filter((p: any) => p.type === "PAYMENT" || p.type === "ADVANCE").reduce((s: number, p: any) => s + p.amount, 0)
                    - b.payments.filter((p: any) => p.type === "REFUND").reduce((s: number, p: any) => s + p.amount, 0);

                const patientName = b.patient ? fullName(b.patient.user) : b.externalName || "";
                const phone = b.patient?.user?.phoneNumber || b.externalPhone || "";

                return {
                    billId: b.id,
                    patient: patientName,
                    phone,
                    billType: b.type || "",
                    status: b.status,
                    subtotal: Math.round(subtotal * 100) / 100,
                    adjustments: Math.round(adjTotal * 100) / 100,
                    finalAmount: Math.round(finalAmount * 100) / 100,
                    paid: Math.round(paid * 100) / 100,
                    outstanding: Math.round(Math.max(0, finalAmount - paid) * 100) / 100,
                    date: formatDate(b.createdAt),
                };
            });

            const numericKeys = ["subtotal", "adjustments", "finalAmount", "paid", "outstanding"] as const;
            const totalsRow: any = {
                billId: "TOTAL",
                patient: "",
                phone: "",
                billType: "",
                status: "",
                date: "",
            };
            for (const key of numericKeys) {
                totalsRow[key] = Math.round(
                    rows.reduce((sum, r) => sum + (r[key] as number), 0) * 100
                ) / 100;
            }
            rows.push(totalsRow);

            await finishExport(req, res, "Billing", "billing", columns, rows);
        } catch (error) {
            console.error("Export billing error:", error);
            res.status(500).json({ message: "Failed to export billing" });
        }
    },
};