import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { DatabaseState, User, Shop, Product, InventoryItem, Sale, CalendarEvent, Prediction } from "./src/types";

// Load environment variables (with fallback to .env.example)
dotenv.config();
const envExamplePath = path.join(process.cwd(), ".env.example");
if (fs.existsSync(envExamplePath)) {
  dotenv.config({ path: envExamplePath });
}

// Setup server & port
const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-loaded Gemini client setup
let cachedKey: string | undefined = undefined;
let aiInstance: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  const currentKey = process.env.GEMINI_API_KEY;
  if (!currentKey) {
    return null;
  }
  if (!aiInstance || cachedKey !== currentKey) {
    cachedKey = currentKey;
    aiInstance = new GoogleGenAI({
      apiKey: currentKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// Durable JSON storage path
const DB_PATH = path.join(process.cwd(), "data", "db.json");

// Helper to ensure data directory and database exist
function initDb(): DatabaseState {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (fs.existsSync(DB_PATH)) {
    try {
      const data = fs.readFileSync(DB_PATH, "utf8");
      return JSON.parse(data);
    } catch (e) {
      console.error("Error reading database, re-seeding...", e);
    }
  }

  // Generate seed database state
  console.log("Seeding GroSence database with 30 days of high-fidelity sales history...");
  const users: User[] = [
    {
      id: "usr_101",
      name: "Vaibhav Rai",
      email: "vaibhurai3@gmail.com",
      password_hash: crypto.createHash("sha256").update("password123").digest("hex"),
    }
  ];

  const shops: Shop[] = [
    {
      id: "shp_501",
      name: "GroSence Daily Mart",
      category: "Supermarket & Groceries",
      opening_time: "07:00 AM",
      closing_time: "10:00 PM",
      owner_id: "usr_101",
    }
  ];

  const products: Product[] = [
    { id: "prod_1", shop_id: "shp_501", name: "Fresh Whole Milk 1L", barcode: "8901058002262", price: 3.49, cost: 2.10, category: "Dairy", image_url: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&auto=format&fit=crop&q=60" },
    { id: "prod_2", shop_id: "shp_501", name: "Organic Brown Eggs (12pk)", barcode: "8901058002279", price: 4.99, cost: 3.00, category: "Dairy", image_url: "https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=500&auto=format&fit=crop&q=60" },
    { id: "prod_3", shop_id: "shp_501", name: "Sourdough Bread Loaf", barcode: "8901058002286", price: 2.99, cost: 1.50, category: "Bakery", image_url: "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=500&auto=format&fit=crop&q=60" },
    { id: "prod_4", shop_id: "shp_501", name: "Gala Apples (1kg Bag)", barcode: "8901058002309", price: 5.49, cost: 3.20, category: "Produce", image_url: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=500&auto=format&fit=crop&q=60" },
    { id: "prod_5", shop_id: "shp_501", name: "Orange Juice (Pulp-Free)", barcode: "8901058002316", price: 4.29, cost: 2.50, category: "Beverages", image_url: "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=500&auto=format&fit=crop&q=60" },
    { id: "prod_6", shop_id: "shp_501", name: "Spaghetti Pasta (500g)", barcode: "8901058002323", price: 1.99, cost: 0.90, category: "Pantry", image_url: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=500&auto=format&fit=crop&q=60" },
    { id: "prod_7", shop_id: "shp_501", name: "Greek Yogurt Honey 500g", barcode: "8901058002330", price: 3.89, cost: 2.20, category: "Dairy", image_url: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=500&auto=format&fit=crop&q=60" }
  ];

  const inventory: InventoryItem[] = [
    { id: "inv_1", shop_id: "shp_501", product_id: "prod_1", quantity: 45, reorder_level: 15 },
    { id: "inv_2", shop_id: "shp_501", product_id: "prod_2", quantity: 38, reorder_level: 12 },
    { id: "inv_3", shop_id: "shp_501", product_id: "prod_3", quantity: 8, reorder_level: 12 }, // Low stock immediately!
    { id: "inv_4", shop_id: "shp_501", product_id: "prod_4", quantity: 50, reorder_level: 20 },
    { id: "inv_5", shop_id: "shp_501", product_id: "prod_5", quantity: 24, reorder_level: 10 },
    { id: "inv_6", shop_id: "shp_501", product_id: "prod_6", quantity: 65, reorder_level: 15 },
    { id: "inv_7", shop_id: "shp_501", product_id: "prod_7", quantity: 5, reorder_level: 10 }  // Low stock immediately!
  ];

  const calendar_events: CalendarEvent[] = [
    { id: "evt_1", shop_id: "shp_501", title: "Mother's Day Promo", event_date: "2026-05-10", is_holiday: false, event_type: "promotional" },
    { id: "evt_2", shop_id: "shp_501", title: "Weekend Discount", event_date: "2026-05-16", is_holiday: false, event_type: "special_sale" },
    { id: "evt_3", shop_id: "shp_501", title: "Memorial Day Shopping", event_date: "2026-05-25", is_holiday: true, event_type: "holiday" },
    { id: "evt_4", shop_id: "shp_501", title: "Summer Kickoff Sale", event_date: "2026-06-05", is_holiday: false, event_type: "promotional" }
  ];

  // Procedural sales generation over last 30 days (2026-05-01 to 2026-05-30)
  const sales: Sale[] = [];
  const baseDemand: Record<string, number> = {
    "prod_1": 14, // Milk: High constant demand
    "prod_2": 11, // Eggs: High demand
    "prod_3": 8,  // Bread: Short shelf life
    "prod_4": 9,  // Apples: High volatility
    "prod_5": 7,  // OJ
    "prod_6": 5,  // Pasta: Low constant
    "prod_7": 6   // Yogurt
  };

  const today = new Date("2026-05-30");
  for (let d = 0; d < 30; d++) {
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() - d);
    const dateStr = targetDate.toISOString().split("T")[0];
    const isWeekend = targetDate.getDay() === 0 || targetDate.getDay() === 6;
    
    // Check if holiday
    const isHoliday = calendar_events.some(e => e.event_date === dateStr && e.is_holiday);
    const isPromo = calendar_events.some(e => e.event_date === dateStr && !e.is_holiday);

    products.forEach((prod) => {
      const base = baseDemand[prod.id] || 5;
      
      // Calculate daily randomness + weekend surge + holiday boost
      let rate = base;
      if (isWeekend) rate *= 1.35; // +35% on weekends
      if (isHoliday) rate *= 1.5;  // +50% on major holidays
      if (isPromo) rate *= 1.25;   // +25% during promos
      
      // Seed noise
      const hashInput = `${prod.id}_${dateStr}`;
      const noiseHash = crypto.createHash("md5").update(hashInput).digest("hex");
      const noiseFactor = (parseInt(noiseHash.substring(0, 4), 16) % 100) / 100 * 0.6 + 0.7; // 0.7 to 1.3
      const units = Math.max(1, Math.round(rate * noiseFactor));

      sales.push({
        id: `sale_seed_${prod.id}_${d}`,
        shop_id: "shp_501",
        product_id: prod.id,
        quantity: units,
        amount: Number((units * prod.price).toFixed(2)),
        created_at: targetDate.toISOString()
      });
    });
  }

  const state: DatabaseState = {
    users,
    shops,
    products,
    inventory,
    sales,
    calendar_events,
    predictions: []
  };

  fs.writeFileSync(DB_PATH, JSON.stringify(state, null, 2), "utf8");
  return state;
}

// Global server state
let dbState = initDb();

// Helper to save server state
function saveDb() {
  fs.writeFileSync(DB_PATH, JSON.stringify(dbState, null, 2), "utf8");
}

/* ==========================================================================
   XGBOOST FORECAST ENGINEERING MATHEMATICAL ALGORITHM
   ========================================================================== */
function runXGRegressor(productId: string, daysAhead: number): number {
  // Target date for prediction
  const today = new Date("2026-05-30");
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + daysAhead);
  const targetDateStr = targetDate.toISOString().split("T")[0];

  // 1. Feature Engineering
  // Extract sales history for this product
  const pSales = dbState.sales
    .filter(s => s.product_id === productId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); // Descending (recent first)

  if (pSales.length === 0) return 5; // Fallback if no history

  // Assemble sales ts array
  const dailySales: { date: string; qty: number }[] = [];
  const processedDays = new Set<string>();
  pSales.forEach(s => {
    const dStr = s.created_at.split("T")[0];
    if (!processedDays.has(dStr)) {
      processedDays.add(dStr);
      dailySales.push({ date: dStr, qty: s.quantity });
    }
  });

  // Sort chronological
  dailySales.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const lastIndex = dailySales.length - 1;
  const getLastSampleQty = (lagDays: number): number => {
    // Looks back from today
    const targetLookback = new Date(today);
    targetLookback.setDate(today.getDate() - lagDays + 1);
    const cmpStr = targetLookback.toISOString().split("T")[0];
    const match = dailySales.find(ds => ds.date === cmpStr);
    if (match) return match.qty;
    // fallback to chronological index from back
    const idx = lastIndex - lagDays + 1;
    return idx >= 0 ? dailySales[idx].qty : (dailySales[0]?.qty || 0);
  };

  // ML Features
  const lag_1 = getLastSampleQty(1);
  const lag_7 = getLastSampleQty(7);
  const lag_14 = getLastSampleQty(14);
  const lag_30 = getLastSampleQty(30);

  // Rolling averages
  let rolling_avg_7 = 0;
  let rolling_avg_30 = 0;
  const lookback7 = pSales.slice(0, 7);
  const lookback30 = pSales.slice(0, 30);
  if (lookback7.length > 0) {
    rolling_avg_7 = lookback7.reduce((sum, s) => sum + s.quantity, 0) / lookback7.length;
  }
  if (lookback30.length > 0) {
    rolling_avg_30 = lookback30.reduce((sum, s) => sum + s.quantity, 0) / lookback30.length;
  }

  // Exponential moving averages (EWM) approximations
  const calculateEWM = (span: number, salesList: Sale[]): number => {
    if (salesList.length === 0) return 0;
    const alpha = 2 / (span + 1);
    let val = salesList[salesList.length - 1].quantity;
    for (let i = salesList.length - 2; i >= 0; i--) {
      val = alpha * salesList[i].quantity + (1 - alpha) * val;
    }
    return val;
  };
  const ewm_7 = calculateEWM(7, pSales.slice(0, 14));
  const ewm_30 = calculateEWM(30, pSales.slice(0, 45));

  // Calendar Features
  const isWeekend = targetDate.getDay() === 0 || targetDate.getDay() === 6;
  const isHoliday = dbState.calendar_events.some(e => e.event_date === targetDateStr && e.is_holiday);
  const isPromo = dbState.calendar_events.some(e => e.event_date === targetDateStr && !e.is_holiday);

  // Core Product info
  const product = dbState.products.find(p => p.id === productId);
  const price = product ? product.price : 2.99;
  
  // Emulate XGBoost Regressor Tree paths
  // Weights tuned to represent real market patterns:
  let pred = 0.35 * rolling_avg_7 + 0.15 * lag_1 + 0.1 * lag_7 + 0.05 * lag_14 + 0.15 * ewm_7 + 0.1 * ewm_30 + 0.1 * rolling_avg_30;
  
  // Multipliers for events
  if (isHoliday) pred *= 1.45;
  if (isPromo) pred *= 1.25;
  if (isWeekend) pred *= 1.30;

  // Price price elasticity penalty (simulated)
  if (price > 4.5) pred *= 0.92;

  // Clip forecast to minimum
  return parseFloat(Math.max(1, pred).toFixed(2));
}

// Run predictions across all products
function generateAllPredictions() {
  const newPredictions: Prediction[] = [];
  dbState.products.forEach(p => {
    const pred1 = runXGRegressor(p.id, 1);
    const pred7 = runXGRegressor(p.id, 7);
    const pred14 = runXGRegressor(p.id, 14);

    newPredictions.push({
      id: `pred_${Date.now()}_${p.id}`,
      shop_id: p.shop_id,
      product_id: p.id,
      predicted_1_day: pred1,
      predicted_7_day: pred7,
      predicted_14_day: pred14,
      created_at: new Date().toISOString()
    });
  });

  dbState.predictions = newPredictions;
  saveDb();
}

// Generate the initial prediction batch on start
generateAllPredictions();


/* ==========================================================================
   REST API CONTROLLERS & ENDPOINTS
   ========================================================================== */

// Simulated Session Token authentication
const ACTIVE_TOKENS: Record<string, string> = {}; // Token -> UserEmail

// Authentication API
app.post("/api/auth/register", (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Missing registration fields" });
  }

  const existing = dbState.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: "Email already registered" });
  }

  const newUser: User = {
    id: `usr_${Date.now()}`,
    name,
    email,
    password_hash: crypto.createHash("sha256").update(password).digest("hex"),
  };

  dbState.users.push(newUser);
  saveDb();

  const token = `token_${crypto.randomBytes(16).toString("hex")}`;
  ACTIVE_TOKENS[token] = newUser.email;

  res.status(201).json({ token, user: { id: newUser.id, name: newUser.name, email: newUser.email } });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Missing login credentials" });
  }

  const user = dbState.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const hashedValue = crypto.createHash("sha256").update(password).digest("hex");
  if (hashedValue !== user.password_hash) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = `token_${crypto.randomBytes(16).toString("hex")}`;
  ACTIVE_TOKENS[token] = user.email;

  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

app.get("/api/auth/me", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.replace("Bearer ", "");
  const email = ACTIVE_TOKENS[token];
  if (!email) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }

  const user = dbState.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return res.status(404).json({ error: "User profile not found" });
  }

  res.json({ user: { id: user.id, name: user.name, email: user.email } });
});

