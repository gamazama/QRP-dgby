import React, { useState, useEffect } from 'react';
import { X, Clipboard, Download, Upload, FileImage, FileJson } from 'lucide-react';
import { readPngMetadata } from '../utils/png';
import { decompressConfig } from '../utils/compression';

interface ImportModalProps {
  onClose: () => void;
  onImport: (data: string) => void;
}

const ImportModal: React.FC<ImportModalProps> = ({ onClose, onImport }) => {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Focus input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
        const el = document.getElementById('import-textarea');
        if (el) el.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInputValue(text);
      setError(null);
    } catch (err) {
      setError('Failed to read clipboard. Please paste manually.');
    }
  };

  const handleSubmit = () => {
      if (!inputValue.trim()) {
          setError('Please enter some data.');
          return;
      }
      onImport(inputValue);
      onClose();
  };

  const processFile = (file: File) => {
    // 1. Handle JSON Files
    if (file.type === 'application/json' || file.name.endsWith('.json')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            if (e.target?.result && typeof e.target.result === 'string') {
                try {
                    // Verify it parses
                    JSON.parse(e.target.result);
                    onImport(e.target.result);
                    onClose();
                } catch (e) {
                    setError("Invalid JSON file.");
                }
            }
        };
        reader.readAsText(file);
        return;
    }

    // 2. Handle PNG Files
    if (file.type.includes('png') || file.name.endsWith('.png')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            if (e.target?.result) {
                const buffer = e.target.result as ArrayBuffer;
                const metadata = readPngMetadata(buffer, "QRPConfig");
                if (metadata) {
                    const decoded = decompressConfig(metadata);
                    if (decoded) {
                        const jsonObj = {
                            sequences: decoded.sequences,
                            timingMs: decoded.timingMs
                        };
                        onImport(JSON.stringify(jsonObj));
                        onClose();
                    } else {
                        setError("Could not parse configuration from PNG.");
                    }
                } else {
                    setError("No QRP configuration found in this image.");
                }
            }
        };
        reader.readAsArrayBuffer(file);
        return;
    }

    setError("Supported formats: PNG (Card) or JSON (Config).");
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          processFile(e.dataTransfer.files[0]);
      }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          processFile(e.target.files[0]);
      }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 relative">
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
            <X size={20} />
        </button>

        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Load Configuration</h2>
        
        {/* File Drop Zone */}
        <div 
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`w-full h-24 mb-4 border-2 border-dashed rounded-lg flex flex-col items-center justify-center transition-colors cursor-pointer ${
                isDragging 
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                : 'border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
        >
            <label className="flex flex-col items-center cursor-pointer w-full h-full justify-center">
                <input type="file" accept="image/png,application/json" className="hidden" onChange={handleFileInput} />
                <div className="flex gap-2 mb-2">
                    <FileImage className={isDragging ? 'text-blue-500' : 'text-slate-400'} size={24} />
                    <FileJson className={isDragging ? 'text-blue-500' : 'text-slate-400'} size={24} />
                </div>
                <span className="text-xs text-slate-500 font-medium">Drop a QRP PNG Card or JSON Config</span>
            </label>
        </div>

        <div className="flex items-center gap-3 mb-4">
            <hr className="flex-1 border-slate-200 dark:border-slate-800" />
            <span className="text-xs text-slate-400 font-medium">OR PASTE DATA</span>
            <hr className="flex-1 border-slate-200 dark:border-slate-800" />
        </div>

        <textarea
            id="import-textarea"
            value={inputValue}
            onChange={(e) => {
                setInputValue(e.target.value);
                if (error) setError(null);
            }}
            placeholder="Paste URL or JSON content here..."
            className="w-full h-24 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none mb-3"
        />

        {error && <p className="text-red-500 text-xs mb-3">{error}</p>}

        <div className="flex gap-3 justify-end">
            <button
                onClick={handlePasteClipboard}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
            >
                <Clipboard size={16} /> Paste
            </button>
            <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
                <Download size={16} /> Load
            </button>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;