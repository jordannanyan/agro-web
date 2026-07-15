# Agro Supply Chain — Web (Frontend)

React + Vite + TypeScript + Tailwind frontend for the Agro Supply Chain Dashboard,
wired to the [`agro-api`](https://github.com/jordannanyan/agro-api) backend.

## Stack
- React 18 + Vite 6 + TypeScript
- Tailwind CSS v4 + Radix UI (shadcn-style components)
- react-router 7, recharts, react-leaflet (GIS map), sonner (toasts)
- JWT auth against agro-api

## Setup
```bash
npm install
cp .env.example .env     # point VITE_API_URL to your agro-api instance
npm run dev              # http://localhost:5173
npm run build            # production build → dist/
```
Make sure `agro-api` is running (default `http://localhost:3002`).

Default login (seeded in agro-api): **finance01 / password**
(also intern01, pm01, head01, director01).

## Modules
Auth · Executive Dashboard · Procurement (PR → PO → PayReq + approval workflow +
attachments) · Transaction (Purchasing/Processing/Selling — scheme derived from plot) ·
Warehouse (calculated stock, Stock In, Stock Card, Reorder) · Pre-Finance
(Distribution, Installment breakdown, Outstanding) · Profit Sharing · Finance
(budget vs actual) · Settings (master data CRUD) · GIS Map Monitoring.
