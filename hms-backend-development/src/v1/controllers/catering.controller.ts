import { prisma } from "@/lib/prisma";
import { apiResponse } from "../utils/formatter";
import { Request, Response } from "express";
import { PriceEntityType } from "@prisma/client";
import { deletePrices, getActivePrice, getActivePriceAmount, upsertPriceRule } from "../utils/pricing.util";

interface ICateringController {
    createFoodItem: (req: Request, res: Response) => Promise<void>;
    updateFoodItem: (req: Request, res: Response) => Promise<void>;
    deleteFoodItem: (req: Request, res: Response) => Promise<void>;
    getAllFoodItems: (req: Request, res: Response) => Promise<void>;
}

/**
 * Extract price fields from request body.
 * FoodItems.price is @ignore in Prisma — it must be stored in PriceRule instead.
 */
function extractPriceFields(body: Record<string, any>) {
    const { price, ...foodData } = body;
    return {
        foodData,
        price,
    };
}

export const CateringController: ICateringController = {
    createFoodItem: async (req, res) => {
        const { foodData, price } = extractPriceFields(req.body);
        try {
            const foodItem = await prisma.$transaction(async (tx) => {
                const item = await tx.foodItems.create({
                    data: foodData as any,
                });

                // Always create a price rule — even if 0, so consumers get a consistent shape
                await upsertPriceRule(
                    PriceEntityType.FOOD,
                    item.id,
                    Number(price ?? 0),
                    {},
                    tx
                );

                return item;
            });

            const currentPrice = await getActivePriceAmount(PriceEntityType.FOOD, foodItem.id);

            return apiResponse(res, {
                status: 201,
                message: "Food item created successfully",
                data: {
                    ...foodItem,
                    price: currentPrice,
                },
            });
        } catch (error) {
            console.error("Error creating food item:", error);
            return apiResponse(res, { status: 500, message: "Failed to create food item", data: null });
        }
    },

    updateFoodItem: async (req, res) => {
        const { id } = req.params;
        const { foodData, price } = extractPriceFields(req.body);
        try {
            const foodItem = await prisma.$transaction(async (tx) => {
                const item = await tx.foodItems.update({
                    where: { id },
                    data: foodData as any,
                });

                // Only update price rule if price was provided
                if (price !== undefined) {
                    await upsertPriceRule(
                        PriceEntityType.FOOD,
                        id,
                        Number(price),
                        {},
                        tx
                    );
                }

                return item;
            });

            const currentPrice = await getActivePriceAmount(PriceEntityType.FOOD, id);

            return apiResponse(res, {
                status: 200,
                message: "Food item updated successfully",
                data: {
                    ...foodItem,
                    price: currentPrice,
                },
            });
        } catch (error) {
            console.error("Error updating food item:", error);
            return apiResponse(res, { status: 500, message: "Failed to update food item", data: null });
        }
    },

    deleteFoodItem: async (req, res) => {
        const { id } = req.params;
        try {
            // Check if the food item is assigned to any patient meal
            const assignmentCount = await prisma.patientMealFoodItems.count({
                where: { foodItemId: id },
            });

            if (assignmentCount > 0) {
                return apiResponse(res, {
                    status: 400,
                    message: "This food item is already assigned and cannot be deleted.",
                    data: null,
                });
            }

            const foodItem = await prisma.$transaction(async (tx) => {
                // Remove associated price rules
                await deletePrices(PriceEntityType.FOOD, id, tx);

                return await tx.foodItems.delete({ where: { id } });
            });

            return apiResponse(res, {
                status: 200,
                message: "Food item deleted successfully",
                data: foodItem,
            });
        } catch (error) {
            console.error("Error deleting food item:", error);
            return apiResponse(res, {
                status: 500,
                message: "Failed to delete food item",
                data: null,
            });
        }
    },

    getAllFoodItems: async (req, res) => {
        try {
            const foodItems = await prisma.foodItems.findMany();

            // Enrich each item with its active price
            const enriched = await Promise.all(
                foodItems.map(async (item) => {
                    const price = await getActivePriceAmount(PriceEntityType.FOOD, item.id);
                    return {
                        ...item,
                        price,
                    };
                })
            );

            return apiResponse(res, { status: 200, message: "Food items fetched successfully", data: enriched });
        } catch (error) {
            console.error("Error fetching food items:", error);
            return apiResponse(res, { status: 500, message: "Failed to fetch food items", data: null });
        }
    },
};
