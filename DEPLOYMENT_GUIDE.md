# GroSence Deployment Guide
### Production Setup for Grocery Inventory, POS Billing & XGBoost Forecasting
---

## 1. System Architecture Overview
The system is constructed as a three-tier full-stack application:
- **Client Tier**: React Native Expo (configured for mobile POS) or React SPA (for web operations) using TailwindCSS, Zustand state managers, and custom vector/SVG analytics curves.
- **Backend Service**: FastAPI (Python 3.11) exposing transactional REST APIs and coordinating demand computations.
- **Relational Storage**: PostgreSQL (v15+) representing relational transaction models.
- **Machine Learning**: XGBoost Regressor serialization pipeline running on Pandas structures.

---

## 2. Relational Database Deployment
Initialize the PostgreSQL instance and deploy `/src/schema.sql`.

```bash
# Connect to your PostgreSQL instance
psql -h localhost -U postgres -d postgres

# Create target GroSence database
CREATE DATABASE grosence;
\c grosence

# Run the DDL Schema Script
\i src/schema.sql
```

---

## 3. Python Backend Services (FastAPI + XGBoost Engine)
The Python service houses the endpoint controllers and calculates predictions.

### 3.1 Setup virtual environment & libraries
```bash
cd backend/

# Initialize virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install essential dependencies
pip install --upgrade pip
pip install fastapi uvicorn pydantic pandas numpy scikit-learn xgboost joblib psycopg2-binary
```

### 3.2 Configure Environment Variables (`.env`)
Create a `.env` file within the script root:
```env
DATABASE_URL=postgresql://postgres:password123@localhost:5432/grosence
JWT_SECRET_KEY=grosence_jwt_secure_key_101
GEMINI_API_KEY=your_gemini_api_key_here
PORT=8000
```

### 3.3 Run XGBoost Model Fitting Pipeline
```bash
# Run feature extraction and output pkl weight binaries
python src/ml_pipeline.py
```

### 3.4 Launch FastAPI Gateway Uvicorn Server
```bash
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

---

## 4. Web / Expo Mobile POS Frontend setup
Deploy client dependencies and coordinate reverse proxies.

### 4.1 Installing packages
```bash
cd frontend/
npm install
```

### 4.2 Configure endpoint targets (`config.ts`)
Map API fetch routes to point to the FastAPI uvicorn listener:
```typescript
export const API_URL = "http://localhost:8000/api";
```

### 4.3 Running local server dev builds
```bash
# Web builds
npm run dev

# Expo / mobile targets
npx expo start
```

---

## 5. Docker Containers Orchestration (`docker-compose.yml`)
To speed up production staging, use `docker-compose`:

```yaml
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    container_name: grosence_db
    environment:
      POSTGRES_DB: grosence
      POSTGRES_PASSWORD: password123
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  backend:
    build: ./backend
    container_name: grosence_fastapi
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://postgres:password123@db:5432/grosence
      - GEMINI_API_KEY=MY_GEMINI_KEY
    depends_on:
      - db

  frontend:
    build: ./frontend
    container_name: grosence_react
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  pgdata:
```

### 5.1 Boot container stack
```bash
docker-compose up --build -d
```
All system networks are now interlinked and operational!
