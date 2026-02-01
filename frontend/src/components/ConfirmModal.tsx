import { X, AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmVariant?: 'danger' | 'primary';
  onClose: () => void;
  onConfirm: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  confirmVariant = 'danger',
  onClose,
  onConfirm
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-bears-navy-light border border-bears-gray/30 rounded-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b border-bears-gray/20">
          <div className="flex items-center gap-2">
            <AlertTriangle className={`w-5 h-5 ${confirmVariant === 'danger' ? 'text-red-400' : 'text-bears-orange'}`} />
            <h2 className="text-white font-semibold">{title}</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-bears-gray/20 rounded">
            <X className="w-5 h-5 text-bears-gray" />
          </button>
        </div>

        <div className="p-4">
          <p className="text-bears-gray text-sm mb-4">{message}</p>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2 bg-bears-navy border border-bears-gray/30 text-white font-medium rounded-lg hover:border-bears-gray/50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`flex-1 py-2 font-semibold rounded-lg transition-colors ${
                confirmVariant === 'danger'
                  ? 'bg-red-600 hover:bg-red-500 text-white'
                  : 'bg-bears-orange hover:bg-bears-orange-light text-white'
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
