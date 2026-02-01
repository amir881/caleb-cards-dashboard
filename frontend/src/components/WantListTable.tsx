import { useState } from 'react';
import { AlertTriangle, ExternalLink, ChevronDown, ChevronUp, ShoppingCart, Search, Trash2 } from 'lucide-react';
import { Card } from '../types';

interface WantListTableProps {
  cards: Card[];
  isLoading?: boolean;
  onAcquire?: (card: Card) => void;
  onDelete?: (card: Card) => void;
  isRefreshing?: boolean;
}

type SortKey = 'set_name' | 'avg_30_day_price' | 'lowest_active_price' | 'discount';
type SortDir = 'asc' | 'desc';

export function WantListTable({ cards, isLoading, onAcquire, onDelete, isRefreshing }: WantListTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('discount');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return null;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const calculateDiscount = (card: Card) => {
    if (!card.lowest_active_price || !card.avg_30_day_price) return null;
    return ((card.avg_30_day_price - card.lowest_active_price) / card.avg_30_day_price) * 100;
  };

  const sortedCards = [...cards].sort((a, b) => {
    let aVal: number | string = 0;
    let bVal: number | string = 0;

    switch (sortKey) {
      case 'set_name':
        aVal = `${a.set_name} ${a.parallel_rarity}`;
        bVal = `${b.set_name} ${b.parallel_rarity}`;
        break;
      case 'avg_30_day_price':
        aVal = a.avg_30_day_price || 0;
        bVal = b.avg_30_day_price || 0;
        break;
      case 'lowest_active_price':
        aVal = a.lowest_active_price || Infinity;
        bVal = b.lowest_active_price || Infinity;
        break;
      case 'discount':
        aVal = calculateDiscount(a) || -Infinity;
        bVal = calculateDiscount(b) || -Infinity;
        break;
    }

    if (sortDir === 'asc') {
      return aVal > bVal ? 1 : -1;
    }
    return aVal < bVal ? 1 : -1;
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return null;
    return sortDir === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-bears-navy-light rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-bears-gray/20 rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-bears-gray border-b border-bears-gray/20">
            <th className="pb-3 pr-4">
              <button onClick={() => handleSort('set_name')} className="flex items-center gap-1 hover:text-white">
                Card <SortIcon column="set_name" />
              </button>
            </th>
            <th className="pb-3 px-4">Population</th>
            <th className="pb-3 px-4">Target Grade</th>
            <th className="pb-3 px-4">
              <button onClick={() => handleSort('avg_30_day_price')} className="flex items-center gap-1 hover:text-white">
                30D Avg <SortIcon column="avg_30_day_price" />
              </button>
            </th>
            <th className="pb-3 px-4">
              <button onClick={() => handleSort('lowest_active_price')} className="flex items-center gap-1 hover:text-white">
                Lowest Now <SortIcon column="lowest_active_price" />
              </button>
            </th>
            <th className="pb-3 px-4">
              <button onClick={() => handleSort('discount')} className="flex items-center gap-1 hover:text-white">
                vs Avg <SortIcon column="discount" />
              </button>
            </th>
            <th className="pb-3 pl-4">Action</th>
          </tr>
        </thead>
        <tbody>
          {sortedCards.map((card) => {
            const discount = calculateDiscount(card);
            const isBuyingOpportunity = discount !== null && discount >= 10;

            return (
              <tr
                key={card.id}
                className={`border-b border-bears-gray/10 transition-colors ${
                  isBuyingOpportunity ? 'bg-green-900/20' : 'hover:bg-bears-navy-light/50'
                }`}
              >
                <td className="py-4 pr-4">
                  <div className="flex items-start gap-2">
                    {isBuyingOpportunity && (
                      <span title="Buying opportunity!">
                        <AlertTriangle className="w-4 h-4 text-yellow-400 mt-1 flex-shrink-0" />
                      </span>
                    )}
                    <div>
                      <p className="text-white font-medium text-sm">
                        {card.set_name.replace('Donruss Optic - ', '').replace('Rated Rookie 201', 'Rated Rookie')}
                      </p>
                      <p className="text-bears-gray text-xs mt-0.5">{card.parallel_rarity}</p>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4 text-white text-sm">
                  {card.population ? (
                    <span className={card.population <= 25 ? 'text-bears-orange font-semibold' : ''}>
                      /{card.population}
                    </span>
                  ) : (
                    <span className="text-bears-gray">Unlimited</span>
                  )}
                </td>
                <td className="py-4 px-4 text-white text-sm">
                  <span className="inline-flex items-center gap-1">
                    <span>PSA</span>
                    <span className="text-bears-orange font-bold">10</span>
                  </span>
                </td>
                <td className="py-4 px-4 text-sm">
                  {card.avg_30_day_price ? (
                    <span className="text-white font-medium">{formatCurrency(card.avg_30_day_price)}</span>
                  ) : isRefreshing ? (
                    <span className="text-bears-gray animate-pulse">Loading...</span>
                  ) : (
                    <span className="text-bears-gray text-xs">No data</span>
                  )}
                </td>
                <td className="py-4 px-4">
                  {card.lowest_active_price ? (
                    <span className="text-white text-sm font-medium">
                      {formatCurrency(card.lowest_active_price)}
                    </span>
                  ) : isRefreshing ? (
                    <span className="text-bears-gray text-sm animate-pulse">Searching...</span>
                  ) : (
                    <span className="text-bears-gray text-xs">No listings</span>
                  )}
                </td>
                <td className="py-4 px-4">
                  {discount !== null ? (
                    <span className={`text-sm font-semibold ${
                      discount > 0 ? 'text-green-400' :
                      discount < 0 ? 'text-red-400' :
                      'text-bears-gray'
                    }`}>
                      {discount > 0 ? '-' : '+'}{Math.abs(discount).toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-bears-gray text-sm">-</span>
                  )}
                </td>
                <td className="py-4 pl-4">
                  <div className="flex items-center gap-2">
                    {/* Buy Now button - use direct URL if available, otherwise search URL */}
                    {card.lowest_active_url ? (
                      <a
                        href={card.lowest_active_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-bears-orange hover:bg-bears-orange-light text-white text-xs font-semibold rounded-lg transition-colors"
                      >
                        Buy Now <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : card.ebay_active_url ? (
                      <a
                        href={card.ebay_active_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-bears-navy border border-bears-gray/30 hover:border-bears-orange/50 text-white text-xs font-medium rounded-lg transition-colors"
                      >
                        <Search className="w-3 h-3" /> Search eBay
                      </a>
                    ) : null}
                    {onAcquire && (
                      <button
                        onClick={() => onAcquire(card)}
                        className="p-2 hover:bg-green-500/20 rounded-lg transition-colors"
                        title="Mark as acquired"
                      >
                        <ShoppingCart className="w-4 h-4 text-bears-gray hover:text-green-400" />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(card)}
                        className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                        title="Remove from want list"
                      >
                        <Trash2 className="w-4 h-4 text-bears-gray hover:text-red-400" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