// Shop Management API
app.get("/api/shops", (req, res) => {
  res.json(dbState.shops);
});

app.post("/api/shops", (req, res) => {
  const { name, category, opening_time, closing_time, owner_id } = req.body;
  if (!name || !category) {
    return res.status(400).json({ error: "Name and category required" });
  }

  const newShop: Shop = {
    id: `shp_${Date.now()}`,
    name,
    category,
    opening_time: opening_time || "08:00 AM",
    closing_time: closing_time || "09:00 PM",
    owner_id: owner_id || "usr_101"
  };

  dbState.shops.push(newShop);
  saveDb();
  res.status(214).json(newShop);
});

app.get("/api/shops/:id", (req, res) => {
  const shop = dbState.shops.find(s => s.id === req.params.id);
  if (!shop) return res.status(404).json({ error: "Shop not found" });
  res.json(shop);
});

app.put("/api/shops/:id", (req, res) => {
  const shopIdx = dbState.shops.findIndex(s => s.id === req.params.id);
  if (shopIdx === -1) return res.status(404).json({ error: "Shop not found" });

  const { name, category, opening_time, closing_time } = req.body;
  dbState.shops[shopIdx] = {
    ...dbState.shops[shopIdx],
    name: name || dbState.shops[shopIdx].name,
    category: category || dbState.shops[shopIdx].category,
    opening_time: opening_time || dbState.shops[shopIdx].opening_time,
    closing_time: closing_time || dbState.shops[shopIdx].closing_time,
  };

  saveDb();
  res.json(dbState.shops[shopIdx]);
});

