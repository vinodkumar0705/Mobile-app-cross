import ExcelJS from "exceljs";
import { Response } from "express";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ExcelColumn {
    header: string;
    key: string;
    width?: number;
    /** Optional formatter applied to raw cell values before writing */
    formatter?: (value: any) => string | number;
}

export interface BuildExcelOptions {
    sheetName?: string;
    columns: ExcelColumn[];
    rows: Record<string, any>[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const HEADER_BG   = "1E6F9F"; // teal blue
const HEADER_FG   = "FFFFFF"; // white text
const ALT_ROW_BG  = "F2F7FA"; // light grey alternating row
const MAX_COL_W   = 40;
const DEFAULT_COL_W = 18;

// ─── Core builder ────────────────────────────────────────────────────────────

/**
 * Builds a styled .xlsx workbook buffer from a column definition + row data.
 *
 * Features:
 * - Bold, teal header row with white text
 * - Alternating light-grey row fill
 * - Borders on all cells
 * - Auto-width capped at MAX_COL_W
 * - Optional per-column formatters
 */
export async function buildExcelBuffer(options: BuildExcelOptions): Promise<Buffer> {
    const { sheetName = "Sheet1", columns, rows } = options;

    const workbook  = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    // ── Column definitions ──────────────────────────────────────────────────
    worksheet.columns = columns.map((col) => ({
        header : col.header,
        key    : col.key,
        width  : Math.min(col.width ?? DEFAULT_COL_W, MAX_COL_W),
    }));

    // ── Style header row ───────────────────────────────────────────────────
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
        cell.font       = { bold: true, color: { argb: HEADER_FG }, size: 11 };
        cell.fill       = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BG } };
        cell.alignment  = { vertical: "middle", horizontal: "center", wrapText: false };
        cell.border     = buildBorder();
    });
    headerRow.height = 22;

    // ── Add data rows ──────────────────────────────────────────────────────
    rows.forEach((rowData, idx) => {
        const row = worksheet.addRow(
            columns.reduce<Record<string, any>>((acc, col) => {
                let val = rowData[col.key];
                if (col.formatter) {
                    val = col.formatter(val);
                } else if (val instanceof Date) {
                    val = formatDateTime(val);
                } else if (val === null || val === undefined) {
                    val = "";
                }
                acc[col.key] = val;
                return acc;
            }, {})
        );

        // Alternating fill
        const isAlt = idx % 2 === 1;
        row.eachCell({ includeEmpty: true }, (cell) => {
            if (isAlt) {
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ALT_ROW_BG } };
            }
            cell.border    = buildBorder();
            cell.alignment = { vertical: "middle", wrapText: false };
        });

        row.height = 18;
    });

    // ── Auto-fit column widths (based on max content length) ───────────────
    worksheet.columns.forEach((col) => {
        if (!col.key) return;
        let maxLen = col.header?.length ?? 0;
        col.eachCell?.({ includeEmpty: false }, (cell) => {
            const txt = cell.text ?? "";
            if (txt.length > maxLen) maxLen = txt.length;
        });
        col.width = Math.min(Math.max(maxLen + 2, DEFAULT_COL_W), MAX_COL_W);
    });

    // ── Write to buffer ────────────────────────────────────────────────────
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as unknown as Buffer;
}

// ─── HTTP response helper ─────────────────────────────────────────────────────

/**
 * Sets the correct headers and sends the buffer as a file download.
 */
export function sendExcelResponse(res: Response, buffer: Buffer, filename: string): void {
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", buffer.length);
    res.end(buffer);
}

// ─── Private helpers ──────────────────────────────────────────────────────────

function buildBorder(): Partial<ExcelJS.Borders> {
    const side: ExcelJS.BorderStyle = "thin";
    return {
        top    : { style: side },
        left   : { style: side },
        bottom : { style: side },
        right  : { style: side },
    };
}

function formatDateTime(date: Date): string {
    if (!(date instanceof Date) || isNaN(date.getTime())) return "";
    const d  = String(date.getDate()).padStart(2, "0");
    const m  = String(date.getMonth() + 1).padStart(2, "0");
    const y  = date.getFullYear();
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    return `${d}/${m}/${y} ${hh}:${mm}`;
}

/** Formats a Date (or ISO string) as dd/mm/yyyy */
export function formatDate(value: any): string {
    if (!value) return "";
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return String(value);
    return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

/** Returns today's date as YYYY-MM-DD (used in filenames) */
export function todayStr(): string {
    return new Date().toISOString().split("T")[0];
}
