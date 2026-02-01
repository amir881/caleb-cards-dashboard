import { useState } from 'react';
import { X, ShoppingCart } from 'lucide-react';
import { Card } from '../types';

interface AcquireCardModalProps {
  isOpen: boolean;
  card: Card | null;
  onClose: () => void;
  onAcquire: (cardId: number, dateAcquired: string, costBasis: number) => void;
}

export function AcquireCardModal({ isOpen, card, onClose, onAcquire }: AcquireCardModalProps) {
  const [dateAcquired, setDateAcquired] = useState(new Date().toISOString().split('T')[0]);
  const [costBasis, setCostBasis] = useState<number>(card?.lowest_active_price || card?.avg_30_day_price || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (card) {
      onAcquire(card.id, dateAcquired, costBasis);
      onClose();
    }
  };

  if (!isOpen || !card) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-bears-navy-light border border-bears-gray/30 rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-bears-gray/20">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-green-400" />
            <h2 className="text-white font-semibold text-lg">Mark as Acquired</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-bears-gray/20 rounded">
            <X className="w-5 h-5 text-bears-gray" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Card Info */}
          <div className="bg-bears-navy rounded-lg p-3">
            <p className="text-white font-medium">{card.set_name.replace('Donruss Optic - ', '').replace('Rated Rookie 201', 'Rated Rookie')}</p>
            <p className="text-bears-gray text-sm">{card.parallel_rarity}</p>
            {card.avg_30_day_price && (
              <p className="text-bears-orange text-sm mt-1">
                Est. Value: ${card.avg_30_day_price.toLocaleString()}
              </p>
            )}
          </div>

          {/* Date Acquired */}
          <div>
            <label className="block text-bears-gray text-sm mb-1">Date Acquired</label>
            <input
              type="date"
              value={dateAcquired}
              onChange={(e) => setDateAcquired(e.target.value)}
              className="w-full bg-bears-navy border border-bears-gray/30 rounded-lg px-3 py-2 text-white focus:border-bears-orange focus:outline-none"
              required
            />
          </div>

          {/* Cost Basis */}
          <div>
            <label className="block text-bears-gray text-sm mb-1">Purchase Price ($)</label>
            <input
              type="number"
              value={costBasis}
              onChange={(e) => setCostBasis(parseFloat(e.target.value))}
              placeholder="0.00"
              step="0.01"
              min="0"
              className="w-full bg-bears-navy border border-bears-gray/30 rounded-lg px-3 py-2 text-white focus:border-bears-orange focus:outline-none"
              required
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-bears-navy border border-bears-gray/30 text-white font-medium rounded-lg hover:border-bears-gray/50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg transition-colors"
            >
              Add to Collection
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
