import React, { useState, useEffect } from "react";
import { Search, ShoppingCart, Trash2, CreditCard, DollarSign, QrCode, Sparkles, CheckCircle, RefreshCw, Barcode, Printer, ArrowRight, UserPlus, Receipt, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function BillingView() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL_CATEGORIES");

  // Cart state: Array of { product, quantity }
  const [cart, setCart] = useState<any[]>([]);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi" | "card">("cash");
  const [cashReceived, setCashReceived] = useState("");

  // Checkout process states
  const [checkoutResult, setCheckoutResult] = useState<any | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = ["Dairy", "Bakery", "Produce", "Pantry", "Beverages"];

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/products");
      if (res.ok) {
        setProducts(await res.json());
      }
    } catch (e) {
      console.error("Billing panel product load failed:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Add item to cart
  const addToCart = (product: any, qty = 1) => {
    setCart(prev => {
      const existingIdx = prev.findIndex(item => item.product.id === product.id);
      if (existingIdx !== -1) {
        const updated = [...prev];
        updated[existingIdx].quantity += qty;
        return updated;
      } else {
        return [...prev, { product, quantity: qty }];
      }
    });
  };

  const updateCartQty = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev =>
      prev.map(item => (item.product.id === productId ? { ...item, quantity } : item))
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const clearCart = () => setCart([]);

  // Barcode search handler
  const handleBarcodeSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!barcodeInput.trim()) return;

    const matched = products.find(p => p.barcode === barcodeInput.trim());
    if (matched) {
      addToCart(matched, 1);
      setBarcodeInput("");
    } else {
      alert(`No store item mapped to barcode SKU: ${barcodeInput}`);
    }
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const tax = subtotal * 0.0825; // 8.25% State Sales Tax
  const grandTotal = subtotal + tax;

  const cashReceivedNum = parseFloat(cashReceived) || 0;
  const changeDue = Math.max(0, cashReceivedNum - grandTotal);

  // Submit checkout
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);

    const payload = {
      cartItems: cart.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity
      })),
      payment_method: paymentMethod
    };

    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const result = await res.json();
        setCheckoutResult({
          invoiceId: result.transactions?.[0]?.id || `INV-${Date.now()}`,
          date: new Date().toLocaleString(),
          paymentMethod,
          subtotal,
          tax,
          total: grandTotal,
          items: [...cart],
          cashReceived: paymentMethod === "cash" ? cashReceivedNum : grandTotal,
          changeDue: paymentMethod === "cash" ? changeDue : 0
        });
        clearCart();
        setCashReceived("");
        setShowReceipt(true);
      } else {
        const data = await res.json();
        alert(data.error || "POS sales processing failed");
      }
    } catch (err) {
      console.error("Sales transaction failure:", err);
      alert("Error logging the sale sequence.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter computations
  const filteredProducts = products.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode.includes(search);
    const matchesCategory =
      selectedCategory === "ALL_CATEGORIES" || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div id="billing_view" className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Point-of-Sale Billing</h1>
          <p className="text-xs text-slate-500 mt-1">Simulate real registers with barcode keypads, dynamic invoices, and instant depletion logic.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-slate-800">
        {/* Left Side: Product Selector Catalog (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Barcode Quick Scanners Simulator Panel */}
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
            <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5 font-mono">
              <Barcode className="h-4.5 w-4.5 text-emerald-600 animate-pulse" /> BARCODE SCAN EMULATOR
            </h3>
            <form onSubmit={handleBarcodeSubmit} className="flex gap-3">
              <input
                type="text"
                placeholder="Simulate barcode swipe (Type/paste SKU e.g. 8901058002262)"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-600 font-mono tracking-widest"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-emerald-700 font-bold font-mono text-xs rounded-xl transition cursor-pointer"
              >
                INPUT SCAN
              </button>
            </form>
            {/* SKU Help Sheet */}
            <div className="mt-3 flex flex-wrap gap-2 items-center text-[10px] font-mono text-slate-500">
              <span className="font-semibold">SCAN ASSIST:</span>
              {products.slice(0, 4).map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setBarcodeInput(p.barcode);
                    setTimeout(() => handleBarcodeSubmit(), 100);
                  }}
                  className="px-2 py-0.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-[9px] text-slate-600"
                >
                  {p.name.split(" ")[0]} ({p.barcode})
                </button>
              ))}
            </div>
          </div>

          {/* Catalog Selection List */}
          <div className="bg-white border border-slate-200 p-4 rounded-2xl space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Quick lookup..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600 text-slate-800 placeholder-slate-400"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 cursor-pointer font-mono text-right"
              >
                <option value="ALL_CATEGORIES">ALL CATEGORIES</option>
                {categories.map((c, idx) => (
                  <option key={idx} value={c}>{c.toUpperCase()}</option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20 text-xs text-slate-400 gap-2 font-mono">
                <RefreshCw className="h-4 w-4 animate-spin text-emerald-600" /> LOADING PRODUCTS...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-16 text-xs text-slate-400">
                No store items matches criteria.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filteredProducts.map((p, idx) => (
                  <div
                    key={idx}
                    onClick={() => addToCart(p, 1)}
                    className="bg-slate-50/50 border border-slate-200 hover:border-slate-350 hover:bg-white p-3 rounded-xl cursor-pointer transition flex flex-col justify-between group h-[130px]"
                  >
                    <div className="flex justify-between items-start gap-1">
                      <h4 className="text-xs font-semibold text-slate-800 line-clamp-2 max-h-[34px] group-hover:text-emerald-750 transition">{p.name}</h4>
                    </div>
                    <div className="mt-3">
                      <span className="text-[9px] text-slate-400 block font-mono">CODE: {p.barcode}</span>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-xs font-semibold text-slate-900 font-mono">${p.price.toFixed(2)}</span>
                        <div className="p-1 px-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded text-[9px] font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                          + ADD
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Billing Cart & Checkout Engine (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between min-h-[500px] shadow-xs">
          <div>
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <h3 className="text-xs font-mono font-bold tracking-widest text-slate-400 uppercase">ACTIVE BASKET</h3>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-[10px] text-red-600 hover:text-red-700 hover:underline flex items-center gap-1 font-mono cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" /> CLEAR
                </button>
              )}
            </div>

            {/* Cart list elements */}
            {cart.length === 0 ? (
              <div className="py-24 flex flex-col items-center justify-center text-slate-400">
                <ShoppingCart className="h-10 w-10 text-slate-200 mb-2" />
                <p className="text-xs font-medium">Checkout Basket is empty</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Click catalog items or simulate scanners to buy.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto pr-1">
                {cart.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center py-2.5">
                    <div className="max-w-[160px]">
                      <h4 className="text-xs font-bold text-slate-800 truncate">{item.product.name}</h4>
                      <span className="text-[9px] text-slate-400 font-mono">${item.product.price.toFixed(2)} /unit</span>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Qty increment modifiers */}
                      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-0.5">
                        <button
                          onClick={() => updateCartQty(item.product.id, item.quantity - 1)}
                          className="h-5 w-5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded flex items-center justify-center font-bold text-xs"
                        >
                          -
                        </button>
                        <span className="w-6 text-center font-mono text-xs font-extrabold text-slate-800">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateCartQty(item.product.id, item.quantity + 1)}
                          className="h-5 w-5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded flex items-center justify-center font-bold text-xs"
                        >
                          +
                        </button>
                      </div>

                      <span className="w-16 text-right font-mono text-xs font-bold text-slate-800">
                        ${(item.product.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pricing & checkout parameters */}
          {cart.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-200 space-y-4">
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex justify-between text-slate-500">
                  <span>SUBTOTAL</span>
                  <span className="text-slate-800 font-bold">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>STATE TAX GST (8.25%)</span>
                  <span className="text-slate-800 font-bold">${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-700 text-sm font-extrabold pt-1.5 border-t border-slate-200">
                  <span>TOTAL BILL</span>
                  <span className="text-emerald-700 text-base font-black">${grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment mechanism select tab */}
              <div className="space-y-2">
                <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">Payment Gateway Selection</span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setPaymentMethod("cash")}
                    className={`py-2 text-center text-xs font-mono font-bold rounded-xl border transition ${
                      paymentMethod === "cash"
                        ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                        : "bg-slate-55 border-slate-200 text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    CASH
                  </button>
                  <button
                    onClick={() => setPaymentMethod("upi")}
                    className={`py-2 text-center text-xs font-mono font-bold rounded-xl border transition ${
                      paymentMethod === "upi"
                        ? "bg-cyan-50 border-cyan-500 text-cyan-700"
                        : "bg-slate-55 border-slate-200 text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    UPI PIN
                  </button>
                  <button
                    onClick={() => setPaymentMethod("card")}
                    className={`py-2 text-center text-xs font-mono font-bold rounded-xl border transition ${
                      paymentMethod === "card"
                        ? "bg-purple-50 border-purple-550 text-purple-700"
                        : "bg-slate-55 border-slate-200 text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    CARD TERMINAL
                  </button>
                </div>
              </div>

              {/* Extra payment options context */}
              {paymentMethod === "cash" && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-left">
                  <label className="block text-[10px] font-mono text-slate-400 uppercase font-bold">Input Cash tender</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="e.g. 50"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-slate-250 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-emerald-600 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setCashReceived(Math.ceil(grandTotal).toString())}
                      className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-mono text-slate-500"
                    >
                      EXACT
                    </button>
                  </div>
                  {cashReceivedNum > 0 && (
                    <div className="flex justify-between items-center text-xs font-mono pt-1 text-slate-650">
                      <span>CHANGE DUE:</span>
                      <span className="text-yellow-650 font-bold">${changeDue.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}

              {paymentMethod === "upi" && (
                <div className="p-3 bg-cyan-50/50 border border-cyan-100 rounded-xl flex items-center gap-3">
                  <div className="bg-white p-1 rounded-lg border border-cyan-200">
                    {/* Simulated QR Code */}
                    <QrCode className="h-10 w-10 text-slate-900" />
                  </div>
                  <div className="text-left font-sans">
                    <span className="text-[10px] font-mono text-cyan-700 block font-bold">DYNAMIC UPI PIN REQUEST</span>
                    <p className="text-[10px] text-cyan-600 mt-0.5 leading-tight">Simulating UPI payment request. Ask customer to scan dynamic QR display and click checkout.</p>
                  </div>
                </div>
              )}

              {paymentMethod === "card" && (
                <div className="p-3 bg-purple-50/50 border border-purple-100 rounded-xl flex items-center gap-3 text-left">
                  <CreditCard className="h-8 w-8 text-purple-600" />
                  <div>
                    <span className="text-[10px] font-mono text-purple-700 block font-bold">SECURE SWIPE/DIP INITIATION</span>
                    <p className="text-[10px] text-purple-600 mt-0.5 leading-tight">Interactive sandbox linked to chip reader. Click Checkout below to swipe and capture payment token.</p>
                  </div>
                </div>
              )}

              <button
                onClick={handleCheckout}
                disabled={isSubmitting || (paymentMethod === "cash" && cashReceivedNum < grandTotal)}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold text-xs font-mono tracking-wider rounded-xl cursor-pointer shadow-lg transition flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  "RECORDING INVOICES..."
                ) : (
                  <>
                    CONFIRM CHECKOUT & TENDER <ArrowRight className="h-4.5 w-4.5" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Physical POS Thermal Receipt Modal */}
      <AnimatePresence>
        {showReceipt && checkoutResult && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white text-slate-950 w-full max-w-sm rounded-xl p-6 shadow-2xl relative overflow-hidden font-mono text-xs text-left border border-slate-200"
            >
              <button
                onClick={() => setShowReceipt(false)}
                className="absolute right-4 top-4 text-slate-400 hover:text-slate-950 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Receipt Header */}
              <div className="text-center space-y-1 pb-4 border-b border-dashed border-slate-300">
                <Receipt className="h-8 w-8 text-slate-700 mx-auto mb-1.5" />
                <h3 className="text-sm font-bold tracking-tight uppercase">GroSence Daily Mart</h3>
                <p className="text-[10px] text-slate-500">101 REPLACEMENT ROAD, CONTAINER 5</p>
                <p className="text-[10px] text-slate-500">TELEPHONE: +1-555-GROSENCE</p>
                <div className="pt-2 text-[10px] text-slate-600 flex justify-between font-bold">
                  <span>ID: {checkoutResult.invoiceId.substring(0, 14)}</span>
                  <span>{checkoutResult.date}</span>
                </div>
              </div>

              {/* Items Line */}
              <div className="py-4 border-b border-dashed border-slate-300 space-y-2">
                <div className="flex justify-between font-bold text-[10px] text-slate-500 uppercase">
                  <span>Item description</span>
                  <div className="flex gap-8">
                    <span>QTY</span>
                    <span>Total</span>
                  </div>
                </div>
                {checkoutResult.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-start text-[11px]">
                    <span className="truncate max-w-[170px] uppercase font-bold text-slate-800">{item.product.name}</span>
                    <div className="flex gap-10">
                      <span>{item.quantity}</span>
                      <span className="font-bold">${(item.product.price * item.quantity).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Math summaries */}
              <div className="py-4 space-y-1.5 border-b border-dashed border-slate-300 text-[11px]">
                <div className="flex justify-between font-medium">
                  <span>SUBTOTAL</span>
                  <span>${checkoutResult.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>TAX (8.25%)</span>
                  <span>${checkoutResult.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-black pt-1.5 border-t border-dashed border-slate-300">
                  <span>TOTAL AMOUNT PAID</span>
                  <span>${checkoutResult.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Tender lines */}
              <div className="py-4 border-b border-dashed border-slate-300 text-[11px] space-y-1.5">
                <div className="flex justify-between uppercase">
                  <span>Payment Style</span>
                  <span className="font-bold">{checkoutResult.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tender Capture</span>
                  <span>${checkoutResult.cashReceived.toFixed(2)}</span>
                </div>
                {checkoutResult.paymentMethod === "cash" && (
                  <div className="flex justify-between font-bold text-black text-xs">
                     <span>CHANGE DUE BACK</span>
                     <span>${checkoutResult.changeDue.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Footer barcode print */}
              <div className="text-center pt-6 space-y-2">
                <div className="font-mono tracking-[0.25em] text-slate-600 select-none text-[10px] uppercase font-bold">
                  *GROSENCE_Checkout_POS*
                </div>
                <p className="text-[10px] text-slate-500 leading-normal">
                  Thank you for shopping at GroSence! Inventory records and ML parameters have been instantly recalculated.
                </p>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 mx-auto bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-4 py-2 rounded-lg font-mono text-[10px] uppercase transition cursor-pointer mt-4"
                >
                  <Printer className="h-4 w-4" /> PRINT COPIES
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
