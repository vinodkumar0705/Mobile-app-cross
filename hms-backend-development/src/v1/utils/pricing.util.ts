import { PriceEntityType } from "@prisma/client";
import { prisma } from "../../lib/prisma";

/**
 * Fetches the currently active price rule for a given entity.
 * Supports passing a Prisma transaction client (tx) or a specific effective lookup date.
 */
export async function getActivePrice(entityType: PriceEntityType, entityId: string, txOrDate?: any, tx?: any) {
    let effectiveDate = new Date();
    let client = prisma;

    if (txOrDate instanceof Date) {
        effectiveDate = txOrDate;
        client = tx || prisma;
    } else if (txOrDate && typeof txOrDate === "object") {
        client = txOrDate;
    }

    // Rule enforcement priority:
    // 1) Temporary price (has validUntil !== null) that covers the effective date.
    // 2) Permanent price (validUntil === null) that started on or before effective date (backup).
    // 3) As a last resort, return the nearest future price rule if nothing else matches.

    // 1) Temporary matching rule
    let rule = await client.priceRule.findFirst({
        where: {
            entityType,
            entityId,
            validFrom: { lte: effectiveDate },
            validUntil: { not: null, gte: effectiveDate },
        },
        orderBy: [{ validFrom: "desc" }, { createdAt: "desc" }],
    });

    if (rule) return rule;

    // 2) Permanent rule (no validUntil) that has started already — acts as backup
    rule = await client.priceRule.findFirst({
        where: {
            entityType,
            entityId,
            validFrom: { lte: effectiveDate },
            validUntil: null,
        },
        orderBy: [{ validFrom: "desc" }, { createdAt: "desc" }],
    });

    if (rule) return rule;

    // 3) Last resort: nearest future rule (temporary or permanent)
    rule = await client.priceRule.findFirst({
        where: {
            entityType,
            entityId,
        },
        orderBy: [{ validFrom: "asc" }, { createdAt: "desc" }],
    });

    return rule;
}

/**
 * Utility to get just the price amount for an entity.
 * Falls back to 0 if no rule is found.
 */
export async function getActivePriceAmount(entityType: PriceEntityType, entityId: string, txOrDate?: any, tx?: any): Promise<number> {
    const rule = await getActivePrice(entityType, entityId, txOrDate, tx);
    return rule?.price || 0;
}

/**
 * Upserts an active price rule for an entity.
 * Sets the validUntil boundary of previous rules to avoid gaps instead of blindly deactivating them.
 */
export async function upsertPriceRule(entityType: PriceEntityType, entityId: string, price: number, additionalData: { mrp?: number; costPrice?: number; validFrom?: Date } = {}, tx?: any) {
    const client = tx || prisma;
    const newValidFrom = additionalData.validFrom || new Date();
    const newValidUntil = (additionalData as any).validUntil ?? null;

    // Prevent creating overlapping temporary prices
    if (newValidUntil !== null) {
        const overlapping = await client.priceRule.findFirst({
            where: {
                entityType,
                entityId,
                // only consider temporary rules (they have non-null validUntil)
                validUntil: { not: null },
                AND: [{ validFrom: { lte: newValidUntil } }, { validUntil: { gte: newValidFrom } }],
            },
        });

        if (overlapping) {
            throw new Error("Overlapping temporary price rule exists for the given date range");
        }
    }

    const currentPrice = await getActivePrice(entityType, entityId, newValidFrom, client);

    if (currentPrice) {
        const isPriceSame = Number(currentPrice.price) === Number(price);
        const isMrpSame = additionalData.mrp === undefined || (currentPrice.mrp === null ? additionalData.mrp === null : Number(currentPrice.mrp) === Number(additionalData.mrp));
        const isCostPriceSame =
            additionalData.costPrice === undefined || (currentPrice.costPrice === null ? additionalData.costPrice === null : Number(currentPrice.costPrice) === Number(additionalData.costPrice));
        const isDateSame = currentPrice.validFrom?.getTime() === newValidFrom.getTime();

        if (isPriceSame && isMrpSame && isCostPriceSame && isDateSame) {
            return currentPrice;
        }
    }

    // Adjust validity boundaries of current active rules to prevent gaps and maintain correct timeline
    const existingRules = await client.priceRule.findMany({
        where: {
            entityType,
            entityId,
        },
    });

    for (const rule of existingRules) {
        // If an existing rule starts at or after the new rule, supersede it
        if (rule.validFrom.getTime() >= newValidFrom.getTime()) {
            // Supersede future or same-start rules by marking them to end at newValidFrom
            await client.priceRule.update({
                where: { id: rule.id },
                data: { validUntil: newValidFrom },
            });
            continue;
        }

        // If existing rule starts before new rule and has no validUntil (permanent), set its validUntil to newValidFrom
        if (rule.validFrom.getTime() < newValidFrom.getTime()) {
            // Only adjust if existing rule doesn't already end before newValidFrom
            if (!rule.validUntil || rule.validUntil.getTime() > newValidFrom.getTime()) {
                await client.priceRule.update({
                    where: { id: rule.id },
                    data: { validUntil: newValidFrom },
                });
            }
        }
    }

    // Create new rule
    return await client.priceRule.create({
        data: {
            entityType,
            entityId,
            price,
            ...additionalData,
            validFrom: newValidFrom,
        },
    });
}

export async function deletePrices(entityType: PriceEntityType, entityId: string, tx?: any) {
    const client = tx || prisma;
    await client.priceRule.deleteMany({
        where: {
            entityType,
            entityId,
        },
    });
}
