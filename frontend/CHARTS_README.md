# React Charts Setup

## Ce am creat:

### 1. Backend API pentru date grafice (`backend/routes/charts.py`)
- **GET /charts/data** - Returnează toate datele pentru grafice
- **GET /charts/summary** - Returnează statistici sumare

### 2. Componenta React Charts (`frontend/src/components/Charts.jsx`)
Afișează 7 grafice interactive:
1. **Fraud Distribution** - Bar chart
2. **Top 10 Merchants** - Horizontal bar chart  
3. **Transaction Types** - Pie chart
4. **Fraud Rate by Category** - Horizontal bar chart
5. **Countries Distribution** - Bar chart
6. **Card Present Analysis** - Bar chart
7. **Amount Statistics** - Grouped bar chart

## Setup și rulare:

### 1. Instalează dependențele backend:
```bash
cd backend
pip install flask-cors
# sau rebuild docker:
docker compose build backend-api
docker compose up -d backend-api
```

### 2. Pornește frontend-ul:
```bash
cd frontend
npm install  # dacă nu ai instalat deja
npm run dev
```

### 3. Adaugă componenta în App:
```jsx
// În App.jsx
import Charts from './components/Charts';

function App() {
  return (
    <div>
      <Charts />
    </div>
  );
}
```

### 4. Sau adaugă ca rută separată:
```jsx
// În App.jsx
import { useState } from 'react';
import Charts from './components/Charts';
import DataPage from './components/DataPage';

function App() {
  const [currentPage, setCurrentPage] = useState('data');

  return (
    <div>
      <nav>
        <button onClick={() => setCurrentPage('data')}>Data</button>
        <button onClick={() => setCurrentPage('charts')}>Charts</button>
      </nav>
      
      {currentPage === 'data' && <DataPage />}
      {currentPage === 'charts' && <Charts />}
    </div>
  );
}
```

## Test API:

```bash
# Test endpoint-ul de date
curl http://localhost:5000/charts/data

# Test summary
curl http://localhost:5000/charts/summary
```

## Răspuns exemplu:

```json
{
  "fraudDistribution": [
    {"name": "Non-Fraud", "count": 950000},
    {"name": "Fraud", "count": 50000}
  ],
  "topMerchants": [
    {"name": "Amazon", "count": 120000},
    {"name": "Walmart", "count": 95000}
  ],
  "transactionTypes": [
    {"name": "PURCHASE", "value": 850000},
    {"name": "REVERSAL", "value": 100000}
  ],
  "fraudByCategory": [
    {"category": "online_retail", "fraudRate": 8.5, "total": 200000}
  ],
  "countries": [
    {"country": "US", "count": 750000},
    {"country": "CA", "count": 150000}
  ],
  "cardPresent": [
    {"status": "Present", "fraudRate": 1.2, "total": 600000},
    {"status": "Not Present", "fraudRate": 12.5, "total": 400000}
  ],
  "amountStats": [
    {"type": "Non-Fraud", "mean": 125.50, "median": 85.00},
    {"type": "Fraud", "mean": 450.25, "median": 320.00}
  ]
}
```

## Features:

✅ **Responsive** - Graficele se adaptează la dimensiunea ecranului
✅ **Interactive** - Hover pentru detalii
✅ **Colorat** - Culori diferite pentru fraud vs non-fraud
✅ **Real-time data** - Date direct din PostgreSQL
✅ **Loading state** - Indicator de încărcare
✅ **Error handling** - Gestionare erori

## Customize:

Modifică culorile în `Charts.jsx`:
```jsx
const COLORS = ['#2ecc71', '#e74c3c', '#3498db', '#f39c12', '#9b59b6'];
```

Modifică dimensiunile:
```jsx
<ResponsiveContainer width="100%" height={400}>
```

Adaugă grafice noi în `charts.py` și `Charts.jsx`!