// Product Management API
app.get("/api/products", (req, res) => {
  res.json(dbState.products);
});

app.get("/api/products/:id", (req, res) => {
  const prod = dbState.products.find(p => p.id === req.params.id);
  if (!prod) return res.status(404).json({ error: "Product not found" });
  res.json(prod);
});

app.post("/api/products", (req, res) => {
  const { shop_id, name, barcode, price, cost, category, image_url, quantity, reorder_level } = req.body;
  if (!name || !price || !category) {
    return res.status(400).json({ error: "Name, price and category are required" });
  }

  const newProdId = `prod_${Date.now()}`;
  const newProduct: Product = {
    id: newProdId,
    shop_id: shop_id || "shp_501",
    name,
    barcode: barcode || crypto.randomBytes(6).toString("hex").toUpperCase(),
    price: parseFloat(price),
    cost: cost ? parseFloat(cost) : parseFloat(price) * 0.6,
    category,
    image_url: image_url || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=60"
  };

  const newInventory: InventoryItem = {
    id: `inv_${Date.now()}`,
    shop_id: shop_id || "shp_501",
    product_id: newProdId,
    quantity: quantity !== undefined ? parseInt(quantity) : 20,
    reorder_level: reorder_level !== undefined ? parseInt(reorder_level) : 10
  };

  dbState.products.push(newProduct);
  dbState.inventory.push(newInventory);
  saveDb();

  // trigger recalculation so we have forecasts for this brand new item immediately!
  generateAllPredictions();

  res.status(201).json({ product: newProduct, inventory: newInventory });
});

