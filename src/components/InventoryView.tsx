import React, { useState, useEffect } from "react";
import { Search, Plus, Filter, Edit3, Trash2, ArrowUpDown, ChevronDown, CheckCircle2, AlertTriangle, X, RefreshCw, Barcode } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { safeFetch } from "../utils/api";

interface InventoryViewProps {
  onNavigateTo: (view: string) => void;
}

export default function InventoryView({ onNavigateTo }: InventoryViewProps) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL_CATEGORIES");

  // Edit / Add modal states
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Product form data state
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    barcode: "",
    price: "",
    cost: "",
    category: "Dairy",
    image_url: "",
    quantity: "25",
    reorder_level: "10"
  });

  const categories = ["Dairy", "Bakery", "Produce", "Pantry", "Beverages"];

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const data = await safeFetch("/api/inventory");
      setItems(data);
    } catch (e) {
      console.error("Failed to load inventory:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleOpenAddModal = () => {
    setIsEditing(false);
    setErrorMsg("");
    setFormData({
      id: "",
      name: "",
      barcode: Math.floor(1000000000000 + Math.random() * 9000000000000).toString(),
      price: "",
      cost: "",
      category: "Dairy",
      image_url: "",
      quantity: "25",
      reorder_level: "10"
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (item: any) => {
    setIsEditing(true);
    setErrorMsg("");
    setFormData({
      id: item.product.id,
      name: item.product.name,
      barcode: item.product.barcode,
      price: item.product.price.toString(),
      cost: item.product.cost.toString(),
      category: item.product.category,
      image_url: item.product.image_url,
      quantity: item.quantity.toString(),
      reorder_level: item.reorder_level.toString()
    });
    setShowModal(true);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("Are you sure you want to completely remove this product and purge its sales history?")) return;

    try {
      await safeFetch(`/api/products/${productId}`, {
        method: "DELETE",
      });
      fetchInventory();
    } catch (err: any) {
      console.error("Purging product failed:", err);
      alert(err.message || "Failed to remove product");
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!formData.name || !formData.price || !formData.category) {
      setErrorMsg("Name, base Price, and Category are required");
      return;
    }

    const payload = {
      ...formData,
      price: parseFloat(formData.price),
      cost: formData.cost ? parseFloat(formData.cost) : parseFloat(formData.price) * 0.6,
      quantity: parseInt(formData.quantity) || 0,
      reorder_level: parseInt(formData.reorder_level) || 0,
    };

    try {
      if (isEditing) {
        // Edit product info, then edit its inventory
        await safeFetch(`/api/products/${formData.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        // Adjust count in inventory
        const invItem = items.find(i => i.product_id === formData.id);
        if (invItem) {
          await safeFetch(`/api/inventory/${invItem.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              quantity: payload.quantity,
              reorder_level: payload.reorder_level
            })
          });
        }
      } else {
        // Add completely new product
        await safeFetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      setShowModal(false);
      fetchInventory();
    } catch (err: any) {
      console.error("Error committing product:", err);
      setErrorMsg(err.message || "Error recording product properties");
    }
  };

  const handleAdjustStock = async (productId: string, adjustment: number) => {
    try {
      await safeFetch("/api/inventory/adjust-by-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId, adjustment })
      });
      // Update local item quantity directly to maintain fast interface
      setItems(prevItems =>
        prevItems.map(item =>
          item.product_id === productId
            ? { ...item, quantity: Math.max(0, item.quantity + adjustment) }
            : item
        )
      );
    } catch (e: any) {
      console.error("Stock adjust failed:", e);
      alert(e.message || "Failed to adjust stock count");
    }
  };

  // Filter computations
  const filteredItems = items.filter(item => {
    if (!item.product) return false;
    const matchesSearch =
      item.product.name.toLowerCase().includes(search.toLowerCase()) ||
      item.product.barcode.includes(search);
    const matchesCategory =
      selectedCategory === "ALL_CATEGORIES" || item.product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div id="inventory_view" className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Product & Shelf Inventory</h1>
          <p className="text-xs text-slate-500 mt-1">Check stock levels, edit properties, trigger replenishment records and configure barcode indexing.</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs font-mono rounded-xl cursor-pointer shadow-md transition"
        >
          <Plus className="h-4.5 w-4.5" /> ADD NEW STORE ITEM
        </button>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-xs">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search products by name or barcode scanner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-emerald-600 rounded-xl text-xs text-slate-800 focus:outline-none transition font-sans placeholder-slate-400"
          />
        </div>

        <div className="flex w-full md:w-auto gap-4 items-center justify-end">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
            <Filter className="h-4 w-4 text-slate-400" />
            FILTER BY CATEGORY
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 focus:border-emerald-600 focus:outline-none cursor-pointer font-mono"
          >
            <option value="ALL_CATEGORIES">ALL CATEGORIES</option>
            {categories.map((c, idx) => (
              <option key={idx} value={c}>{c.toUpperCase()}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid inventory list */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <RefreshCw className="h-8 w-8 text-emerald-650 animate-spin" />
          <span className="text-xs font-mono text-slate-500 font-bold uppercase">LOCATING SHELF RECORDS...</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-slate-50 border border-slate-200 text-center py-24 rounded-2xl shadow-inner">
          <Barcode className="h-12 w-12 text-slate-350 mx-auto mb-4" />
          <p className="text-slate-700 font-bold text-sm">No products found matching filters</p>
          <p className="text-slate-400 text-xs mt-1">Refine your queries or register a new store product.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-mono text-[10px] uppercase font-bold">
                  <th className="p-4">SKU Product</th>
                  <th className="p-4">Barcode</th>
                  <th className="p-4">Category</th>
                  <th className="p-4 text-right">Unit Price</th>
                  <th className="p-4 text-right">Estimated Cost</th>
                  <th className="p-4 text-center">Remaining Stock</th>
                  <th className="p-4 text-center">Alert Limits</th>
                  <th className="p-4 text-center">Operational Status</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredItems.map((item, idx) => {
                  const isLow = item.quantity <= item.reorder_level;
                  const isOut = item.quantity === 0;

                  return (
                    <tr key={idx} className="hover:bg-slate-50/50 transition">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.product?.image_url || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=60"}
                            alt={item.product?.name}
                            referrerPolicy="no-referrer"
                            className="h-9 w-9 rounded-lg object-cover border border-slate-200"
                          />
                          <div>
                            <h4 className="font-bold text-slate-900 text-xs">{item.product?.name}</h4>
                            <span className="text-[9px] text-slate-400 font-mono uppercase">{item.product?.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-[10px] text-slate-500 tracking-wider">
                        <div className="flex items-center gap-1">
                          <Barcode className="h-3.5 w-3.5 text-slate-400" />
                          {item.product?.barcode}
                        </div>
                      </td>
                      <td className="p-4 font-mono text-[10px] text-slate-500">
                        <span className="px-2 py-0.5 bg-slate-55 bg-slate-100 border border-slate-200 rounded text-slate-650 font-semibold text-[10px]">
                          {item.product?.category?.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-slate-900">
                        ${item.product?.price.toFixed(2)}
                      </td>
                      <td className="p-4 text-right font-mono text-slate-500">
                        ${item.product?.cost?.toFixed(2) || "N/A"}
                      </td>
                      <td className="p-4 text-center font-mono">
                        <div className="flex items-center justify-center gap-3">
                          <button
                            onClick={() => handleAdjustStock(item.product.id, -1)}
                            className="h-5 w-5 bg-white hover:bg-slate-100 border border-slate-250 text-slate-600 hover:text-slate-900 rounded flex items-center justify-center font-bold text-xs"
                          >
                            -
                          </button>
                          <span className={`w-8 font-extrabold text-center ${isOut ? "text-red-500 font-extrabold" : isLow ? "text-amber-500 font-extrabold" : "text-slate-800"}`}>
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleAdjustStock(item.product.id, 1)}
                            className="h-5 w-5 bg-white hover:bg-slate-100 border border-slate-250 text-slate-600 hover:text-slate-900 rounded flex items-center justify-center font-bold text-xs"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="p-4 text-center font-mono text-[10px] text-slate-500">
                        Min {item.reorder_level} Units
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center">
                          {isOut ? (
                            <span className="px-2 py-0.5 bg-red-50 border border-red-200 text-red-700 rounded-full font-mono text-[9px] flex items-center gap-1 font-bold">
                              <span className="h-1 w-1 rounded-full bg-red-500" />
                              OUT OF STOCK
                            </span>
                          ) : isLow ? (
                            <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-full font-mono text-[9px] flex items-center gap-1 font-bold">
                              <span className="h-1 w-1 rounded-full bg-amber-500" />
                              LOW WARNING
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full font-mono text-[9px] flex items-center gap-1 font-bold">
                              <span className="h-1 w-1 rounded-full bg-emerald-500" />
                              IN STOCK
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1 px-2 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded transition border border-slate-200 bg-white cursor-pointer"
                            title="Edit properties"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(item.product.id)}
                            className="p-1 px-2 hover:bg-red-55 hover:bg-red-50 text-red-600 border border-red-100 rounded transition cursor-pointer"
                            title="Purge product details"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit product dialog Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 min-h-screen bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-250 rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-slate-800"
            >
              <button
                onClick={() => setShowModal(false)}
                className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              <h3 className="text-sm font-bold text-slate-900 mb-2 uppercase tracking-wide">
                {isEditing ? "Edit Product Properties" : "Register New Product"}
              </h3>
              <p className="text-[11px] text-slate-500 mb-6">
                Define the pricing, SKU barcode identifiers, cost structures, and replenish triggers.
              </p>

              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl mb-4 text-left font-semibold">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleFormSubmit} className="space-y-4 text-left">
                <div>
                  <label className="block text-[10px] font-mono text-slate-500 mb-1 font-bold">PRODUCT NAME</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Fresh Whole Milk 1L"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-850 focus:outline-none focus:border-emerald-600 font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-mono text-slate-500 mb-1 font-bold">BARCODE ID (SKU)</label>
                    <input
                      type="text"
                      required
                      value={formData.barcode}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                      placeholder="8901058002262"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-600 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-slate-500 mb-1 font-bold">CATEGORY</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-650 focus:outline-none font-bold"
                    >
                      {categories.map((c, idx) => (
                        <option key={idx} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-mono text-slate-500 mb-1 font-bold">RETAIL PRICE ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="3.49"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-850 focus:outline-none focus:border-emerald-600 font-mono font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-slate-500 mb-1 font-bold">WHOLESALE COST ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.cost}
                      onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                      placeholder="2.10"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-850 focus:outline-none focus:border-emerald-600 font-mono font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-mono text-slate-500 mb-1 font-bold">START STOCK COUNT</label>
                    <input
                      type="number"
                      required
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      placeholder="25"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-850 focus:outline-none focus:border-emerald-600 font-mono font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-slate-500 mb-1 font-bold">REORDER WARNING LIMIT</label>
                    <input
                      type="number"
                      required
                      value={formData.reorder_level}
                      onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })}
                      placeholder="10"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-850 focus:outline-none focus:border-emerald-600 font-mono font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-500 mb-1 font-bold">IMAGE URL</label>
                  <input
                    type="text"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs font-mono tracking-wide rounded-xl mt-4 cursor-pointer transition uppercase"
                >
                  {isEditing ? "SAVE PRODUCT REVISIONS" : "COMMIT REGISTER"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
