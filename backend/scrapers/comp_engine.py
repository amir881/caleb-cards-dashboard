"""
Rare Card Comp Engine for 1/1s and Low-Population Cards
Implements tiered comp hierarchy for accurate valuations
"""
import asyncio
from typing import Optional, List
from dataclasses import dataclass
from datetime import datetime
import statistics

from ebay_scraper import fetch_ebay_sold_listings, EbaySale


@dataclass
class CompResult:
    tier: int
    tier_name: str
    description: str
    average_price: float
    sales_count: int
    sales: List[EbaySale]
    confidence: str  # "high", "medium", "low"


@dataclass
class RareCardValuation:
    estimated_value: Optional[float]
    confidence: str
    primary_comp: Optional[CompResult]
    all_comps: List[CompResult]
    historical_context: List[dict]
    methodology_notes: List[str]


# 2024 Draft Class QBs for Tier 2 comps
DRAFT_CLASS_2024 = [
    "Jayden Daniels",
    "Drake Maye",
    "Bo Nix",
    "JJ McCarthy",
    "Michael Penix Jr"
]

# Historical trajectory QBs
HISTORICAL_COMPS = {
    "Justin Herbert": {"year": 2020, "pick": 6, "trajectory": "elite"},
    "Trevor Lawrence": {"year": 2021, "pick": 1, "trajectory": "top_pick"}
}


def exclude_outliers(prices: List[float]) -> List[float]:
    """Remove prices more than 2 standard deviations from mean"""
    if len(prices) < 4:
        return prices

    mean = statistics.mean(prices)
    stdev = statistics.stdev(prices)

    return [p for p in prices if abs(p - mean) <= 2 * stdev]


async def get_tier1_comps(year: int, set_name: str, parallel_rarity: str) -> Optional[CompResult]:
    """
    Tier 1: Exact Match - Same card, same player, historical sales
    Highest confidence
    """
    query = f"{year} Caleb Williams {set_name} {parallel_rarity}"
    sales = await fetch_ebay_sold_listings(query, max_results=20)

    if not sales:
        return None

    prices = exclude_outliers([s.price for s in sales])
    if not prices:
        return None

    return CompResult(
        tier=1,
        tier_name="Exact Match",
        description=f"Historical sales of this exact Caleb Williams card",
        average_price=statistics.mean(prices),
        sales_count=len(prices),
        sales=sales,
        confidence="high" if len(prices) >= 3 else "medium"
    )


async def get_tier2_comps(year: int, set_name: str, parallel_rarity: str) -> Optional[CompResult]:
    """
    Tier 2: Same Card Type, Draft Class
    Primary weight for 1/1s - compare same parallel across 2024 rookie QBs
    """
    all_sales = []

    for player in DRAFT_CLASS_2024:
        query = f"{year} {player} {set_name} {parallel_rarity}"
        sales = await fetch_ebay_sold_listings(query, max_results=10)
        all_sales.extend(sales)
        # Rate limiting
        await asyncio.sleep(0.5)

    if not all_sales:
        return None

    prices = exclude_outliers([s.price for s in all_sales])
    if not prices:
        return None

    return CompResult(
        tier=2,
        tier_name="Draft Class Comps",
        description=f"Same card type sales from 2024 QB draft class",
        average_price=statistics.mean(prices),
        sales_count=len(prices),
        sales=all_sales,
        confidence="high" if len(prices) >= 5 else "medium"
    )


async def get_tier3_comps(year: int, set_name: str, population: int) -> Optional[CompResult]:
    """
    Tier 3: Same Player, Low Population
    Caleb Williams cards at similar print runs (/5, /10, /15, /25)
    Used for scarcity multiplier curve
    """
    # Search for Caleb Williams cards at nearby populations
    pop_ranges = [
        (1, 5),
        (6, 10),
        (11, 15),
        (16, 25)
    ]

    target_range = None
    for low, high in pop_ranges:
        if low <= population <= high:
            target_range = (low, high)
            break

    if not target_range:
        target_range = (population - 5, population + 5)

    query = f"{year} Caleb Williams {set_name} /{target_range[1]} OR /{target_range[0]}"
    sales = await fetch_ebay_sold_listings(query, max_results=15)

    if not sales:
        return None

    prices = exclude_outliers([s.price for s in sales])
    if not prices:
        return None

    return CompResult(
        tier=3,
        tier_name="Scarcity Reference",
        description=f"Caleb Williams cards with population {target_range[0]}-{target_range[1]}",
        average_price=statistics.mean(prices),
        sales_count=len(prices),
        sales=sales,
        confidence="low"
    )


async def get_tier4_context(year: int, parallel_type: str) -> Optional[CompResult]:
    """
    Tier 4: Context Only
    Other Caleb Williams 1/1s from different sets
    NOT used for estimated value - display only
    """
    if '1/1' not in parallel_type:
        return None

    query = f"{year} Caleb Williams 1/1"
    sales = await fetch_ebay_sold_listings(query, max_results=20)

    if not sales:
        return None

    prices = [s.price for s in sales]

    return CompResult(
        tier=4,
        tier_name="Market Context",
        description="Other Caleb Williams 1/1s (different card types) - NOT used for valuation",
        average_price=statistics.mean(prices) if prices else 0,
        sales_count=len(prices),
        sales=sales,
        confidence="context_only"
    )


