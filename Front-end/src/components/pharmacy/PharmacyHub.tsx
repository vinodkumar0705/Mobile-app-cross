import React, { useState } from "react";
import {
  Package,
  Receipt,
  Utensils,
  Plus,
  Trash2,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Pill,
  DollarSign,
  Scan,
  X,
  FilePlus,
} from "lucide-react";
import { StockBatch, PharmacyBillItem, PatientDiet, Prescription } from "../../types/hms";
import {
  getStockBatches,
  saveStockBatches,
  getDiets,
  saveDiets,
  getPatients,
  getPrescriptions,
} from "../../lib/storage";
import { pharmacyService } from "../../services/pharmacyService";

interface PharmacyHubProps {
  onOpenPrint: () => void;
  onOpenScanner: () => void;
}

export const PharmacyHub: React.FC<PharmacyHubProps> = ({
  onOpenPrint,
  onOpenScanner,
}) => {
  const [stockBatches, setStockBatches] = useState<StockBatch[]>(getStockBatches());
  const [diets, setDiets] = useState<PatientDiet[]>(getDiets());
  const [patients] = useState(getPatients());
  const prescriptions = getPrescriptions();

  React.useEffect(() => {
    pharmacyService.getAllStockBatches().then((res) => {
      if (res.success) {
        setStockBatches(res.data);
      }
    });
  }, []);

  const [activeTab, setActiveTab] = useState<"billing" | "stock" | "catering">("billing");

  // POS Billing Cart State
  const [cartItems, setCartItems] = useState<PharmacyBillItem[]>([
    {
      drugId: "STK-101",
      drugName: "Telmisartan 40mg Tablet",
      batchNumber: "TLM-2026-A12",
      quantity: 30,
      unitPrice: 0.8,
      total: 24.0,
    },
    {
      drugId: "STK-102",
      drugName: "Atorvastatin 10mg Tablet",
      batchNumber: "ATV-2025-B88",
      quantity: 30,
      unitPrice: 1.2,
      total: 36.0,
    },
  ]);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [patientName, setPatientName] = useState<string>("John Doe");

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Add New Medicine Stock Modal State
  const [showAddStockModal, setShowAddStockModal] = useState<boolean>(false);
  const [newDrugName, setNewDrugName] = useState<string>("");
  const [newBatchNumber, setNewBatchNumber] = useState<string>("");
  const [newCategory, setNewCategory] = useState<StockBatch["category"]>("Tablet");
  const [newQuantity, setNewQuantity] = useState<number>(100);
  const [newUnitPrice, setNewUnitPrice] = useState<number>(1.5);
  const [newExpiryDate, setNewExpiryDate] = useState<string>("2027-12-31");
  const [newReorderLevel, setNewReorderLevel] = useState<number>(20);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleImportPrescription = (rx: Prescription) => {
    setPatientName(rx.patientName);
    const newCartItems: PharmacyBillItem[] = rx.items.map((item, idx) => ({
      drugId: `STK-${100 + idx}`,
      drugName: item.drugName,
      batchNumber: `BATCH-RX-${rx.id.slice(-4)}`,
      quantity: item.quantity,
      unitPrice: item.unitPrice || 1.0,
      total: item.quantity * (item.unitPrice || 1.0),
    }));
    setCartItems(newCartItems);
    showToast(`Loaded Prescription from Dr. ${rx.doctorName} for ${rx.patientName}`);
  };

  // Calculate Cart Totals
  const subtotal = cartItems.reduce((acc, item) => acc + item.total, 0);
  const discountAmt = (subtotal * discountPercent) / 100;
  const taxAmt = (subtotal - discountAmt) * 0.05; // 5% GST tax
  const grandTotal = subtotal - discountAmt + taxAmt;

  const handleAddMedicineToCart = (batch: StockBatch) => {
    const existing = cartItems.find((item) => item.drugId === batch.id);
    if (existing) {
      setCartItems(
        cartItems.map((item) =>
          item.drugId === batch.id
            ? {
                ...item,
                quantity: item.quantity + 10,
                total: (item.quantity + 10) * item.unitPrice,
              }
            : item
        )
      );
    } else {
      setCartItems([
        ...cartItems,
        {
          drugId: batch.id,
          drugName: batch.drugName,
          batchNumber: batch.batchNumber,
          quantity: 30,
          unitPrice: batch.unitPrice,
          total: 30 * batch.unitPrice,
        },
      ]);
    }
    showToast(`Added ${batch.drugName} to Cart`);
  };

  const handleRemoveCartItem = (drugId: string) => {
    setCartItems(cartItems.filter((item) => item.drugId !== drugId));
  };

  const handleCheckoutBill = () => {
    if (cartItems.length === 0) {
      showToast("Cart is empty!");
      return;
    }
    showToast(`Invoice Generated for ${patientName}! Total: $${grandTotal.toFixed(2)}`);
    onOpenPrint();
    setCartItems([]);
  };

  const handleToggleMealStatus = (
    dietId: string,
    mealType: "breakfast" | "lunch" | "dinner"
  ) => {
    const updated = diets.map((d) => {
      if (d.id === dietId) {
        const key = `${mealType}Status` as keyof PatientDiet;
        const current = d[key];
        const next = current === "Delivered" ? "Scheduled" : "Delivered";
        return { ...d, [key]: next };
      }
      return d;
    });
    setDiets(updated);
    saveDiets(updated);
    showToast("Updated meal delivery status");
  };

  const handleCreateStockBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDrugName.trim()) {
      showToast("Please enter a valid drug name!");
      return;
    }

    const generatedBatchNumber = newBatchNumber.trim() || `BTCH-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const price = Number(newUnitPrice) || 1.0;
    const newBatch: StockBatch = {
      id: `STK-${Date.now()}`,
      drugName: newDrugName.trim(),
      genericName: newDrugName.trim(),
      batchNumber: generatedBatchNumber,
      manufacturer: "Sudheer Pharma",
      category: newCategory,
      quantityInStock: Number(newQuantity) || 100,
      unitPrice: price,
      mrp: price * 1.2,
      expiryDate: newExpiryDate || "2027-12-31",
      reorderLevel: Number(newReorderLevel) || 20,
    };

    const updatedList = [newBatch, ...stockBatches];
    setStockBatches(updatedList);
    saveStockBatches(updatedList);

    setShowAddStockModal(false);
    setNewDrugName("");
    setNewBatchNumber("");
    showToast(`Added new medicine batch: ${newBatch.drugName}`);
  };

  return (
    <div className="p-4 space-[#111215] space-y-4 text-slate-100 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-16 right-4 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-2xl shadow-xl font-bold text-xs flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header & Sub-Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-3xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              Pharmacy & Catering Hub
              <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                POS & INVENTORY
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Point-of-Sale Billing, Master Pharmaceutical Stock Batches & IPD Dietary Services
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 text-xs font-bold w-full sm:w-auto">
          <button
            onClick={() => setActiveTab("billing")}
            className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeTab === "billing"
                ? "bg-amber-600 text-white shadow-md shadow-amber-600/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>POS Billing</span>
          </button>

          <button
            onClick={() => setActiveTab("stock")}
            className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeTab === "stock"
                ? "bg-amber-600 text-white shadow-md shadow-amber-600/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Stock Inventory</span>
          </button>

          <button
            onClick={() => setActiveTab("catering")}
            className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeTab === "catering"
                ? "bg-amber-600 text-white shadow-md shadow-amber-600/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Utensils className="w-3.5 h-3.5" />
            <span>Catering & Meals</span>
          </button>
        </div>
      </div>

      {/* POS Billing Tab */}
      {activeTab === "billing" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Inventory Selection List */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <Pill className="w-4 h-4 text-amber-400" />
                <span>Select Medicine Stock Items</span>
              </h3>

              <button
                onClick={onOpenScanner}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 font-bold text-xs flex items-center gap-1.5"
              >
                <Scan className="w-3.5 h-3.5" />
                <span>Scan Barcode</span>
              </button>
            </div>

            {/* Prescriptions Import Banner */}
            {prescriptions.length > 0 && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs space-y-2">
                <span className="font-bold text-amber-400 flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5" />
                  Import Doctor Prescriptions directly to Cart:
                </span>
                <div className="flex flex-wrap gap-2">
                  {prescriptions.map((rx) => (
                    <button
                      key={rx.id}
                      onClick={() => handleImportPrescription(rx)}
                      className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-xl font-semibold text-[11px] flex items-center gap-1"
                    >
                      <span>{rx.patientName} (Dr. {rx.doctorName})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Medicine Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
              {stockBatches.map((batch) => {
                const isLowStock = batch.quantityInStock <= batch.reorderLevel;
                return (
                  <div
                    key={batch.id}
                    className="bg-slate-950 border border-slate-800 hover:border-amber-500/50 p-3.5 rounded-2xl transition-all space-y-2 flex flex-col justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center justify-between font-bold text-white text-sm">
                        <span>{batch.drugName}</span>
                        <span className="text-emerald-400 font-mono">
                          ${batch.unitPrice.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-1">
                        <span>Batch: {batch.batchNumber}</span>
                        <span>Exp: {batch.expiryDate}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-900">
                      <span
                        className={`text-[11px] font-bold ${
                          isLowStock ? "text-red-400" : "text-slate-300"
                        }`}
                      >
                        Stock: {batch.quantityInStock} units
                      </span>

                      <button
                        onClick={() => handleAddMedicineToCart(batch)}
                        className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1 shadow-md shadow-amber-600/20"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add to Cart</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* POS Cart Sidebar */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-amber-400" />
                  <span>Current Order Cart</span>
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-full font-bold">
                  {cartItems.length} ITEMS
                </span>
              </div>

              {/* Patient Name Input */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 font-semibold">
                  Patient Name / Bill To:
                </label>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  placeholder="e.g. John Doe"
                />
              </div>

              {/* Cart Items List */}
              <div className="space-y-2 overflow-y-auto max-h-[220px]">
                {cartItems.map((item) => (
                  <div
                    key={item.drugId}
                    className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-white">{item.drugName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Qty: {item.quantity} × ${item.unitPrice}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-emerald-400 font-bold">
                        ${item.total.toFixed(2)}
                      </span>
                      <button
                        onClick={() => handleRemoveCartItem(item.drugId)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals Calculation Card */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1.5 font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal:</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>GST Tax (5%):</span>
                  <span>${taxAmt.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-black text-amber-400 border-t border-slate-800 pt-1">
                  <span>Grand Total:</span>
                  <span>${grandTotal.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={handleCheckoutBill}
                className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-600/20"
              >
                <Printer className="w-4 h-4" />
                <span>Checkout & Print Invoice</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Batches Management Tab */}
      {activeTab === "stock" && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-400" />
                <span>Master Pharmaceutical Stock Batches</span>
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">
                Total Active Inventory Batches: {stockBatches.length}
              </span>
            </div>

            <button
              onClick={() => setShowAddStockModal(true)}
              className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-600/20 transition-all"
            >
              <FilePlus className="w-4 h-4" />
              <span>Add New Medicine Stock</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {stockBatches.map((batch) => {
              const isLowStock = batch.quantityInStock <= batch.reorderLevel;
              return (
                <div
                  key={batch.id}
                  className={`p-4 rounded-2xl border text-xs space-y-2 flex flex-col justify-between ${
                    isLowStock
                      ? "bg-amber-500/10 border-amber-500/40"
                      : "bg-slate-950 border-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">
                      {batch.drugName}
                    </span>
                    {isLowStock && (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Reorder Alert
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 text-slate-400 text-[11px] font-mono">
                    <p>Form: <strong className="text-slate-200">{batch.category || "Tablet"}</strong></p>
                    <p>Batch #: {batch.batchNumber}</p>
                    <p>Expiry: {batch.expiryDate}</p>
                    <div className="flex justify-between pt-2 border-t border-slate-800 text-white font-bold">
                      <span>Stock: {batch.quantityInStock} units</span>
                      <span className="text-emerald-400">${batch.unitPrice.toFixed(2)}/unit</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Catering Tab */}
      {activeTab === "catering" && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-xs font-bold text-slate-200">
            <span className="flex items-center gap-2">
              <Utensils className="w-4 h-4 text-amber-400" />
              <span>IPD Patient Meal & Catering Delivery Tracker</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {diets.length} Active Diets
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {diets.map((diet) => (
              <div
                key={diet.id}
                className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div>
                    <h4 className="font-bold text-white text-sm">
                      {diet.patientName}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-mono">
                      Location: {diet.roomBed}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-bold">
                    {diet.dietType}
                  </span>
                </div>

                <p className="text-slate-400 text-[11px]">
                  Special Notes: <strong className="text-slate-200">{diet.specialInstructions}</strong>
                </p>

                {/* Meal Buttons */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => handleToggleMealStatus(diet.id, "breakfast")}
                    className={`py-1.5 rounded-lg font-bold text-[10px] transition-all ${
                      diet.breakfastStatus === "Delivered"
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    Breakfast: {diet.breakfastStatus}
                  </button>

                  <button
                    onClick={() => handleToggleMealStatus(diet.id, "lunch")}
                    className={`py-1.5 rounded-lg font-bold text-[10px] transition-all ${
                      diet.lunchStatus === "Delivered"
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    Lunch: {diet.lunchStatus}
                  </button>

                  <button
                    onClick={() => handleToggleMealStatus(diet.id, "dinner")}
                    className={`py-1.5 rounded-lg font-bold text-[10px] transition-all ${
                      diet.dinnerStatus === "Delivered"
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    Dinner: {diet.dinnerStatus}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add New Stock Batch Modal */}
      {showAddStockModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full space-y-4 text-xs shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FilePlus className="w-5 h-5 text-amber-400" />
                <h3 className="font-extrabold text-base text-white">Add New Medicine Stock</h3>
              </div>
              <button
                onClick={() => setShowAddStockModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateStockBatch} className="space-y-3">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">Drug Name</label>
                <input
                  type="text"
                  value={newDrugName}
                  onChange={(e) => setNewDrugName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-amber-500"
                  placeholder="e.g. Amoxicillin 500mg Capsule"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block">Batch Number</label>
                  <input
                    type="text"
                    value={newBatchNumber}
                    onChange={(e) => setNewBatchNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                    placeholder="e.g. AMX-2026-X99"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block">Dosage Form / Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as StockBatch["category"])}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Tablet">Tablet</option>
                    <option value="Syrup">Syrup</option>
                    <option value="Injection">Injection</option>
                    <option value="Ointment">Ointment</option>
                    <option value="Equipment">Equipment</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block">Initial Quantity</label>
                  <input
                    type="number"
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                    min={1}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block">Unit Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newUnitPrice}
                    onChange={(e) => setNewUnitPrice(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                    min={0.01}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block">Expiry Date</label>
                  <input
                    type="date"
                    value={newExpiryDate}
                    onChange={(e) => setNewExpiryDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block">Reorder Alert Level</label>
                  <input
                    type="number"
                    value={newReorderLevel}
                    onChange={(e) => setNewReorderLevel(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                    min={1}
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddStockModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-lg shadow-amber-600/20"
                >
                  Save Stock Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
