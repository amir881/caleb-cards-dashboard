"""
eBay Price Data Module for Caleb Williams Card Dashboard

Since eBay blocks automated scraping, this module:
1. Generates eBay search URLs for users to click and verify prices
2. Uses a local price database for estimates based on known market data
3. Caches any manually entered prices

For full automation, consider:
- eBay Browse API (requires developer account): https://developer.ebay.com/api-docs/buy/browse/overview.html
- Third-party APIs: 130point.com, CardLadder.com, PriceCharting.com
"""
import re
from datetime import datetime, timedelta
from typing import Optional, List
from dataclasses import dataclass
import json
from pathlib import Path
import urllib.parse

# Cache file for price data
CACHE_FILE = Path(__file__).parent.parent / "data" / "price_cache.json"
CACHE_TTL_MINUTES = 60 * 24  # 24 hours for manual entry cache

# Known price estimates based on recent market data (January 2026)
# These serve as fallback estimates when eBay scraping is blocked
PRICE_ESTIMATES = {
    # Donruss Optic Rated Rookie base and common parallels (PSA 10)
    "base": 50,
    "holo": 200,
    "blue hyper": 100,
    "green hyper": 120,
    "pink": 100,
    "purple shock": 90,
    "fire": 400,
    "red mojo": 250,
    "green velocity": 150,
    "teal velocity": 140,
    "white sparkle": 130,
    "freedom": 200,
    "jazz": 180,
    "stars": 160,
    "red stars": 300,
    "rocket": 250,
    "one hundred": 500,
    "blue glitter": 350,

    # Numbered parallels (PSA 10 estimates)
    "wave /300": 150,
    "aqua /299": 160,
    "orange /249": 180,
    "blue /199": 200,
    "flex /149": 250,
    "red /125": 300,
    "pink velocity /80": 400,
    "orange scope /79": 420,
    "electricity /75": 450,
    "purple /60": 550,
    "lime green /50": 650,
    "team logo /32": 900,
    "black pandora /25": 1200,
    "dragon /24": 1300,
    "footballs /16": 2000,
    "ice /15": 2200,
    "purple stars /15": 2100,
    "gold /10": 3500,
    "blue mojo /5": 6000,
    "green /5": 5500,

    # 1/1s - highly variable, these are rough estimates
    "black 1/1": 15000,
    "gold vinyl 1/1": 20000,
    "nebula 1/1": 18000,

    # Other sets
    "kaboom! horizontal": 4500,
    "kaboom horizontal": 4500,
    "framed fabrics patch /25": 300,
    "framed fabrics patch": 300,
    "rookie auto refractor": 350,
    "nike swoosh patch 1/1": 8000,
    "nike swoosh patch": 8000,
}


@dataclass
class EbaySale:
    title: str
    price: float
    sale_date: str
    url: str
    is_auction: bool


@dataclass
class EbayListing:
    title: str
    price: float
    url: str
    is_buy_now: bool


@dataclass
class PriceData:
    last_sale_price: Optional[float]
    last_sale_date: Optional[str]
    avg_30_day_price: Optional[float]
    num_sales_30_day: int
    price_trend: Optional[str]
    lowest_active_price: Optional[float]
    lowest_active_url: Optional[str]
    sales: List[EbaySale]
    source: str = "estimate"  # "estimate", "cache", "api"


def load_cache() -> dict:
    """Load price cache from file"""
    if CACHE_FILE.exists():
        try:
            with open(CACHE_FILE, 'r') as f:
                return json.load(f)
        except:
            return {}
    return {}


def save_cache(cache: dict):
    """Save price cache to file"""
    CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(CACHE_FILE, 'w') as f:
        json.dump(cache, f, indent=2)


def get_cached_price(cache_key: str) -> Optional[dict]:
    """Get cached price if not expired"""
    cache = load_cache()
    if cache_key in cache:
        cached = cache[cache_key]
        try:
            cached_time = datetime.fromisoformat(cached['timestamp'])
            if datetime.now() - cached_time < timedelta(minutes=CACHE_TTL_MINUTES):
                return cached['data']
        except:
            pass
    return None


def set_cached_price(cache_key: str, data: dict):
    """Cache price data"""
    cache = load_cache()
    cache[cache_key] = {
        'timestamp': datetime.now().isoformat(),
        'data': data
    }
    save_cache(cache)


