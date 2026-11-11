import cuid from "cuid";

type GenerateIdParams = {
    prefix?: string | null;
    idLength: number;
    sequence: number;
};

export function generateId({ prefix, idLength, sequence }: GenerateIdParams) {
    const paddedNumber = sequence.toString().padStart(idLength, "0");

    const manualId = `${prefix ?? ""}${paddedNumber}`;

    const uniqueId = `${manualId}_${cuid()}`;

    return {
        manualId,
        uniqueId,
    };
}
