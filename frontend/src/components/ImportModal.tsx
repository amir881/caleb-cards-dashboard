import { useState, useRef } from 'react';
import { X, Upload, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ImportModal({ isOpen, onClose, onSuccess }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')) {
        setFile(selectedFile);
        setError(null);
      } else {
        setError('Please select an Excel file (.xlsx or .xls)');
        setFile(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const API_URL = import.meta.env.VITE_API_URL || '/api';
      const response = await fetch(`${API_URL}/import/excel`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Upload failed');
      }

      await response.json();
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
        setFile(null);
        setSuccess(false);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      if (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls')) {
        setFile(droppedFile);
        setError(null);
      } else {
        setError('Please select an Excel file (.xlsx or .xls)');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-bears-navy-light border border-bears-gray/30 rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-bears-gray/20">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-bears-orange" />
            <h2 className="text-white font-semibold">Import Collection</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-bears-gray/20 rounded">
            <X className="w-5 h-5 text-bears-gray" />
          </button>
        </div>

        <div className="p-4">
          <p className="text-bears-gray text-sm mb-4">
            Upload your Excel spreadsheet with your card collection data. This will replace any existing data.
          </p>

          {/* Drop zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              file
                ? 'border-green-500 bg-green-500/10'
                : 'border-bears-gray/30 hover:border-bears-orange/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <CheckCircle className="w-10 h-10 text-green-400" />
                <p className="text-white font-medium">{file.name}</p>
                <p className="text-bears-gray text-xs">Click to change file</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-10 h-10 text-bears-gray" />
                <p className="text-white">Drop your Excel file here</p>
                <p className="text-bears-gray text-xs">or click to browse</p>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="mt-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
              <p className="text-green-400 text-sm">Import successful! Refreshing...</p>
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2 bg-bears-navy border border-bears-gray/30 text-white font-medium rounded-lg hover:border-bears-gray/50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="flex-1 py-2 bg-bears-orange hover:bg-bears-orange-light disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Import
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
