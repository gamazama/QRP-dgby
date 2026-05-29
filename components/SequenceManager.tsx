import React, { useRef, useEffect, useState } from 'react';
import SequenceEditor from './SequenceEditor';
import QRPGenerator from './QRPGenerator';
import VideoExportModal from './VideoExportModal';
import { RefreshCw, Plus, Trash2, List, GripVertical, ChevronUp, ChevronDown, Copy, ImageDown, Images, Image as ImageIcon, Upload, Film, Contrast, Frame, LayoutGrid } from 'lucide-react';
import { Sequence } from '../types';
import { compressConfig, decompressConfig } from '../utils/compression';
import { writePngMetadata, readPngMetadata } from '../utils/png';
import { useToast } from './ui/Toast';
import { lobeIcon, lobeColorClass } from './icons/LobeIcons';
import LibraryModal from './LibraryModal';
import { libraryImageUrl } from '../utils/library';

interface SequenceManagerProps {
  sequences: Sequence[];
  activeId: number;
  isPlaying: boolean;
  timingMs: number;
  onSetTimingMs?: (ms: number) => void;
  onUpdate: (id: number, updates: Partial<Sequence>) => void;
  onReset: () => void;
  onAdd: () => void;
  onDuplicate?: (id: number) => void;
  onDelete: (id: number) => void;
  onSelect: (index: number) => void;
  onReorder?: (from: number, to: number) => void;
  isDarkMode?: boolean;
  onImportSequence?: (seq: Sequence) => void;
  onAddImageSequences?: (images: { src: string; name?: string }[]) => void;
  onSetSequenceLength?: (length: number) => void;
}

