import React, { useState } from "react";
import {
  CreditCard,
  QrCode,
  Smartphone,
  DollarSign,
  CheckCircle2,
  X,
  Printer,
  ShieldCheck,
  RefreshCw,
  Lock,
} from "lucide-react";

interface PaymentGatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount?: number;
  patientName?: string;
  billDescription?: string;
  onPaymentComplete?: (txnId: string) => void;
  onOpenPrint?: () => void;
}

export const PaymentGatewayModal: React.FC<PaymentGatewayModalProps> = ({
  isOpen,
  onClose,
  amount = 124.5,
  patientName = "Eleanor Vance",
  billDescription = "Pharmacy Medication Bill #PHARM-2026-981",
  onPaymentComplete,
  onOpenPrint,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<"card" | "upi" | "cash">("card");
  const [cardNumber, setCardNumber] = useState<string>("4532 •••• •••• 8892");
  const [cardExpiry, setCardExpiry] = useState<string>("12/28");
  const [cardCvc, setCardCvc] = useState<string>("389");
  const [upiId, setUpiId] = useState<string>("patient@okaxis");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [txnSuccess, setTxnSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleProcessPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    setTimeout(() => {
      const generatedTxnId = `TXN-2026-${Math.floor(100000 + Math.random() * 900000)}`;
      setIsProcessing(false);
      setTxnSuccess(generatedTxnId);
      if (onPaymentComplete) {
        onPaymentComplete(generatedTxnId);
      }
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111216] border border-[#262835] rounded-3xl p-6 max-w-md w-full space-y-4 text-xs shadow-2xl relative text-slate-100 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#222432]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">Online Digital Payment</h3>
              <p className="text-[11px] text-slate-400">256-Bit Encrypted Healthcare Checkout</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-[#1c1f2b] hover:bg-[#272a3a] text-slate-400 hover:text-white border border-[#2d3042]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {txnSuccess ? (
          /* Payment Success Confirmation View */
          <div className="py-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20 animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h4 className="text-lg font-black text-white">Payment Successful!</h4>
              <p className="text-xs text-slate-400">{billDescription}</p>
            </div>

            <div className="bg-[#161822] p-4 rounded-2xl border border-[#262838] text-xs space-y-2 text-left font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Transaction Ref:</span>
                <span className="text-emerald-400 font-bold">{txnSuccess}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Billed To:</span>
                <span className="text-white">{patientName}</span>
              </div>
              <div className="flex justify-between text-slate-400 border-t border-[#252736] pt-1.5">
                <span>Amount Paid:</span>
                <span className="text-amber-400 font-extrabold text-sm">${amount.toFixed(2)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => {
                  if (onOpenPrint) onOpenPrint();
                  onClose();
                }}
                className="py-3 rounded-xl bg-[#1f2230] hover:bg-[#292c3d] text-white font-bold text-xs flex items-center justify-center gap-2 border border-[#2d3044]"
              >
                <Printer className="w-4 h-4" />
                <span>Print Receipt</span>
              </button>

              <button
                onClick={onClose}
                className="py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Payment Entry Form */
          <form onSubmit={handleProcessPayment} className="space-y-4">
            {/* Bill Summary Box */}
            <div className="bg-[#161822] p-3.5 rounded-2xl border border-[#262838] flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-mono block uppercase">Total Amount Due</span>
                <span className="text-xs font-bold text-white block">{billDescription}</span>
              </div>
              <span className="text-xl font-black text-amber-400 font-mono">
                ${amount.toFixed(2)}
              </span>
            </div>

            {/* Payment Method Selector */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod("card")}
                className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                  paymentMethod === "card"
                    ? "bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-600/20"
                    : "bg-[#14161f] border-[#252736] text-slate-400 hover:bg-[#1a1d29]"
                }`}
              >
                <CreditCard className="w-5 h-5" />
                <span>Credit/Debit</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("upi")}
                className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                  paymentMethod === "upi"
                    ? "bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-600/20"
                    : "bg-[#14161f] border-[#252736] text-slate-400 hover:bg-[#1a1d29]"
                }`}
              >
                <QrCode className="w-5 h-5" />
                <span>UPI / QR</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("cash")}
                className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                  paymentMethod === "cash"
                    ? "bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-600/20"
                    : "bg-[#14161f] border-[#252736] text-slate-400 hover:bg-[#1a1d29]"
                }`}
              >
                <DollarSign className="w-5 h-5" />
                <span>Cash Payment</span>
              </button>
            </div>

            {/* Payment Form Fields */}
            {paymentMethod === "card" && (
              <div className="space-y-3 bg-[#151722] p-4 rounded-2xl border border-[#252736]">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block text-[11px]">Card Number</label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full bg-[#101118] border border-[#27293a] rounded-xl px-3 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                    placeholder="4532 0000 0000 0000"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold block text-[11px]">Expiry Date</label>
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      className="w-full bg-[#101118] border border-[#27293a] rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                      placeholder="MM/YY"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold block text-[11px]">CVC / CVV</label>
                    <input
                      type="password"
                      maxLength={4}
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value)}
                      className="w-full bg-[#101118] border border-[#27293a] rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                      placeholder="123"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === "upi" && (
              <div className="space-y-3 bg-[#151722] p-4 rounded-2xl border border-[#252736] text-center">
                <div className="w-32 h-32 bg-white p-2 rounded-2xl mx-auto shadow-lg flex items-center justify-center">
                  <QrCode className="w-28 h-28 text-black" />
                </div>
                <p className="text-[11px] text-slate-400">Scan QR with GPay, PhonePe, Paytm, or enter VPA:</p>

                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full bg-[#101118] border border-[#27293a] rounded-xl px-3 py-2 text-center text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                  placeholder="username@upi"
                  required
                />
              </div>
            )}

            {paymentMethod === "cash" && (
              <div className="bg-[#151722] p-4 rounded-2xl border border-[#252736] text-center space-y-2">
                <DollarSign className="w-8 h-8 text-amber-400 mx-auto" />
                <p className="text-xs text-slate-200 font-semibold">Over-the-Counter Cash Billing</p>
                <p className="text-[11px] text-slate-400">Collect exact cash amount at register to mark invoice as paid.</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isProcessing}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all mt-2"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing Secure Payment...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Pay ${amount.toFixed(2)} Securely</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