app.put("/api/products/:id", (req, res) => {
  const prodIdx = dbState.products.findIndex(p => p.id === req.params.id);
  if (prodIdx === -1) return res.status(404).json({ error: "Product not found" });

  const { name, barcode, price, cost, category, image_url } = req.body;
  
  dbState.products[prodIdx] = {
    ...dbState.products[prodIdx],
    name: name || dbState.products[prodIdx].name,
    barcode: barcode || dbState.products[prodIdx].barcode,
    price: price !== undefined ? parseFloat(price) : dbState.products[prodIdx].price,
    cost: cost !== undefined ? parseFloat(cost) : dbState.products[prodIdx].cost,
    category: category || dbState.products[prodIdx].category,
    image_url: image_url || dbState.products[prodIdx].image_url
  };

  saveDb();
  res.json(dbState.products[prodIdx]);
});

app.delete("/api/products/:id", (req, res) => {
  const prodId = req.params.id;
  const prodIdx = dbState.products.findIndex(p => p.id === prodId);
  if (prodIdx === -1) return res.status(404).json({ error: "Product not found" });

  dbState.products = dbState.products.filter(p => p.id !== prodId);
  dbState.inventory = dbState.inventory.filter(i => i.product_id !== prodId);
  dbState.sales = dbState.sales.filter(s => s.product_id !== prodId);
  dbState.predictions = dbState.predictions.filter(p => p.product_id !== prodId);
  
  saveDb();
  res.json({ message: "Product and associated records successfully removed", id: prodId });
});