const SequenceManager: React.FC<SequenceManagerProps> = ({
  sequences,
  activeId,
  isPlaying,
  timingMs,
  onSetTimingMs,
  onUpdate,
  onReset,
  onAdd,
  onDuplicate,
  onDelete,
  onSelect,
  onReorder,
  isDarkMode = false,
  onImportSequence,
  onAddImageSequences,
  onSetSequenceLength
}) => {
  const { showToast } = useToast();
  const activeSequence = sequences.find(s => s.id === activeId);
  const listRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [showVideoExport, setShowVideoExport] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);

  // Auto-scroll to active item — only when it's actually outside the list's
  // own viewport, so playback (which advances activeId every beat) doesn't
  // smooth-scroll the panel on every card.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const activeEl = list.querySelector<HTMLElement>('[data-active="true"]');
    if (!activeEl) return;
    const above = activeEl.offsetTop < list.scrollTop;
    const below = activeEl.offsetTop + activeEl.offsetHeight > list.scrollTop + list.clientHeight;
    if (above || below) {
        activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [activeId]);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;
    if (draggedIndex !== index && onReorder) {
        onReorder(draggedIndex, index);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
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

            // Dark-mode image inversion is baked into the serialized SVG (an
            // feColorMatrix filter on the <image> when exportTheme is dark and
            // the card opts in), so no canvas filter is needed here.
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
                showToast('Card saved as PNG', { type: 'success' });
            }, 'image/png');
        };

        // Trigger load
        img.src = url;

    } catch (e) {
        console.error("Export failed", e);
        showToast('Could not create the image', { type: 'error' });
        setIsExporting(false);
    }
  };

  const handleImportClick = () => {
      fileInputRef.current?.click();
  };

  const handleImageClick = () => {
      imageInputRef.current?.click();
  };

  // Unified image load. One image replaces the active card's geometry;
  // multiple images are each added as a new card.
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const target = e.target;
      const files: File[] = target.files ? Array.from(target.files) : [];
      if (files.length === 0) {
          target.value = '';
          return;
      }

      const readFile = (file: File) =>
          new Promise<{ src: string; name?: string } | null>((resolve) => {
              const reader = new FileReader();
              reader.onload = (ev) => {
                  if (typeof ev.target?.result === 'string') {
                      // Strip the extension to use the filename as the card name.
                      const name = file.name.replace(/\.[^.]+$/, '');
                      resolve({ src: ev.target.result, name });
                  } else {
                      resolve(null);
                  }
              };
              reader.onerror = () => resolve(null);
              reader.readAsDataURL(file);
          });

      // Reading data URLs (especially several large files) isn't instant —
      // show a pending state so the click doesn't feel ignored.
      setIsLoadingImages(true);
      const done = () => {
          setIsLoadingImages(false);
          // Reset input so re-selecting the same file(s) fires onChange again.
          target.value = '';
      };

      if (files.length === 1 && activeSequence) {
          // Single image: replace the active card's image in place.
          readFile(files[0]).then((img) => {
              if (img) {
                  onUpdate(activeSequence.id, { imageSrc: img.src });
                  showToast('Image set on this card', { type: 'success' });
              } else {
                  showToast('Could not read the selected image', { type: 'error' });
              }
          }).finally(done);
      } else if (onAddImageSequences) {
          // Multiple images: add one new card each (selection order preserved).
          Promise.all(files.map(readFile)).then((results) => {
              const images = results.filter((r): r is { src: string; name?: string } => r !== null);
              if (images.length > 0) {
                  onAddImageSequences(images);
                  showToast(`Added ${images.length} image card${images.length === 1 ? '' : 's'}`, { type: 'success' });
              } else {
                  showToast('Could not read the selected image(s)', { type: 'error' });
              }
          }).finally(done);
      } else {
          done();
      }
  };

  const handleRemoveImage = () => {
      if (activeSequence) onUpdate(activeSequence.id, { imageSrc: undefined });
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
                          showToast(`Imported ${decoded.sequences.length} card${decoded.sequences.length === 1 ? '' : 's'}`, { type: 'success' });
                      } else {
                          showToast('No valid configuration in that image', { type: 'error' });
                      }
                  } else {
                      showToast('No QRP configuration found in this image', { type: 'error' });
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
            className="flex flex-col gap-1 max-h-72 overflow-y-auto bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-200 dark:border-slate-800 p-1 custom-scrollbar"
        >
            {sequences.map((seq, index) => {
                const isActive = seq.id === activeId;
                const isDragging = draggedIndex === index;
                const isDropTarget = dragOverIndex === index && draggedIndex !== null && draggedIndex !== index;
                // Image cards show an image glyph; pattern cards show their lobe-type glyph.
                const RowIcon = seq.imageSrc ? ImageIcon : lobeIcon(seq.geoConfig.lobeType);
                const rowIconColor = seq.imageSrc ? 'text-slate-400 dark:text-slate-500' : lobeColorClass(seq.geoConfig.lobeType);

                return (
                    <div
                        key={seq.id}
                        data-active={isActive}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDrop={(e) => handleDrop(e, index)}
                        onDragEnd={handleDragEnd}
                        className={`group relative flex items-center gap-1 p-1 pr-2 rounded-md transition-all border cursor-grab active:cursor-grabbing ${
                            isActive
                            ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm'
                            : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/50'
                        } ${isDragging ? 'opacity-70 scale-[1.02] shadow-lg ring-1 ring-blue-400/60 z-10 bg-white dark:bg-slate-800' : ''} ${
                            isDropTarget ? 'before:absolute before:-top-0.5 before:inset-x-1 before:h-0.5 before:bg-blue-500 before:rounded-full' : ''
                        }`}
                    >
                         {/* Drag Handle */}
                         <div className="cursor-grab active:cursor-grabbing text-slate-400 dark:text-slate-500 opacity-80 group-hover:opacity-100 transition-opacity p-1 flex-shrink-0" aria-hidden="true" title="Drag to reorder">
                            <GripVertical size={14} />
                         </div>

                         {/* Index number — matches the numbered tabs in the player */}
                         <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 w-4 text-right flex-shrink-0 tabular-nums select-none">{index + 1}</span>

                         {/* Type glyph — sunflower / lotus / dharma, or an image card */}
                         <RowIcon size={15} className={`flex-shrink-0 ${rowIconColor}`} />

                         {/* Editable Card Name */}
                         <input
                            type="text"
                            value={seq.name}
                            onChange={(e) => onUpdate(seq.id, { name: e.target.value })}
                            onFocus={() => onSelect(index)}
                            aria-label={`Card ${index + 1} name`}
                            placeholder={`Card ${index + 1}`}
                            className={`flex-1 bg-transparent border-none outline-none text-xs font-medium truncate py-1 min-w-0 ${
                                isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'
                            }`}
                        />

                        {/* Keyboard/touch reorder — works without drag-and-drop */}
                        {onReorder && (
                            <div className="flex flex-col flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => onReorder(index, index - 1)}
                                    disabled={index === 0}
                                    aria-label={`Move card ${index + 1} up`}
                                    title="Move up"
                                    className="text-slate-400 hover:text-blue-500 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors leading-none"
                                >
                                    <ChevronUp size={12} />
                                </button>
                                <button
                                    onClick={() => onReorder(index, index + 1)}
                                    disabled={index === sequences.length - 1}
                                    aria-label={`Move card ${index + 1} down`}
                                    title="Move down"
                                    className="text-slate-400 hover:text-blue-500 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors leading-none"
                                >
                                    <ChevronDown size={12} />
                                </button>
                            </div>
                        )}

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

        {/* Playback timing — co-located with the cards it sequences */}
        {onSetTimingMs && (
            <div className="flex items-center gap-3">
                <label htmlFor="card-timing" className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">Each card</label>
                <input
                    id="card-timing"
                    type="range"
                    min={200}
                    max={30000}
                    step={100}
                    value={timingMs}
                    onChange={(e) => onSetTimingMs(Number(e.target.value))}
                    aria-valuetext={`${(timingMs / 1000).toFixed(1)} seconds`}
                    className="flex-1 min-w-0 accent-blue-600 dark:accent-blue-500"
                />
                <span className="text-xs font-mono text-slate-700 dark:text-slate-300 w-12 text-right tabular-nums">{(timingMs / 1000).toFixed(1)}s</span>
            </div>
        )}

        <hr className="border-slate-100 dark:border-slate-800" />

        {/* Active Editor */}
        {activeSequence && (
            <div className="flex flex-col gap-2 animate-in">
                <SequenceEditor
                    name={activeSequence.name}
                    description={activeSequence.description}
                    sequence={activeSequence.data}
                    onChange={(updates) => onUpdate(activeSequence.id, updates)}
                    onSetLength={onSetSequenceLength}
                />
                
                {/* Editor Footer Actions — grouped by intent (content / card / export)
                    so related actions cluster and the layout never reflows. */}
                <div className="flex flex-col gap-3 mt-2 mb-2">
                    {/* Hidden file inputs */}
                    {onImportSequence && (
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/png"
                            className="hidden"
                        />
                    )}
                    <input
                        type="file"
                        ref={imageInputRef}
                        onChange={handleImageChange}
                        accept="image/*"
                        multiple
                        className="hidden"
                    />

                    {/* CONTENT: what fills this card */}
                    <div>
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold mb-1.5">Content</p>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={handleImageClick}
                                disabled={isLoadingImages}
                                className="flex items-center justify-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                title="Pick one image to use for this card, or several to add as new cards"
                            >
                                {isLoadingImages ? (
                                    <><RefreshCw size={16} className="animate-spin" /> Loading…</>
                                ) : (
                                    <><Images size={16} /> {activeSequence.imageSrc ? "Replace / Add Images" : "Use Images"}</>
                                )}
                            </button>

                            <button
                                onClick={() => setShowLibrary(true)}
                                className="flex items-center justify-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                title="Add cards from the curated resource library"
                            >
                                <LayoutGrid size={16} /> Browse Library
                            </button>

                            {activeSequence.imageSrc && (
                                <button
                                    onClick={handleRemoveImage}
                                    className="flex items-center justify-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-amber-100 dark:border-amber-900/30 rounded-lg text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                                    title="Remove image and restore the generated geometry"
                                >
                                    <RefreshCw size={16} /> Remove Image
                                </button>
                            )}

                            {onImportSequence && (
                                <button
                                    onClick={handleImportClick}
                                    className="flex items-center justify-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                    title="Import a card from a QRP PNG"
                                >
                                    <Upload size={16} /> Import Card
                                </button>
                            )}
                        </div>

                        {/* Image-card display options */}
                        {activeSequence.imageSrc && (
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                {/* Baked theme-pair cards handle dark mode themselves. */}
                                {!activeSequence.imageSrcDark && (
                                    <button
                                        onClick={() => onUpdate(activeSequence.id, { imageInvert: activeSequence.imageInvert === false })}
                                        aria-pressed={activeSequence.imageInvert !== false}
                                        title="Invert this image in dark mode (for black-line art)"
                                        className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                                            activeSequence.imageInvert !== false
                                                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                                        }`}
                                    >
                                        <Contrast size={16} /> Invert (dark)
                                    </button>
                                )}
                                <button
                                    onClick={() => onUpdate(activeSequence.id, { imageFrame: !activeSequence.imageFrame })}
                                    aria-pressed={!!activeSequence.imageFrame}
                                    title="Draw a frame around the image"
                                    className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                                        activeSequence.imageFrame
                                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    <Frame size={16} /> Frame
                                </button>
                            </div>
                        )}
                    </div>

                    {/* CARD: manage this card */}
                    <div>
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold mb-1.5">Card</p>
                        <div className="grid grid-cols-2 gap-2">
                            {onDuplicate && (
                                <button
                                    onClick={() => onDuplicate(activeSequence.id)}
                                    className="flex items-center justify-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                >
                                    <Copy size={16} /> Duplicate
                                </button>
                            )}
                            <button
                                onClick={() => onDelete(activeSequence.id)}
                                disabled={sequences.length <= 1}
                                title={sequences.length <= 1 ? "Can't delete the only card" : "Delete this card"}
                                className="flex items-center justify-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-red-100 dark:border-red-900/30 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Trash2 size={16} /> Delete
                            </button>
                        </div>
                    </div>

                    {/* EXPORT: get this card / sequence out */}
                    <div>
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold mb-1.5">Export</p>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={handleExportPng}
                                disabled={isExporting}
                                className="flex items-center justify-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                title="Save this card as a PNG"
                            >
                                {isExporting ? (
                                    <><RefreshCw size={16} className="animate-spin" /> Saving…</>
                                ) : (
                                    <><ImageDown size={16} /> Save Card</>
                                )}
                            </button>

                            <button
                                onClick={() => setShowVideoExport(true)}
                                className="flex items-center justify-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                title="Export the whole sequence as a video"
                            >
                                <Film size={16} /> Export Video
                            </button>
                        </div>
                    </div>
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
                        imageSrc={activeSequence.imageSrc}
                        imageSrcDark={activeSequence.imageSrcDark}
                        imageInvert={activeSequence.imageInvert}
                        imageFrame={activeSequence.imageFrame}
                    />
                </div>

            </div>
        )}

        {/* Video Export Modal */}
        <VideoExportModal
            isOpen={showVideoExport}
            onClose={() => setShowVideoExport(false)}
            sequences={sequences}
            timingMs={timingMs}
            isDarkMode={isDarkMode}
        />

        {/* Resource Library — add curated cards as image cards */}
        {showLibrary && (
            <LibraryModal
                mode="cards"
                onClose={() => setShowLibrary(false)}
                onAddCards={(cards) =>
                    onAddImageSequences?.(cards.map(c => ({
                        src: libraryImageUrl(c.file),
                        srcDark: c.fileDark ? libraryImageUrl(c.fileDark) : undefined,
                        name: c.name,
                    })))
                }
            />
        )}
    </div>
  );
};

export default SequenceManager;