async def get_historical_trajectory(set_name: str, parallel_rarity: str) -> List[dict]:
    """
    Get historical trajectory comps (Herbert 2020, Lawrence 2021)
    Shows what similar cards were trading at during their rookie years
    """
    context = []

    for player, info in HISTORICAL_COMPS.items():
        query = f"{info['year']} {player} {set_name} {parallel_rarity}"
        sales = await fetch_ebay_sold_listings(query, max_results=5)

        if sales:
            avg_price = statistics.mean([s.price for s in sales])
            context.append({
                "player": player,
                "year": info["year"],
                "avg_price": avg_price,
                "note": f"At same career point, {player}'s card was trading at ${avg_price:,.0f}"
            })

        await asyncio.sleep(0.5)

    return context


async def calculate_rare_card_value(year: int, set_name: str, parallel_rarity: str,
                                    population: Optional[int] = None) -> RareCardValuation:
    """
    Main comp engine function for rare cards (population <= 25)

    Implements tiered valuation:
    - Tier 1 available: Use as primary estimate
    - Population = 1 (1/1): Use Tier 2 (draft class) as primary
    - Otherwise: Weighted average of available tiers
    """
    methodology = []
    all_comps = []

    # Fetch all tiers in parallel
    tier1_task = asyncio.create_task(get_tier1_comps(year, set_name, parallel_rarity))
    tier2_task = asyncio.create_task(get_tier2_comps(year, set_name, parallel_rarity))
    tier3_task = asyncio.create_task(get_tier3_comps(year, set_name, population or 25))
    tier4_task = asyncio.create_task(get_tier4_context(year, parallel_rarity))
    historical_task = asyncio.create_task(get_historical_trajectory(set_name, parallel_rarity))

    tier1 = await tier1_task
    tier2 = await tier2_task
    tier3 = await tier3_task
    tier4 = await tier4_task
    historical = await historical_task

    if tier1:
        all_comps.append(tier1)
    if tier2:
        all_comps.append(tier2)
    if tier3:
        all_comps.append(tier3)
    if tier4:
        all_comps.append(tier4)

    # Calculate estimated value based on tier hierarchy
    estimated_value = None
    confidence = "low"
    primary_comp = None

    if tier1 and tier1.sales_count >= 3:
        # Tier 1 available with good data - use it
        estimated_value = tier1.average_price
        confidence = "high"
        primary_comp = tier1
        methodology.append(f"Used Tier 1 (Exact Match) with {tier1.sales_count} sales")

    elif population == 1:
        # 1/1 card - use draft class comps primarily
        if tier2:
            estimated_value = tier2.average_price
            confidence = "medium"
            primary_comp = tier2
            methodology.append(f"1/1 card: Used Tier 2 (Draft Class) with {tier2.sales_count} sales")
            methodology.append("Draft class comps: " + ", ".join(DRAFT_CLASS_2024))
        elif tier1:
            estimated_value = tier1.average_price
            confidence = "low"
            primary_comp = tier1
            methodology.append("Limited data: Used available Tier 1 sales")

    else:
        # Low population (/5, /10, etc.) - weighted average
        weights = []
        values = []

        if tier1 and tier1.average_price:
            weights.append(0.6)  # 60% weight to exact match
            values.append(tier1.average_price)
            methodology.append(f"Tier 1 weight: 60% (${tier1.average_price:,.0f})")

        if tier2 and tier2.average_price:
            weights.append(0.3)  # 30% weight to draft class
            values.append(tier2.average_price)
            methodology.append(f"Tier 2 weight: 30% (${tier2.average_price:,.0f})")

        if tier3 and tier3.average_price:
            weights.append(0.1)  # 10% weight to scarcity reference
            values.append(tier3.average_price)
            methodology.append(f"Tier 3 weight: 10% (${tier3.average_price:,.0f})")

        if weights and values:
            # Normalize weights
            total_weight = sum(weights)
            estimated_value = sum(w * v for w, v in zip(weights, values)) / total_weight
            confidence = "medium" if len(weights) >= 2 else "low"
            primary_comp = tier1 or tier2 or tier3

    # Add note about Tier 4 if present
    if tier4:
        methodology.append(f"Tier 4 context (NOT used for valuation): Other 1/1s averaging ${tier4.average_price:,.0f}")

    return RareCardValuation(
        estimated_value=estimated_value,
        confidence=confidence,
        primary_comp=primary_comp,
        all_comps=all_comps,
        historical_context=historical,
        methodology_notes=methodology
    )


if __name__ == "__main__":
    async def test():
        print("Testing Comp Engine for Nike Swoosh Patch 1/1...")
        result = await calculate_rare_card_value(
            year=2024,
            set_name="Immaculate",
            parallel_rarity="Nike Swoosh Patch 1/1",
            population=1
        )

        print(f"\nEstimated Value: ${result.estimated_value:,.0f}" if result.estimated_value else "No estimate available")
        print(f"Confidence: {result.confidence}")

        print("\nMethodology:")
        for note in result.methodology_notes:
            print(f"  - {note}")

        print("\nHistorical Context:")
        for ctx in result.historical_context:
            print(f"  - {ctx['note']}")

    asyncio.run(test())
