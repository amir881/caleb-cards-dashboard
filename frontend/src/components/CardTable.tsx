import { useState } from 'react';
import { TrendingUp, TrendingDown, Minus, RefreshCw, ChevronDown, ChevronUp, ExternalLink, Trash2 } from 'lucide-react';
import { Card } from '../types';

interface CardTableProps {
  cards: Card[];
  isLoading?: boolean;
  onRefreshCard?: (cardId: number) => void;
  onDeleteCard?: (card: Card) => void;
  isRefreshing?: boolean;
}

type SortKey = 'set_name' | 'cost_basis' | 'estimated_value' | 'pl_percent' | 'avg_30_day_price';
type SortDir = 'asc' | 'desc';

export function CardTable({ cards, isLoading, onRefreshCard, onDeleteCard, isRefreshing }: CardTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('estimated_value');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return null;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercent = (value: number | null | undefined) => {
    if (value === null || value === undefined) return null;
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const calculatePL = (card: Card) => {
    const value = card.estimated_value ?? card.cost_basis;
    if (!card.cost_basis || !value) return { dollars: null, percent: null };
    const dollars = value - card.cost_basis;
    const percent = (dollars / card.cost_basis) * 100;
    return { dollars, percent };
  };

  const sortedCards = [...cards].sort((a, b) => {
    let aVal: number | string = 0;
    let bVal: number | string = 0;

    switch (sortKey) {
      case 'set_name':
        aVal = `${a.set_name} ${a.parallel_rarity}`;
        bVal = `${b.set_name} ${b.parallel_rarity}`;
        break;
      case 'cost_basis':
        aVal = a.cost_basis || 0;
        bVal = b.cost_basis || 0;
        break;
      case 'estimated_value':
        aVal = a.estimated_value || a.cost_basis || 0;
        bVal = b.estimated_value || b.cost_basis || 0;
        break;
      case 'pl_percent':
        aVal = calculatePL(a).percent || 0;
        bVal = calculatePL(b).percent || 0;
        break;
      case 'avg_30_day_price':
        aVal = a.avg_30_day_price || 0;
        bVal = b.avg_30_day_price || 0;
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

  const TrendIcon = ({ trend }: { trend: Card['price_trend'] }) => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-green-400" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-400" />;
    return <Minus className="w-4 h-4 text-bears-gray" />;
  };

  const ValueDisplay = ({ value, fallback }: { value: number | null | undefined; fallback?: string }) => {
    const formatted = formatCurrency(value);
    if (formatted) return <span className="text-white">{formatted}</span>;
    if (isRefreshing) return <span className="text-bears-gray animate-pulse">Loading...</span>;
    return <span className="text-bears-gray text-xs">{fallback || 'No data'}</span>;
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
            <th className="pb-3 px-4">Grade</th>
            <th className="pb-3 px-4">
              <button onClick={() => handleSort('cost_basis')} className="flex items-center gap-1 hover:text-white">
                Cost <SortIcon column="cost_basis" />
              </button>
            </th>
            <th className="pb-3 px-4">
              <button onClick={() => handleSort('estimated_value')} className="flex items-center gap-1 hover:text-white">
                Value <SortIcon column="estimated_value" />
              </button>
            </th>
            <th className="pb-3 px-4">
              <button onClick={() => handleSort('pl_percent')} className="flex items-center gap-1 hover:text-white">
                P/L <SortIcon column="pl_percent" />
              </button>
            </th>
            <th className="pb-3 px-4">
              <button onClick={() => handleSort('avg_30_day_price')} className="flex items-center gap-1 hover:text-white">
                30D Avg <SortIcon column="avg_30_day_price" />
              </button>
            </th>
            <th className="pb-3 px-4">Trend</th>
            <th className="pb-3 pl-4"></th>
          </tr>
        </thead>
        <tbody>
          {sortedCards.map((card) => {
            const { dollars, percent } = calculatePL(card);
            const isExpanded = expandedId === card.id;
            const displayValue = card.estimated_value ?? card.cost_basis;

            return (
              <>
                <tr
                  key={card.id}
                  onClick={() => setExpandedId(isExpanded ? null : card.id)}
                  className="border-b border-bears-gray/10 hover:bg-bears-navy-light/50 cursor-pointer transition-colors"
                >
                  <td className="py-4 pr-4">
                    <div>
                      <p className="text-white font-medium text-sm">
                        {card.set_name.replace('Donruss Optic - ', '').replace('Rated Rookie 201', 'Rated Rookie')}
                      </p>
                      <p className="text-bears-gray text-xs mt-0.5">{card.parallel_rarity}</p>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    {card.is_graded ? (
                      <span className="inline-flex items-center gap-1 text-sm">
                        <span className="font-semibold text-white">{card.grading_company}</span>
                        <span className="text-bears-orange font-bold">{card.grade}</span>
                      </span>
                    ) : (
                      <span className="text-bears-gray text-sm">Raw</span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-white text-sm font-medium">
                    {formatCurrency(card.cost_basis) || '-'}
                  </td>
                  <td className="py-4 px-4 text-sm font-medium">
                    <ValueDisplay value={displayValue} fallback="= Cost" />
                  </td>
                  <td className="py-4 px-4">
                    {percent !== null ? (
                      <>
                        <div className={`text-sm font-semibold ${
                          percent > 0 ? 'text-green-400' :
                          percent < 0 ? 'text-red-400' :
                          'text-bears-gray'
                        }`}>
                          {formatPercent(percent)}
                        </div>
                        <div className="text-xs text-bears-gray">
                          {formatCurrency(dollars)}
                        </div>
                      </>
                    ) : (
                      <span className="text-bears-gray text-sm">-</span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-sm">
                    <ValueDisplay value={card.avg_30_day_price} fallback={card.num_sales_30_day === 0 ? '0 sales' : 'No data'} />
                  </td>
                  <td className="py-4 px-4">
                    {card.price_trend ? <TrendIcon trend={card.price_trend} /> : <span className="text-bears-gray">-</span>}
                  </td>
                  <td className="py-4 pl-4">
                    <div className="flex items-center gap-1">
                      {card.ebay_sold_url && (
                        <a
                          href={card.ebay_sold_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 hover:bg-bears-orange/20 rounded-lg transition-colors"
                          title="View on eBay"
                        >
                          <ExternalLink className="w-4 h-4 text-bears-gray hover:text-bears-orange" />
                        </a>
                      )}
                      {onRefreshCard && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRefreshCard(card.id);
                          }}
                          className="p-2 hover:bg-bears-orange/20 rounded-lg transition-colors"
                          title="Refresh price"
                        >
                          <RefreshCw className="w-4 h-4 text-bears-gray hover:text-bears-orange" />
                        </button>
                      )}
                      {onDeleteCard && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteCard(card);
                          }}
                          className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                          title="Remove card"
                        >
                          <Trash2 className="w-4 h-4 text-bears-gray hover:text-red-400" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                {isExpanded && (
                  <tr key={`${card.id}-expanded`}>
                    <td colSpan={8} className="bg-bears-navy/50 px-4 py-4">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                        <div>
                          <p className="text-bears-gray text-xs">Last Sale</p>
                          <p className="text-white">{formatCurrency(card.last_sale_price) || 'No data'}</p>
                          <p className="text-bears-gray text-xs">{card.last_sale_date || ''}</p>
                        </div>
                        <div>
                          <p className="text-bears-gray text-xs">30-Day Volume</p>
                          <p className="text-white">{card.num_sales_30_day ?? 0} sales</p>
                        </div>
                        <div>
                          <p className="text-bears-gray text-xs">Population</p>
                          <p className="text-white">{card.population ? `/${card.population}` : 'Unlimited'}</p>
                        </div>
                        <div>
                          <p className="text-bears-gray text-xs">Acquired</p>
                          <p className="text-white">{card.date_acquired || '-'}</p>
                        </div>
                        <div>
                          <p className="text-bears-gray text-xs">eBay Search</p>
                          {card.ebay_sold_url && (
                            <a
                              href={card.ebay_sold_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-bears-orange hover:underline text-xs flex items-center gap-1"
                            >
                              View Sold Listings <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
