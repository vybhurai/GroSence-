#!/usr/bin/env python3
"""
GroSence - Smart Grocery Demand Forecasting Pipeline File
Model: XGBoost Regressor
Language: Python 3.11
Required Libraries: pandas, numpy, scikit-learn, xgboost, joblib, psycopg2-binary (for DB linkage)
"""

import os
import sys
import numpy as np
import pandas as pd
from xgboost import XGBRegressor
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import mean_squared_error, mean_absolute_error
import joblib

# =========================================================================
# 1. DATABASE CONNECTIVITY & DATA EXTRACTION
# =========================================================================
def extract_transactions_schema():
    """
    Extracts raw transaction lines and calendar holidays from PostgreSQL database.
    Note: Mock representation shown below, replaced by raw SQLAlchemy/psycopg2 queries.
    """
    print("Connecting to PostgreSQL database...")
    # mock raw ledger data representing 180 days of daily milk sales
    dates = pd.date_range(start="2026-01-01", end="2026-05-30", freq="D")
    data = []
    
    # Seasonality multipliers
    for d in dates:
        base_qty = 15
        is_weekend = 1 if d.weekday() >= 5 else 0
        is_holiday = 1 if d.strftime("%m-%d") in ["05-25", "01-01", "07-04"] else 0
        is_promo = 1 if d.strftime("%m-%d") in ["05-10", "11-27"] else 0
        
        rate = base_qty
        if is_weekend:
            rate *= 1.35
        if is_holiday:
            rate *= 1.5
        if is_promo:
            rate *= 1.25
            
        noise = np.random.uniform(0.75, 1.25)
        qty = max(1, int(round(rate * noise)))
        
        data.append({
            "created_at": d,
            "product_id": "prod_1",
            "shop_id": "shp_501",
            "category": "Dairy",
            "price": 3.49,
            "quantity": qty,
            "is_holiday": is_holiday,
            "is_promo": is_promo
        })
        
    df = pd.DataFrame(data)
    print(f"Extracted {len(df)} financial transaction records successfully.")
    return df

# =========================================================================
# 2. FEATURE ENGINEERING ENGINE
# =========================================================================
def perform_feature_engineering(df):
    """
    Calculates essential XGBoost features based on lag states, rolling aggregations,
    and cyclical time variables.
    """
    print("Starting Feature Engineering...")
    # Clean and index datetime
    df['created_at'] = pd.to_datetime(df['created_at'])
    df = df.sort_values(by=['product_id', 'created_at']).reset_index(drop=True)
    
    # 2.1 Categorical feature mappings
    df['category'] = df['category'].astype('category')
    df['category_code'] = df['category'].cat.codes
    
    # 2.2 Date cyclical/seasonality extraction
    df['year'] = df['created_at'].dt.year
    df['month'] = df['created_at'].dt.month
    df['day'] = df['created_at'].dt.day
    df['weekday'] = df['created_at'].dt.weekday
    df['weekend_flag'] = df['created_at'].dt.weekday.apply(lambda x: 1 if x >= 5 else 0)
    
    # 2.3 Lag variables (shift parameters back)
    for lag in [1, 7, 14, 30]:
        df[f'lag_{lag}'] = df.groupby('product_id')['quantity'].shift(lag)
        
    # 2.4 Rolling statistics
    df['rolling_avg_7'] = df.groupby('product_id')['quantity'].transform(lambda x: x.shift(1).rolling(window=7, min_periods=1).mean())
    df['rolling_avg_30'] = df.groupby('product_id')['quantity'].transform(lambda x: x.shift(1).rolling(window=30, min_periods=1).mean())
    
    # 2.5 Exponentially weighted moving averages (EWM)
    df['ewm_7'] = df.groupby('product_id')['quantity'].transform(lambda x: x.shift(1).ewm(span=7, min_periods=1).mean())
    df['ewm_30'] = df.groupby('product_id')['quantity'].transform(lambda x: x.shift(1).ewm(span=30, min_periods=1).mean())
    
    # Clean out initial dates carrying NaN values from lag shifts
    df = df.dropna().reset_index(drop=True)
    print(f"Feature set computed: {df.shape[1]} metrics; {len(df)} rows left after lag cleanups.")
    return df

# =========================================================================
# 3. XGBOOST MODEL TRAINING PIPELINE
# =========================================================================
def train_xgboost_pipeline(df):
    """
    Splits features, trains an XGBoost Regressor with optimal parameters,
    and validates on temporal hold-out tests.
    """
    features = [
        "category_code", "price", "is_holiday", "year", "month", "day", 
        "weekday", "weekend_flag", "lag_1", "lag_7", "lag_14", "lag_30", 
        "rolling_avg_7", "rolling_avg_30", "ewm_7", "ewm_30"
    ]
    target = "quantity"
    
    X = df[features]
    y = df[target]
    
    print(f"Features mapped: {features}")
    
    # Temporal splitting (TimeSeriesSplit) to prevent lookahead leakages
    tscv = TimeSeriesSplit(n_splits=5)
    rmses, maes = [], []
    
    for fold, (train_idx, test_idx) in enumerate(tscv.split(X)):
        X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
        y_train, y_test = y.iloc[train_idx], y.iloc[test_idx]
        
        # Instantiate XGBoost model with optimized retail configurations
        model = XGBRegressor(
            n_estimators=150,
            learning_rate=0.07,
            max_depth=5,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42
        )
        
        model.fit(X_train, y_train)
        preds = model.predict(X_test)
        
        rmse = np.sqrt(mean_squared_error(y_test, preds))
        mae = mean_absolute_error(y_test, preds)
        
        rmses.append(rmse)
        maes.append(mae)
        print(f"Fold {fold+1} Root Mean Square Error (RMSE): {rmse:.4f} | Absolute Error (MAE): {mae:.4f}")
        
    print(f"\nFinal XGBoost Model Validation Summary:")
    print(f"Mean RMSE: {np.mean(rmses):.4f} +/- {np.std(rmses):.4f}")
    print(f"Mean MAE: {np.mean(maes):.4f} +/- {np.std(maes):.4f}")
    
    # Fit final overall model
    final_model = XGBRegressor(
        n_estimators=200,
        learning_rate=0.06,
        max_depth=6,
        subsample=0.85,
        colsample_bytree=0.85,
        random_state=42
    )
    final_model.fit(X, y)
    
    # Save the serialized classifier
    os.makedirs("models", exist_ok=True)
    joblib.dump(final_model, "models/xgboost_demand_forecaster.pkl")
    print("XGBoost Regressor successfully saved to 'models/xgboost_demand_forecaster.pkl'.")
    
    # Generate feature importance report
    importance = final_model.feature_importances_
    importance_df = pd.DataFrame({
        "Feature": features,
        "Coefficient_Weight": importance
    }).sort_values(by="Coefficient_Weight", ascending=False)
    
    print("\nFeature Coefficient Importance weights:")
    print(importance_df.to_string(index=False))
    
    return final_model

if __name__ == "__main__":
    df_raw = extract_transactions_schema()
    df_feats = perform_feature_engineering(df_raw)
    train_xgboost_pipeline(df_feats)
