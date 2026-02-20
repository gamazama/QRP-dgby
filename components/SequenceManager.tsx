import React, { useRef, useEffect, useState } from 'react';
import SequenceEditor from './SequenceEditor';
import QRPGenerator from './QRPGenerator';
import { RefreshCw, Plus, Trash2, List, GripVertical, Copy, ImageDown, ImageUp, Upload } from 'lucide-react';
import { Sequence } from '../types';
import { compressConfig, decompressConfig } from '../utils/compression';
import { writePngMetadata, readPngMetadata } from '../utils/png';

interface SequenceManagerProps {
  sequences: Sequence[];
  activeId: number;
  isPlaying: boolean;
  onUpdate: (id: number, updates: Partial<Sequence>) => void;
  onReset: () => void;
  onAdd: () => void;
  onDuplicate?: (id: number) => void;
  onDelete: (id: number) => void;
  onSelect: (index: number) => void;
  onReorder?: (from: number, to: number) => void;
  isDarkMode?: boolean;
  onImportSequence?: (seq: Sequence) => void;
}

const SequenceManager: React.FC<SequenceManagerProps> = ({ 
  sequences, 
  activeId, 
  isPlaying, 
  onUpdate, 
  onReset,
  onAdd,
  onDuplicate,
  onDelete,
  onSelect,
  onReorder,
  isDarkMode = false,
  onImportSequence
}) => {
  const activeSequence = sequences.find(s => s.id === activeId);
  const listRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Auto-scroll to active item in the list
  useEffect(() => {
    if (listRef.current) {
        const activeEl = listRef.current.querySelector('[data-active="true"]');
        if (activeEl) {
            activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }
  }, [activeId]);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;
    if (draggedIndex !== index && onReorder) {
        onReorder(draggedIndex, index);
    }
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleExportPng = async () => {
    if (!activeSequence || !exportRef.current) return;
    setIsExporting(true);

    try {
        const svgElement = exportRef.current.querySelector('svg');
        if (!svgElement) throw new Error("SVG not found");

        // 1. Serialize SVG
        const serializer = new XMLSerializer();
        let source = serializer.serializeToString(svgElement);
        
        // --- Safari Fixes ---
        // Ensure Namespace
        if(!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)){
            source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
        }
        
        // Ensure Explicit Dimensions on SVG string for Blob rendering
        // The viewBox is "0 -150 400 700". We want high res.
        // 400 * 2.5 = 1000. 700 * 2.5 = 1750.
        // Let's force strict pixel dims matching the viewBox ratio to avoid Safari confusion.
        if (!source.includes('width=')) {
             source = source.replace('<svg', '<svg width="400" height="700"');
        }

        // 2. Prepare Canvas
        const canvas = document.createElement('canvas');
        // We want a square card export (1000x1000)
        const EXPORT_SIZE = 1000;
        canvas.width = EXPORT_SIZE;
        canvas.height = EXPORT_SIZE;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Background
        ctx.fillStyle = isDarkMode ? "#0f172a" : "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 3. Create Image from Blob
        const img = new Image();
        const svgBlob = new Blob([source], {type: "image/svg+xml;charset=utf-8"});
        const url = URL.createObjectURL(svgBlob);

        img.onload = async () => {
            // 4. Calculate Aspect Ratio Preserving Draw
            // SVG is 400x700 (approx 0.57 aspect)
            // Canvas is 1000x1000 (1.0 aspect)
            // We want to center the 4:7 image in the 1:1 square.
            
            const svgAspect = 400 / 700;
            const targetHeight = EXPORT_SIZE * 0.9; // 90% height padding
            const targetWidth = targetHeight * svgAspect;
            
            const xOffset = (EXPORT_SIZE - targetWidth) / 2;
            const yOffset = (EXPORT_SIZE - targetHeight) / 2;

            ctx.drawImage(img, xOffset, yOffset, targetWidth, targetHeight);
            
            // 5. Get PNG & Inject Metadata
            canvas.toBlob(async (blob) => {
                if (!blob) return;
                
                const configString = compressConfig(activeSequence.geoConfig, [activeSequence]);
                const buffer = await blob.arrayBuffer();
                const taggedBlob = writePngMetadata(buffer, "QRPConfig", configString);

                const downloadUrl = URL.createObjectURL(taggedBlob);
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = `${activeSequence.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(downloadUrl);
                URL.revokeObjectURL(url);
                setIsExporting(false);
            }, 'image/png');
        };
        
        // Trigger load
        img.src = url;

    } catch (e) {
        console.error("Export failed", e);
        alert("Failed to create image.");
        setIsExporting(false);
    }
  };

  const handleImportClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onload = (ev) => {
              if (ev.target?.result && onImportSequence) {
                  const buffer = ev.target.result as ArrayBuffer;
                  const metadata = readPngMetadata(buffer, "QRPConfig");
                  if (metadata) {
                      const decoded = decompressConfig(metadata);
                      if (decoded && decoded.sequences.length > 0) {
                          // Import all sequences found in the card (usually 1)
                          decoded.sequences.forEach(seq => {
                              onImportSequence(seq);
                          });
                      } else {
                          alert("Invalid configuration found in image.");
                      }
                  } else {
                      alert("No QRP configuration found in this image.");
                  }
              }
          };
          reader.readAsArrayBuffer(file);
      }
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex flex-col gap-4 h-full">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <List size={16} className="text-slate-500" />
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Sequence</h2>
                <span className="text-xs font-mono bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded-full">{sequences.length}</span>
            </div>
            <button 
                onClick={onReset}
                className="text-xs flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
                <RefreshCw size={12} /> Reset
            </button>
        </div>

        {/* Sequence List */}
        <div 
            ref={listRef}
            className="flex flex-col gap-1 max-h-40 overflow-y-auto bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-200 dark:border-slate-800 p-1 custom-scrollbar"
        >
            {sequences.map((seq, index) => {
                const isActive = seq.id === activeId;
                const isDragging = draggedIndex === index;

                return (
                    <div
                        key={seq.id}
                        data-active={isActive}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDrop={(e) => handleDrop(e, index)}
                        onDragEnd={handleDragEnd}
                        className={`flex items-center gap-1 p-1 pr-2 rounded-md transition-all border ${
                            isActive 
                            ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm' 
                            : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/50'
                        } ${isDragging ? 'opacity-40 border-dashed border-slate-400' : ''}`}
                    >
                         {/* Drag Handle */}
                         <div className="cursor-grab active:cursor-grabbing text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 p-1 flex-shrink-0">
                            <GripVertical size={14} />
                         </div>

                         {/* Editable Card Name */}
                         <input
                            type="text"
                            value={seq.name}
                            onChange={(e) => onUpdate(seq.id, { name: e.target.value })}
                            onFocus={() => onSelect(index)}
                            className={`flex-1 bg-transparent border-none outline-none text-xs font-medium truncate py-1 min-w-0 ${
                                isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'
                            }`}
                        />

                        {isActive && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />}
                    </div>
                );
            })}
        </div>
        
        <button 
            onClick={onAdd}
            className="w-full py-2 flex items-center justify-center gap-2 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg text-slate-500 dark:text-slate-400 hover:border-blue-400 hover:text-blue-500 dark:hover:border-blue-500 dark:hover:text-blue-400 transition-colors text-xs font-medium"
        >
            <Plus size={14} /> Add New Card
        </button>

        <hr className="border-slate-100 dark:border-slate-800" />

        {/* Active Editor */}
        {activeSequence && (
            <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <SequenceEditor 
                    id={activeSequence.id}
                    name={activeSequence.name}
                    description={activeSequence.description}
                    sequence={activeSequence.data}
                    onChange={(updates) => onUpdate(activeSequence.id, updates)}
                />
                
                {/* Editor Footer Actions / Preview Tools */}
                <div className="grid grid-cols-2 gap-3 mt-2 mb-2">
                    {onImportSequence && (
                        <>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleFileChange} 
                                accept="image/png" 
                                className="hidden" 
                            />
                            <button
                                onClick={handleImportClick}
                                className="flex items-center justify-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                title="Import Card"
                            >
                                <Upload size={16} /> Import
                            </button>
                        </>
                    )}

                    <button
                        onClick={handleExportPng}
                        disabled={isExporting}
                        className="flex items-center justify-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        title="Save PNG"
                    >
                        <ImageDown size={16} /> Save Card
                    </button>

                    {onDuplicate && (
                        <button
                            onClick={() => onDuplicate(activeSequence.id)}
                            className="flex items-center justify-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
                            <Copy size={16} /> Duplicate
                        </button>
                    )}

                    {sequences.length > 1 && (
                        <button 
                            onClick={() => onDelete(activeSequence.id)}
                            className="flex items-center justify-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border-red-100 dark:border-red-900/30"
                        >
                            <Trash2 size={16} /> Delete
                        </button>
                    )}
                </div>

                {/* Small Preview (Only for UI) */}
                <div 
                    ref={previewRef}
                    className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 flex justify-center border border-slate-200/50 dark:border-slate-700/50 relative overflow-hidden"
                >
                     <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#444_1px,transparent_1px)] [background-size:8px_8px]" />
                    <QRPGenerator 
                        sequence={activeSequence.data} 
                        size={220} 
                        className="" 
                        showLabels={false}
                        active={isPlaying && activeSequence.id === activeId}
                        title={activeSequence.name} // Pass Title
                        description={activeSequence.description} // Pass Description
                        // Spread active config directly!
                        {...activeSequence.geoConfig}
                        // Explicit override if needed for specific preview styling (none needed here as we want WYSIWYG)
                    />
                </div>
                
                {/* Hidden High-Res Export Generator */}
                <div 
                    ref={exportRef} 
                    style={{ position: 'absolute', top: -9999, left: -9999, width: 1000, height: 1000, pointerEvents: 'none' }}
                >
                    <QRPGenerator 
                        sequence={activeSequence.data} 
                        size={1000}
                        showLabels={false} 
                        active={false}
                        title={activeSequence.name}
                        description={activeSequence.description}
                        exportMode={true} 
                        exportTheme={isDarkMode ? 'dark' : 'light'} // Dynamic Export Theme
                        {...activeSequence.geoConfig}
                    />
                </div>

            </div>
        )}
    </div>
  );
};

export default SequenceManager;