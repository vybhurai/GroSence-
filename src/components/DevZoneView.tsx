import React, { useState } from "react";
import { Code, Database, Globe, HelpCircle, Terminal, Layers, FileText, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";

export default function DevZoneView() {
  const [activeTab, setActiveTab] = useState<"sql" | "ml" | "api" | "deploy">("sql");

  const sqlSchema = `-- =========================================================================
-- GroSence: Smart Grocery Sales and Stock Prediction System database DDL Schema
-- Dialect: PostgreSQL v15+
-- =========================================================================

-- Enable UUID Extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. User Account Tables
CREATE TABLE "users" (
    "id" VARCHAR(255) PRIMARY KEY DEFAULT 'usr_' || uuid_generate_v4()::text,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) UNIQUE NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Retail Shop Details
CREATE TABLE "shops" (
    "id" VARCHAR(255) PRIMARY KEY DEFAULT 'shp_' || uuid_generate_v4()::text,
    "name" VARCHAR(255) NOT NULL,
    "category" VARCHAR(150) NOT NULL,
    "opening_time" VARCHAR(50) NOT NULL,
    "closing_time" VARCHAR(50) NOT NULL,
    "owner_id" VARCHAR(255) NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. SKU Product Properties
CREATE TABLE "products" (
    "id" VARCHAR(255) PRIMARY KEY DEFAULT 'prod_' || uuid_generate_v4()::text,
    "shop_id" VARCHAR(255) NOT NULL REFERENCES "shops"("id") ON DELETE CASCADE,
    "name" VARCHAR(255) NOT NULL,
    "barcode" VARCHAR(100) UNIQUE NOT NULL,
    "price" DECIMAL(10, 2) NOT NULL,
    "cost" DECIMAL(10, 2) NOT NULL, -- Core for profit analysis
    "category" VARCHAR(100) NOT NULL,
    "image_url" TEXT DEFAULT 'https://images.unsplash...',
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Stock Shelf Inventory
CREATE TABLE "inventory" (
    "id" VARCHAR(255) PRIMARY KEY DEFAULT 'inv_' || uuid_generate_v4()::text,
    "shop_id" VARCHAR(255) NOT NULL REFERENCES "shops"("id") ON DELETE CASCADE,
    "product_id" VARCHAR(255) NOT NULL UNIQUE REFERENCES "products"("id") ON DELETE CASCADE,
    "quantity" INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    "reorder_level" INTEGER NOT NULL DEFAULT 10,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Sales Transactions ledger
CREATE TABLE "sales" (
    "id" VARCHAR(255) PRIMARY KEY DEFAULT 'sale_' || uuid_generate_v4()::text,
    "shop_id" VARCHAR(255) NOT NULL REFERENCES "shops"("id") ON DELETE CASCADE,
    "product_id" VARCHAR(255) NOT NULL REFERENCES "products"("id") ON DELETE RESTRICT,
    "quantity" INTEGER NOT NULL CHECK (quantity > 0),
    "amount" DECIMAL(10, 2) NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Predictions Projections
CREATE TABLE "predictions" (
    "id" VARCHAR(255) PRIMARY KEY DEFAULT 'pred_' || uuid_generate_v4()::text,
    "shop_id" VARCHAR(255) NOT NULL REFERENCES "shops"("id") ON DELETE CASCADE,
    "product_id" VARCHAR(255) NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
    "predicted_1_day" DECIMAL(10, 2) NOT NULL,
    "predicted_7_day" DECIMAL(10, 2) NOT NULL,
    "predicted_14_day" DECIMAL(10, 2) NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);`;

  const pythonML = `#!/usr/bin/env python3
"""
GroSence XGBoost Demand Regressor Pipeline File
Required: pandas, numpy, scikit-learn, xgboost, joblib
"""
import numpy as np
import pandas as pd
from xgboost import XGBRegressor
from sklearn.model_selection import TimeSeriesSplit
import joblib

# 1. Extraction Mock Frame
def extract_transactions():
    dates = pd.date_range(start="2026-01-01", end="2026-05-30", freq="D")
    df = pd.DataFrame({
        "created_at": dates,
        "product_id": "prod_1",
        "quantity": np.random.poisson(lam=12, size=len(dates)),
        "is_holiday": 0, "is_weekend": 0
    })
    return df

# 2. Extract lag period differences & rolling average stats
def engineered_features(df):
    df['created_at'] = pd.to_datetime(df['created_at'])
    df['weekday'] = df['created_at'].dt.weekday
    df['weekend_flag'] = (df['weekday'] >= 5).astype(int)
    
    # Lag definitions
    for lag in [1, 7, 14, 30]:
        df[f'lag_{lag}'] = df['quantity'].shift(lag)
        
    # Moving window averages
    df['rolling_avg_7'] = df['quantity'].shift(1).rolling(window=7).mean()
    df['rolling_avg_30'] = df['quantity'].shift(1).rolling(window=30).mean()
    
    # EMAs
    df['ewm_7'] = df['quantity'].shift(1).ewm(span=7).mean()
    df['ewm_30'] = df['quantity'].shift(1).ewm(span=30).mean()
    
    return df.dropna()

# 3. Fit XGBoost Tree classifier
def train():
    df = engineered_features(extract_transactions())
    features = ["weekend_flag", "lag_1", "lag_7", "lag_14", "lag_30", "rolling_avg_7", "rolling_avg_30", "ewm_7", "ewm_30"]
    X = df[features]
    y = df["quantity"]
    
    model = XGBRegressor(n_estimators=150, learning_rate=0.08, max_depth=5, random_state=42)
    model.fit(X, y)
    
    joblib.dump(model, "models/xgboost_demand_forecaster.pkl")
    print("XGBModel successfully compiled and saved to pickling binary.")

if __name__ == "__main__":
    train()`;

  const apiDocs = [
    { cat: "AUTHENTICATION API", paths: [
      { method: "POST", path: "/api/auth/register", params: "Name, Email, Password", desc: "Signs up new owner registry, returns JWT-style security session token." },
      { method: "POST", path: "/api/auth/login", params: "Email, Password", desc: "Authenticates credentials, returns active profile details." },
      { method: "GET", path: "/api/auth/me", params: "Authorization: Bearer <Token>", desc: "Validates active token header and returns manager identity details." }
    ]},
    { cat: "PRODUCTS & STOCKS API", paths: [
      { method: "POST", path: "/api/products", params: "Name, Barcode, Category, Price, Cost, StartingStock", desc: "Registers item profile and inserts matched inventory tracker record." },
      { method: "GET", path: "/api/products", params: "None", desc: "Fetches complete catalogue indices." },
      { method: "PUT", path: "/api/products/{id}", params: "Name, Barcode, Price, Category", desc: "Alters specific target product properties." },
      { method: "DELETE", path: "/api/products/{id}", params: "None", desc: "Purges product references, item inventories, and transaction lages." },
      { method: "GET", path: "/api/inventory", params: "None", desc: "Lists all current shelf quantities with associated product detail lookups." },
      { method: "GET", path: "/api/inventory/low-stock", params: "None", desc: "Isolates SKU items where store quantities dropped below reorder warnings limits." }
    ]},
    { cat: "SALES & BILLING API", paths: [
      { method: "POST", path: "/api/sales", params: "cartItems: [{product_id, quantity}], payment_method", desc: "Generates point-of-sale receipt, deducts inventory shelf counts, and triggers predictive updates." },
      { method: "GET", path: "/api/sales", params: "None", desc: "Scrolls the entire historic sales logs sorted chronology descending." },
      { method: "DELETE", path: "/api/sales/{id}", params: "None", desc: "Voids invoice transaction, refunding item stocks onto shelf quantities." }
    ]},
    { cat: "FORECASTS & RECOMMENDATIONS API", paths: [
      { method: "POST", path: "/api/predictions/run", params: "None", desc: "Triggers on-demand calculation of rolling lag features and outputs predictions." },
      { method: "GET", path: "/api/predictions/latest", params: "None", desc: "Returns latest 1/7/14 day demand forecast projections." },
      { method: "POST", path: "/api/predictions/gemini-recommendations", params: "None", desc: "Invokes Google Gemini API to analyze predicted out-of-stock risk and generate directives arrays." }
    ]}
  ];

  return (
    <div id="dev_zone_view" className="space-y-6">
      {/* View Header */}
      <div className="flex justify-between items-center pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">AI & Developer Reference Zone</h1>
          <p className="text-xs text-slate-500 mt-1">Review relational Postgres DDL sheets, XGBoost pipeline procedures, and interact with the REST Swagger APIs.</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl text-[10px] text-emerald-700 font-mono tracking-widest uppercase flex items-center gap-1.5 font-bold">
          <Terminal className="h-4 w-4 animate-pulse" /> DEV_ENVIRONMENT ACTIVE
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("sql")}
          className={`px-4 py-2.5 text-xs font-mono font-bold tracking-wider leading-none transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === "sql"
              ? "border-b-2 border-emerald-600 text-emerald-700"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Database className="h-4 w-4" /> POSTGRESQL DDL
        </button>
        <button
          onClick={() => setActiveTab("ml")}
          className={`px-4 py-2.5 text-xs font-mono font-bold tracking-wider leading-none transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === "ml"
              ? "border-b-2 border-emerald-600 text-emerald-700"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Code className="h-4 w-4" /> XGBOOST ML PIPELINE
        </button>
        <button
          onClick={() => setActiveTab("api")}
          className={`px-4 py-2.5 text-xs font-mono font-bold tracking-wider leading-none transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === "api"
              ? "border-b-2 border-emerald-600 text-emerald-700"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Globe className="h-4 w-4" /> Swagger REST APIs
        </button>
        <button
          onClick={() => setActiveTab("deploy")}
          className={`px-4 py-2.5 text-xs font-mono font-bold tracking-wider leading-none transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === "deploy"
              ? "border-b-2 border-emerald-600 text-emerald-700"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Layers className="h-4 w-4" /> DEPLOYMENT MANUAL
        </button>
      </div>

      {/* Contents presentation */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 text-left shadow-xs">
        {activeTab === "sql" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">PostgreSQL relational DDL Document</h3>
                <p className="text-[11px] text-slate-500">PostgreSQL structures matching all parameters of user request database schemas.</p>
              </div>
              <span className="text-[10px] font-mono text-slate-500 bg-slate-50 px-2 py-0.5 border border-slate-200 rounded font-semibold">src/schema.sql</span>
            </div>
            <pre className="p-4 bg-slate-50 text-slate-800 text-xs rounded-xl overflow-x-auto max-h-[400px] font-mono leading-relaxed border border-slate-200 font-medium">
              {sqlSchema}
            </pre>
          </div>
        )}

        {activeTab === "ml" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">XGBoost Regressor pipeline script</h3>
                <p className="text-[11px] text-slate-500">Feature engineering lag variables, rolling means on pandas and model fitting procedures.</p>
              </div>
              <span className="text-[10px] font-mono text-slate-500 bg-slate-50 px-2 py-0.5 border border-slate-200 rounded font-semibold">src/ml_pipeline.py</span>
            </div>
            <pre className="p-4 bg-slate-50 text-slate-850 text-xs rounded-xl overflow-x-auto max-h-[400px] font-mono leading-relaxed border border-slate-200 font-medium">
              {pythonML}
            </pre>
          </div>
        )}

        {activeTab === "api" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Interactive Swagger REST Endpoint dictionaries</h3>
              <p className="text-[11px] text-slate-500">All registered REST endpoints of this full-stack deployment.</p>
            </div>

            <div className="space-y-6">
              {apiDocs.map((cat, idx) => (
                <div key={idx} className="space-y-3">
                  <span className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest pb-1 border-b border-slate-100 font-bold">{cat.cat}</span>
                  <div className="divide-y divide-slate-100 bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                    {cat.paths.map((p, pidx) => (
                      <div key={pidx} className="p-4 flex flex-col md:flex-row md:items-center gap-4 hover:bg-slate-100/50 transition">
                        <div className="md:w-1/4 flex gap-2 items-center">
                          <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold border ${
                            p.method === "POST" 
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                              : p.method === "PUT" 
                                ? "bg-sky-50 text-sky-705 text-sky-700 border-sky-100" 
                                : p.method === "DELETE" 
                                  ? "bg-red-50 text-red-700 border-red-100 font-bold" 
                                  : "bg-purple-50 text-purple-700 border-purple-100"
                          }`}>
                            {p.method}
                          </span>
                          <span className="font-mono text-xs text-slate-800 font-bold">{p.path}</span>
                        </div>
                        <div className="md:w-1/4">
                          <span className="block text-[8px] font-mono text-slate-400 font-bold uppercase">Input Payload Model</span>
                          <span className="font-mono text-[10px] text-slate-700 font-semibold">{p.params}</span>
                        </div>
                        <div className="md:w-2/4">
                          <span className="block text-[8px] font-mono text-slate-400 font-bold uppercase">Operational Behaviour</span>
                          <p className="text-slate-600 text-xs mt-0.5 leading-tight font-medium">{p.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "deploy" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">GroSence Production Staging Manual</h3>
              <p className="text-[11px] text-slate-500">Step-by-step guideline sheet for Docker container links, database initializations, and production hosting.</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl space-y-4 leading-relaxed text-xs border border-slate-205">
              <div className="space-y-1">
                <span className="text-emerald-700 font-bold block">STEP 1: DATABASE PROVISIONING</span>
                <p className="text-slate-600 font-medium">Initialize a PostgreSQL database, then pipe and run the content of <span className="text-slate-800 font-mono font-bold bg-slate-200/50 px-1 py-0.5 rounded">/src/schema.sql</span>. This provisions the User, Shop, Product, Inventory, Sale, Event and Demand prediction records.</p>
              </div>

              <div className="space-y-1">
                <span className="text-emerald-700 font-bold block">STEP 2: MODEL INITIAL FITTING</span>
                <p className="text-slate-600 font-medium">Execute the Python pipeline <span className="text-slate-800 font-mono font-bold bg-slate-200/50 px-1 py-0.5 rounded">/src/ml_pipeline.py</span> within the backend folder venv to generate features and train the XGBoost parameters. This stores <span className="text-slate-800 font-mono font-bold bg-slate-200/50 px-1 py-0.5 rounded">models/xgboost_demand_forecaster.pkl</span> weight files for active use.</p>
              </div>

              <div className="space-y-1">
                <span className="text-emerald-700 font-bold block">STEP 3: ENDPOINT LISTENERS & WEB CHEKOUTS</span>
                <p className="text-slate-600 font-medium">Boot your FastAPI web gateway using <span className="text-slate-800 font-mono font-bold bg-slate-200/50 px-1 py-0.5 rounded">uvicorn server:app --port 8000</span>. Spin up the React Expo client. Set reverse proxy routing configurations so POS checkout registers interlink safely with FastAPI.</p>
              </div>

              <div className="flex gap-2 items-center bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-emerald-800 text-[11px] font-bold">
                <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
                <span>All source DDL scripts, pipeline codes, and guides are written into the workspace. You can export the workspace as a zip file to launch them locally!</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