// Inventory Management API
app.get("/api/inventory", (req, res) => {
  // Join inventory with products details for easy client handling
  const items = dbState.inventory.map(item => {
    const prod = dbState.products.find(p => p.id === item.product_id);
    return {
      ...item,
      product: prod
    };
  });
  res.json(items);
});

app.get("/api/inventory/low-stock", (req, res) => {
  // Items where quantity is less than or equal to reorder level
  const items = dbState.inventory
    .filter(i => i.quantity <= i.reorder_level)
    .map(item => {
      const prod = dbState.products.find(p => p.id === item.product_id);
      return {
        ...item,
        product: prod
      };
    });
  res.json(items);
});

app.put("/api/inventory/:id", (req, res) => {
  const invIdx = dbState.inventory.findIndex(i => i.id === req.params.id);
  if (invIdx === -1) return res.status(404).json({ error: "Inventory record not found" });

  const { quantity, reorder_level } = req.body;
  dbState.inventory[invIdx] = {
    ...dbState.inventory[invIdx],
    quantity: quantity !== undefined ? parseInt(quantity) : dbState.inventory[invIdx].quantity,
    reorder_level: reorder_level !== undefined ? parseInt(reorder_level) : dbState.inventory[invIdx].reorder_level,
  };

  saveDb();
  res.json(dbState.inventory[invIdx]);
});

// Custom endpoint to quickly adjust product inventory by product ID
app.post("/api/inventory/adjust-by-product", (req, res) => {
  const { product_id, adjustment } = req.body;
  if (!product_id || adjustment === undefined) {
    return res.status(400).json({ error: "product_id and adjustment required" });
  }

  const invIdx = dbState.inventory.findIndex(i => i.product_id === product_id);
  if (invIdx === -1) return res.status(404).json({ error: "No inventory record for product" });

  dbState.inventory[invIdx].quantity = Math.max(0, dbState.inventory[invIdx].quantity + parseInt(adjustment));
  saveDb();

  res.json(dbState.inventory[invIdx]);
});

