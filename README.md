# Caleb Williams Rookie Card Collection Dashboard

A Robinhood-style portfolio tracker for your Caleb Williams rookie card collection with real-time eBay pricing, rare card comps, and buying opportunity alerts.

## Features

- **Portfolio Tracking**: Track your owned cards with cost basis and estimated value
- **eBay Price Scraping**: Real-time pricing from completed and active eBay listings
- **Rare Card Comp Engine**: Tiered valuation system for 1/1s and low-population cards
- **Want List Management**: Track cards you want with lowest price alerts
- **Buying Opportunities**: Flag cards 10%+ below 30-day average
- **Bears Theme**: Chicago Bears navy (#0B162A) and orange (#C83803) color scheme

## Quick Start

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Install Playwright browsers (for eBay scraping)
playwright install chromium

# Initialize database and import Excel data
cd api
python excel_import.py "../../data/Caleb Williams Rookie Collection.xlsx"

# Start the API server
python main.py
```

The API will run at http://localhost:8000

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The dashboard will be at http://localhost:5173

## Project Structure

```
caleb-cards-dashboard/
├── backend/
│   ├── api/
│   │   ├── main.py          # FastAPI endpoints
│   │   ├── database.py      # SQLite models and queries
│   │   └── excel_import.py  # Excel file importer
│   ├── scrapers/
│   │   ├── ebay_scraper.py  # Playwright-based eBay scraper
│   │   └── comp_engine.py   # Rare card valuation engine
│   ├── data/
│   │   └── cards.db         # SQLite database
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── hooks/           # API hooks (React Query)
│   │   ├── types/           # TypeScript types
│   │   └── App.tsx          # Main dashboard
│   └── package.json
└── data/
    └── Caleb Williams Rookie Collection.xlsx
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/portfolio/summary` | GET | Portfolio KPIs |
| `/api/portfolio/history` | GET | Historical value chart data |
| `/api/cards` | GET | All cards |
| `/api/cards/owned` | GET | Owned cards only |
| `/api/cards/wantlist` | GET | Want list only |
| `/api/prices/refresh` | POST | Refresh all prices (background) |
| `/api/prices/refresh/{id}` | POST | Refresh single card |
| `/api/export/csv` | GET | Export to CSV |

## Tech Stack

**Frontend:**
- React 18 with TypeScript
- Tailwind CSS (Bears color theme)
- Recharts for portfolio chart
- React Query for data fetching

**Backend:**
- Python FastAPI
- SQLite database
- Playwright for eBay scraping
- pandas for Excel import

## Configuration

### eBay Scraping
- Results cached for 15 minutes
- Rate limited to avoid blocks
- Searches completed listings for price history
- Searches active listings for want list lowest prices

### Comp Engine (for rare cards)
**Tier 1**: Exact match historical sales
**Tier 2**: Draft class comps (Daniels, Maye, Nix, etc.)
**Tier 3**: Same player, similar population
**Tier 4**: Market context only (not used for valuation)

## Your Collection Summary

- **12 owned cards** (~$10,043 cost basis)
- **32 want list cards** (including 3 1/1s)
- **Notable cards**: Nike Swoosh Patch 1/1, 2x Kaboom!, Topps Finest Auto