def build_search_query(year: int, set_name: str, parallel_rarity: str,
                       grading_company: Optional[str] = None,
                       grade: Optional[float] = None,
                       raw_only: bool = False) -> str:
    """Build simplified eBay search query string"""
    parts = ["Caleb Williams"]

    # Simplify set name
    set_lower = set_name.lower()
    if "donruss optic" in set_lower:
        parts.append("Optic")
    elif "national treasures" in set_lower:
        parts.append("National Treasures")
    elif "topps finest" in set_lower:
        parts.append("Topps Finest")
    elif "panini absolute" in set_lower or "kaboom" in parallel_rarity.lower():
        parts.append("Kaboom")
    elif "immaculate" in set_lower:
        parts.append("Immaculate")
    else:
        clean_set = set_name.split(' - ')[0].split()[0]
        parts.append(clean_set)

    # Extract key parallel info
    clean_parallel = re.sub(r'^\d+\.\s*', '', parallel_rarity)  # Remove numbering

    if '1/1' in parallel_rarity:
        clean_parallel = clean_parallel.replace('1/1', '').strip()
        if clean_parallel:
            parts.append(clean_parallel)
        parts.append("1/1")
    else:
        clean_parallel = re.sub(r'/\d+', '', clean_parallel).strip()
        if clean_parallel and clean_parallel.lower() not in ['base', 'rookie']:
            parts.append(clean_parallel)

    # Add grading info
    if grading_company and grade:
        grade_str = str(int(grade)) if grade == int(grade) else str(grade)
        parts.append(f"{grading_company} {grade_str}")
    elif raw_only:
        parts.append("raw")

    return " ".join(parts)


def get_estimated_price(set_name: str, parallel_rarity: str,
                        grading_company: Optional[str] = None,
                        grade: Optional[float] = None) -> Optional[float]:
    """Get estimated price from known market data"""
    # Build lookup key
    clean_parallel = re.sub(r'^\d+\.\s*', '', parallel_rarity).lower().strip()

    # Try exact match first
    if clean_parallel in PRICE_ESTIMATES:
        base_price = PRICE_ESTIMATES[clean_parallel]
    else:
        # Try to find partial match
        base_price = None
        for key, price in PRICE_ESTIMATES.items():
            if key in clean_parallel or clean_parallel in key:
                base_price = price
                break

    if base_price is None:
        # Default estimates based on population
        match = re.search(r'/(\d+)', parallel_rarity)
        if match:
            pop = int(match.group(1))
            if pop == 1:
                base_price = 15000
            elif pop <= 5:
                base_price = 5000
            elif pop <= 10:
                base_price = 3000
            elif pop <= 25:
                base_price = 1000
            elif pop <= 50:
                base_price = 500
            elif pop <= 100:
                base_price = 300
            else:
                base_price = 150
        elif '1/1' in parallel_rarity:
            base_price = 15000
        else:
            # Unlimited parallel
            base_price = 100

    # Adjust for grading
    if grading_company and grade:
        if grade >= 10:
            pass  # PSA 10 is the base estimate
        elif grade >= 9.5:
            base_price *= 0.6
        elif grade >= 9:
            base_price *= 0.4
        elif grade >= 8:
            base_price *= 0.25
        else:
            base_price *= 0.15
    elif grading_company is None:
        # Raw card - discount from PSA 10
        base_price *= 0.3

    return round(base_price, 0)


def generate_ebay_url(query: str, sold: bool = True) -> str:
    """Generate direct eBay search URL"""
    encoded = urllib.parse.quote_plus(query)
    if sold:
        return f"https://www.ebay.com/sch/i.html?_nkw={encoded}&LH_Complete=1&LH_Sold=1&_sop=13"
    else:
        return f"https://www.ebay.com/sch/i.html?_nkw={encoded}&_sop=15&LH_BIN=1"


async def fetch_ebay_sold_listings(query: str, max_results: int = 20) -> List[EbaySale]:
    """
    Placeholder for eBay sold listings.
    Returns empty list - users should click the eBay URL to see actual sales.
    """
    return []


async def fetch_ebay_active_listings(query: str, max_results: int = 10) -> List[EbayListing]:
    """
    Placeholder for eBay active listings.
    Returns empty list - users should click the eBay URL to find listings.
    """
    return []


