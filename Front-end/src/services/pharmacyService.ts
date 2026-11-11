import { apiRequest } from "../lib/apiClient";
import { StockBatch } from "../types/hms";

export const pharmacyService = {
  async getAllStockBatches(): Promise<{ success: boolean; data: StockBatch[]; isLiveBackend: boolean }> {
    const res = await apiRequest("/pharmacy/getAllBatches");
    if (res.success && Array.isArray(res.data)) {
      const mappedBatches: StockBatch[] = res.data.map((item: any, idx: number) => ({
        id: item.id || `STK-${100 + idx}`,
        drugName: item.medicalItem?.name || item.drugName || "Medicine",
        genericName: item.medicalItem?.genericName || item.genericName || item.drugName || "Generic",
        category: (item.medicalItem?.category || item.category || "Tablet") as StockBatch["category"],
        batchNumber: item.batchNumber || `BATCH-${2026 + idx}`,
        manufacturer: item.manufacturer || "Sudheer Pharma",
        expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString().split("T")[0] : "2027-12-31",
        quantityInStock: item.quantityInStock !== undefined ? item.quantityInStock : item.quantity || 100,
        unitPrice: item.unitPrice || item.sellingPrice || 1.5,
        mrp: item.mrp || (item.unitPrice || 1.5) * 1.2,
        reorderLevel: item.reorderLevel || 20,
      }));
      return { success: true, data: mappedBatches, isLiveBackend: true };
    }

    return { success: false, data: [], isLiveBackend: false };
  },

  async createStockBatch(batchData: Partial<StockBatch>): Promise<{ success: boolean; data?: StockBatch; error?: string }> {
    const res = await apiRequest("/pharmacy/createBatch", {
      method: "POST",
      body: JSON.stringify(batchData),
    });

    if (res.success) {
      return { success: true, data: res.data };
    }
    return { success: false, error: res.error || "Failed to create stock batch in database" };
  },
};
