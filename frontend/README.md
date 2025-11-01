# Frontend (Vite + React)

This small frontend visualizes data and model predictions. It expects your backend to expose:

- GET /api/data -> returns an array of { category, value }
- GET /api/predictions -> returns { predictions: [{id, prediction, score}], feature_importance: [{feature, importance}] }

Quick start (PowerShell):

```powershell
cd frontend
npm install
npm run dev
```

Vite will proxy requests from `/api` to `http://localhost:8080` (see `vite.config.js`). If your backend runs on a different host/port, update `vite.config.js` proxy target.

You can build a production bundle with `npm run build`.