async def get_card_prices(year: int, set_name: str, parallel_rarity: str,
                          is_owned: bool, is_graded: bool,
                          grading_company: Optional[str] = None,
                          grade: Optional[float] = None) -> PriceData:
    """
    Get pricing data for a card.

    Since eBay blocks scraping, this uses:
    1. Cached prices (if manually entered or previously fetched)
    2. Estimated prices based on known market data
    """
    # Build cache key
    cache_key = f"{year}_{set_name}_{parallel_rarity}_{grading_company}_{grade}_{is_owned}_{is_graded}"
    cache_key = re.sub(r'[^\w]', '_', cache_key)

    # Check cache first
    cached = get_cached_price(cache_key)
    if cached:
        return PriceData(
            last_sale_price=cached.get('last_sale_price'),
            last_sale_date=cached.get('last_sale_date'),
            avg_30_day_price=cached.get('avg_30_day_price'),
            num_sales_30_day=cached.get('num_sales_30_day', 0),
            price_trend=cached.get('price_trend', 'stable'),
            lowest_active_price=cached.get('lowest_active_price'),
            lowest_active_url=cached.get('lowest_active_url'),
            sales=[EbaySale(**s) for s in cached.get('sales', [])],
            source="cache"
        )

    # Generate estimated price
    estimated = get_estimated_price(set_name, parallel_rarity, grading_company, grade)

    # Build search query for URLs
    if is_owned and is_graded:
        query = build_search_query(year, set_name, parallel_rarity, grading_company, grade)
    elif is_owned and not is_graded:
        query = build_search_query(year, set_name, parallel_rarity, raw_only=True)
    else:
        # Want list - search for PSA 10
        query = build_search_query(year, set_name, parallel_rarity, "PSA", 10)

    # Generate eBay URL for want list items
    lowest_active_url = generate_ebay_url(query, sold=False) if not is_owned else None

    price_data = PriceData(
        last_sale_price=estimated,
        last_sale_date=datetime.now().strftime('%Y-%m-%d'),
        avg_30_day_price=estimated,
        num_sales_30_day=0,  # Unknown without actual data
        price_trend="stable",
        lowest_active_price=estimated if not is_owned else None,
        lowest_active_url=lowest_active_url,
        sales=[],
        source="estimate"
    )

    # Cache the estimate
    cache_data = {
        'last_sale_price': price_data.last_sale_price,
        'last_sale_date': price_data.last_sale_date,
        'avg_30_day_price': price_data.avg_30_day_price,
        'num_sales_30_day': price_data.num_sales_30_day,
        'price_trend': price_data.price_trend,
        'lowest_active_price': price_data.lowest_active_price,
        'lowest_active_url': price_data.lowest_active_url,
        'sales': [],
        'source': 'estimate'
    }
    set_cached_price(cache_key, cache_data)

    return price_data


def update_manual_price(cache_key: str, price: float, sale_date: str = None):
    """
    Manually update a card's price (for users to enter after checking eBay).
    """
    if sale_date is None:
        sale_date = datetime.now().strftime('%Y-%m-%d')

    cache_data = {
        'last_sale_price': price,
        'last_sale_date': sale_date,
        'avg_30_day_price': price,
        'num_sales_30_day': 1,
        'price_trend': 'stable',
        'lowest_active_price': None,
        'lowest_active_url': None,
        'sales': [{'title': 'Manual entry', 'price': price, 'sale_date': sale_date, 'url': '', 'is_auction': False}],
        'source': 'manual'
    }
    set_cached_price(cache_key, cache_data)


if __name__ == "__main__":
    import asyncio

    async def test():
        print("Testing price estimation...")

        # Test various cards
        test_cards = [
            ("Donruss Optic - Rated Rookie 201", "9. Holo", "PSA", 10),
            ("Donruss Optic - Rated Rookie 201", "5. Fire", "PSA", 10),
            ("Donruss Optic - Rated Rookie 201", "42. Black 1/1", None, None),
            ("Panini Absolute", "Kaboom! Horizontal", "PSA", 10),
            ("Immaculate", "Nike Swoosh Patch 1/1", None, None),
        ]

        for set_name, parallel, company, grade in test_cards:
            price = get_estimated_price(set_name, parallel, company, grade)
            graded_str = f"{company} {grade}" if company else "Raw"
            print(f"  {parallel} ({graded_str}): ${price:,.0f}")

        # Test full price data fetch
        print("\nTesting get_card_prices...")
        data = await get_card_prices(
            year=2024,
            set_name="Donruss Optic - Rated Rookie 201",
            parallel_rarity="5. Fire",
            is_owned=True,
            is_graded=True,
            grading_company="PSA",
            grade=10
        )
        print(f"  Fire PSA 10: ${data.avg_30_day_price:,.0f} (source: {data.source})")

    asyncio.run(test())