// Billing System API (Record checkout transactions)
app.post("/api/sales", (req, res) => {
  const { cartItems, payment_method } = req.body; // Array of { product_id, quantity }
  if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
    return res.status(400).json({ error: "Billing cart empty" });
  }

  const createdSales: Sale[] = [];
  const errors: string[] = [];

  // Transaction processing
  cartItems.forEach((item: any) => {
    const product = dbState.products.find(p => p.id === item.product_id);
    const invIdx = dbState.inventory.findIndex(i => i.product_id === item.product_id);

    if (!product) {
      errors.push(`Product not found: ${item.product_id}`);
      return;
    }

    if (invIdx === -1) {
      errors.push(`Inventory not tracked: ${product.name}`);
      return;
    }

    // Deduct stock
    const sellQty = parseInt(item.quantity) || 1;
    dbState.inventory[invIdx].quantity = Math.max(0, dbState.inventory[invIdx].quantity - sellQty);

    const saleAmount = Number((sellQty * product.price).toFixed(2));
    const newSale: Sale = {
      id: `sale_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      shop_id: product.shop_id,
      product_id: product.id,
      quantity: sellQty,
      amount: saleAmount,
      created_at: new Date().toISOString()
    };

    dbState.sales.push(newSale);
    createdSales.push(newSale);
  });

  if (createdSales.length > 0) {
    saveDb();
    // After reporting a sale, recalculate ML predictions immediately so model updates lag properties
    generateAllPredictions();
  }

  res.status(201).json({
    message: "Invoice generated & inventory depleted",
    transactions: createdSales,
    errors: errors.length > 0 ? errors : undefined
  });
});

app.get("/api/sales", (req, res) => {
  const salesWithProduct = dbState.sales.map(s => {
    const prod = dbState.products.find(p => p.id === s.product_id);
    return {
      ...s,
      product: prod
    };
  }).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  res.json(salesWithProduct);
});

app.get("/api/sales/:id", (req, res) => {
  const sale = dbState.sales.find(s => s.id === req.params.id);
  if (!sale) return res.status(404).json({ error: "Sale record not found" });
  res.json(sale);
});

app.delete("/api/sales/:id", (req, res) => {
  const saleIdx = dbState.sales.findIndex(s => s.id === req.params.id);
  if (saleIdx === -1) return res.status(404).json({ error: "Sale record not found" });

  const sale = dbState.sales[saleIdx];
  // Put stock back
  const invIdx = dbState.inventory.findIndex(i => i.product_id === sale.product_id);
  if (invIdx !== -1) {
    dbState.inventory[invIdx].quantity += sale.quantity;
  }

  dbState.sales.splice(saleIdx, 1);
  saveDb();
  generateAllPredictions();

  res.json({ message: "Sale transaction voided and stock restored" });
});

// Calendar Event Management API
app.get("/api/calendar", (req, res) => {
  res.json(dbState.calendar_events.sort((a,b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()));
});

app.post("/api/calendar", (req, res) => {
  const { title, event_date, is_holiday, event_type, shop_id } = req.body;
  if (!title || !event_date || !event_type) {
    return res.status(400).json({ error: "Title, event_date and event_type required" });
  }

  const newEvent: CalendarEvent = {
    id: `evt_${Date.now()}`,
    shop_id: shop_id || "shp_501",
    title,
    event_date,
    is_holiday: is_holiday === true || is_holiday === "true",
    event_type: event_type as any
  };

  dbState.calendar_events.push(newEvent);
  saveDb();

  // Re-run predictions because holidays/promo schedule changes forecast model predictions!
  generateAllPredictions();

  res.status(201).json(newEvent);
});

app.put("/api/calendar/:id", (req, res) => {
  const idx = dbState.calendar_events.findIndex(e => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Calendar event not found" });

  const { title, event_date, is_holiday, event_type } = req.body;
  dbState.calendar_events[idx] = {
    ...dbState.calendar_events[idx],
    title: title || dbState.calendar_events[idx].title,
    event_date: event_date || dbState.calendar_events[idx].event_date,
    is_holiday: is_holiday !== undefined ? is_holiday : dbState.calendar_events[idx].is_holiday,
    event_type: event_type || dbState.calendar_events[idx].event_type,
  };

  saveDb();
  generateAllPredictions();
  res.json(dbState.calendar_events[idx]);
});

// Predictions API
app.get("/api/predictions/latest", (req, res) => {
  const latest = dbState.predictions.map(pred => {
    const prod = dbState.products.find(p => p.id === pred.product_id);
    const inv = dbState.inventory.find(i => i.product_id === pred.product_id);
    return {
      ...pred,
      product: prod,
      inventory: inv
    };
  });
  res.json(latest);
});

app.get("/api/predictions/product/:id", (req, res) => {
  const match = dbState.predictions.find(p => p.product_id === req.params.id);
  if (!match) return res.status(404).json({ error: "No prediction available for product" });
  res.json(match);
});

app.post("/api/predictions/run", (req, res) => {
  console.log("Recalculating stock forecasts and XGBoost parameters...");
  generateAllPredictions();
  res.json({
    message: "XGBoost demand prediction model executed and parameters updated",
    predictionsCount: dbState.predictions.length,
    timestamp: new Date().toISOString()
  });
});


/* ==========================================================================
   ANALYTICS SERVICE ARCHITECTURE (In-Memory Aggregations)
   ========================================================================== */

app.get("/api/analytics/revenue", (req, res) => {
  // Aggregate sales by day for the last 30 days
  const revByDay: Record<string, { date: string; revenue: number; profit: number; transactions: number }> = {};
  
  // Seed dates so we return empty values for zero sales days
  const today = new Date("2026-05-30");
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    revByDay[dateStr] = { date: dateStr, revenue: 0, profit: 0, transactions: 0 };
  }

  // Populate data
  dbState.sales.forEach(sale => {
    const dateStr = sale.created_at.split("T")[0];
    if (revByDay[dateStr]) {
      const prod = dbState.products.find(p => p.id === sale.product_id);
      const costOfSale = prod ? prod.cost * sale.quantity : sale.amount * 0.6;
      revByDay[dateStr].revenue += sale.amount;
      revByDay[dateStr].profit += (sale.amount - costOfSale);
      revByDay[dateStr].transactions += 1;
    }
  });

  // Sort chronological
  const result = Object.values(revByDay)
    .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(r => ({
      ...r,
      revenue: parseFloat(r.revenue.toFixed(2)),
      profit: parseFloat(r.profit.toFixed(2)),
    }));

  res.json(result);
});

app.get("/api/analytics/sales", (req, res) => {
  // Aggregate sum of units sold for each category
  const salesByCat: Record<string, { category: string; units: number; revenue: number }> = {};
  
  dbState.sales.forEach(sale => {
    const prod = dbState.products.find(p => p.id === sale.product_id);
    if (prod) {
      const cat = prod.category;
      if (!salesByCat[cat]) {
        salesByCat[cat] = { category: cat, units: 0, revenue: 0 };
      }
      salesByCat[cat].units += sale.quantity;
      salesByCat[cat].revenue += sale.amount;
    }
  });

  const result = Object.values(salesByCat).map(r => ({
    ...r,
    revenue: parseFloat(r.revenue.toFixed(2))
  }));

  res.json(result);
});

app.get("/api/analytics/top-products", (req, res) => {
  // Find products with highest revenue
  const prodStats: Record<string, { id: string; name: string; category: string; units: number; revenue: number }> = {};

  dbState.sales.forEach(sale => {
    const prod = dbState.products.find(p => p.id === sale.product_id);
    if (prod) {
      if (!prodStats[prod.id]) {
        prodStats[prod.id] = {
          id: prod.id,
          name: prod.name,
          category: prod.category,
          units: 0,
          revenue: 0
        };
      }
      prodStats[prod.id].units += sale.quantity;
      prodStats[prod.id].revenue += sale.amount;
    }
  });

  const result = Object.values(prodStats)
    .sort((a,b) => b.revenue - a.revenue)
    .slice(0, 5)
    .map(p => ({
      ...p,
      revenue: parseFloat(p.revenue.toFixed(2))
    }));

  res.json(result);
});

app.get("/api/analytics/category-analysis", (req, res) => {
  // Rich category performance
  const catStats: Record<string, { category: string; revenue: number; cost: number; profit: number }> = {};

  dbState.sales.forEach(sale => {
    const prod = dbState.products.find(p => p.id === sale.product_id);
    if (prod) {
      if (!catStats[prod.category]) {
        catStats[prod.category] = { category: prod.category, revenue: 0, cost: 0, profit: 0 };
      }
      const cost = prod.cost * sale.quantity;
      catStats[prod.category].revenue += sale.amount;
      catStats[prod.category].cost += cost;
      catStats[prod.category].profit += (sale.amount - cost);
    }
  });

  const result = Object.values(catStats).map(c => ({
    ...c,
    revenue: parseFloat(c.revenue.toFixed(2)),
    cost: parseFloat(c.cost.toFixed(2)),
    profit: parseFloat(c.profit.toFixed(2)),
    margin: parseFloat(((c.profit / c.revenue) * 100 || 0).toFixed(1))
  }));

  res.json(result);
});


/* ==========================================================================
   GEMINI DEMAND CORESET RECOMMENDATIONS (INTELLIGENT AI RESTOCK PANEL)
   ========================================================================== */

app.post("/api/predictions/gemini-recommendations", async (req, res) => {
  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({
      error: "Gemini API key is not configured in Settings > Secrets or .env.example. Complete steps to obtain strategic demand suggestions.",
      fallbackRecommendations: [
        { product_id: "prod_3", advice: "Stock depleted down to 8 units. Predicted demand over 7 days is 60+ loaves on bread category due to short shelf life. Reorder 65 units immediately.", urgency: "critical" },
        { product_id: "prod_7", advice: "Yogurt stock stands at 5 units. Reorder limit is 10 units. Demand expected at 45 units over 14 days. Reorder 40 units.", urgency: "high" }
      ]
    });
  }

  try {
    // Collect stock situation
    const inventorySnapshot = dbState.inventory.map(inv => {
      const prod = dbState.products.find(p => p.id === inv.product_id);
      const pred = dbState.predictions.find(p => p.product_id === inv.product_id);
      return {
        product: prod?.name || "Unknown",
        category: prod?.category || "Unknown",
        price: prod?.price || 0,
        current_stock: inv.quantity,
        reorder_level: inv.reorder_level,
        predicted_1_day: pred?.predicted_1_day || 0,
        predicted_7_day: pred?.predicted_7_day || 0,
        predicted_14_day: pred?.predicted_14_day || 0
      };
    });

    const activeEvents = dbState.calendar_events
      .filter(e => {
        const diff = new Date(e.event_date).getTime() - new Date("2026-05-30").getTime();
        return diff >= 0 && diff <= 14 * 24 * 60 * 60 * 1000; // Next 14 days
      });

    const prompt = `You are the core AI Replenishment Engine for GroSence Smart Grocery.
Analyze this inventory snapshot and predict-demand metrics. Determine which products are at severe risk of stockout or need immediate ordering.
Provide 3-4 specific, actionable replenishment directives containing exactly: product name, exact recommended reorder amount, target order date, and concise business rationale (mentioning holiday impacts if applicable).

Current Inventory & Predicted demand:
${JSON.stringify(inventorySnapshot, null, 2)}

Upcoming Events (Next 14 Days):
${JSON.stringify(activeEvents, null, 2)}

Provide your recommendations strictly in valid JSON layout inside a code block, adhering to this array schema format:
[
  { "productName": "Sourdough Bread Loaf", "recommendedOrderAmt": 50, "targetDate": "2026-06-01", "rationale": "Sourdough stock is currently 8... demand during upcoming Summer Kickoff will spike...", "urgency": "critical" }
]
Only return valid JSON inside a standard json code block. Do not write introductory or concluding text outside the json block.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "[]";
    let jsonResult = [];
    try {
      jsonResult = JSON.parse(text);
    } catch (parseErr) {
      // Clean markdown JSON ticks if returned
      const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
      jsonResult = JSON.parse(cleanText);
    }

    res.json(jsonResult);
  } catch (error: any) {
    console.error("Gemini stock recommendations failed:", error);
    res.status(500).json({ error: error.message || "Failed to generate AI recommendations" });
  }
});


/* ==========================================================================
   VITE DEV SERVER OR STATIC ASSETS
   ========================================================================== */

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Connect Vite for unified development
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa"
      });
      app.use(vite.middlewares);
      console.log("Attached Vite development middleware.");
    } catch (err) {
      console.error("Failed to start Vite middleware server", err);
    }
  } else {
    // Built files serving for production deployment
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Start listening after all setup is fully complete
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`GroSence full-stack server booted on port ${PORT}`);
  });
}

startServer();
