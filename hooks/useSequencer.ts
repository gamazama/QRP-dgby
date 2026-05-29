import { useState, useEffect, useRef } from 'react';
import { DEFAULT_SEQUENCES, SUNFLOWER_PRESET } from '../constants';
import { Sequence, GeoConfig } from '../types';

// Next free card id (max existing + 1).
const nextSeqId = (seqs: Sequence[]) =>
  seqs.length > 0 ? Math.max(...seqs.map(s => s.id)) + 1 : 1;

export const useSequencer = () => {
  const [sequences, setSequences] = useState<Sequence[]>(DEFAULT_SEQUENCES);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timingMs, setTimingMs] = useState(1500);
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Undo history for destructive actions (delete / reset). Snapshot is taken
  // before the mutation; undo() restores the most recent one.
  const historyRef = useRef<{ sequences: Sequence[]; activeIndex: number }[]>([]);
  const snapshot = () => {
    historyRef.current.push({ sequences, activeIndex });
    if (historyRef.current.length > 20) historyRef.current.shift();
  };
  const undo = () => {
    const snap = historyRef.current.pop();
    if (!snap) return;
    setSequences(snap.sequences);
    setActiveIndex(snap.activeIndex);
    setIsPlaying(false);
  };

  // Animation Loop
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setActiveIndex((prev) => (prev + 1) % sequences.length);
      }, timingMs);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, timingMs, sequences.length]);

  const handleSequenceUpdate = (id: number, updates: Partial<Sequence>) => {
    setSequences(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  // Resize a specific sequence's data array to match a new length
  const resizeSequence = (id: number, length: number) => {
    setSequences(prev => prev.map(seq => {
        if (seq.id !== id) return seq;
        if (seq.data.length === length) return seq;

        let newData;
        if (seq.data.length > length) {
            // Trim
            newData = seq.data.slice(0, length);
        } else {
            // Pad with zeros
            const diff = length - seq.data.length;
            newData = [...seq.data, ...new Array(diff).fill(0)];
        }
        return { ...seq, data: newData };
    }));
  };

  const addSequence = () => {
    const newId = nextSeqId(sequences);
    // Clone configuration from the currently active sequence for continuity
    const activeSeq = sequences[activeIndex] || sequences[0];
    const baseConfig = activeSeq ? { ...activeSeq.geoConfig } : { ...SUNFLOWER_PRESET };
    
    // Ensure data length matches the config
    const seqLength = baseConfig.sequenceLength;
    
    const newSeq: Sequence = {
        id: newId,
        name: `Card ${newId}`,
        description: "New sequence pattern",
        data: new Array(seqLength).fill(0),
        geoConfig: baseConfig
    };
    
    const newSequences = [...sequences, newSeq];
    setSequences(newSequences);
    // Select the new sequence
    setActiveIndex(newSequences.length - 1);
    setIsPlaying(false);
  };

  const importSequence = (importedSeq: Sequence) => {
      const newId = nextSeqId(sequences);

      const newSeq: Sequence = {
          ...importedSeq,
          id: newId,
          // If name collides? we just append (Copy) or keep original? 
          // Keeping original name is usually better for imports.
      };

      const newSequences = [...sequences, newSeq];
      setSequences(newSequences);
      setActiveIndex(newSequences.length - 1);
      setIsPlaying(false);
  };

  // Add one new card per supplied image (data URL). Each card renders the
  // image instead of generated geometry. Cloned geoConfig from the active
  // sequence keeps frame/length consistent for export. Appended in a single
  // state update (a forEach over importSequence would read stale `sequences`).
  const addImageSequences = (images: { src: string; name?: string }[]) => {
      if (images.length === 0) return;

      setSequences(prev => {
          let nextId = nextSeqId(prev);
          const activeSeq = prev[activeIndex] || prev[0];
          const baseConfig = activeSeq ? { ...activeSeq.geoConfig } : { ...SUNFLOWER_PRESET };
          const seqLength = baseConfig.sequenceLength;

          const newCards: Sequence[] = images.map(({ src, name }) => ({
              id: nextId++,
              name: name && name.trim() ? name : `Card ${nextId - 1}`,
              description: 'Image card',
              data: new Array(seqLength).fill(0),
              geoConfig: { ...baseConfig },
              imageSrc: src,
          }));

          const merged = [...prev, ...newCards];
          // Select the first newly added card.
          setActiveIndex(prev.length);
          return merged;
      });
      setIsPlaying(false);
  };

  const duplicateSequence = (id: number) => {
      const sourceSeq = sequences.find(s => s.id === id);
      if (!sourceSeq) return;

      const newId = nextSeqId(sequences);

      const newSeq: Sequence = {
          ...sourceSeq,
          id: newId,
          name: `${sourceSeq.name} (Copy)`,
          // Deep copy arrays and objects
          data: [...sourceSeq.data],
          geoConfig: { ...sourceSeq.geoConfig }
      };

      const newSequences = [...sequences, newSeq];
      setSequences(newSequences);
      setActiveIndex(newSequences.length - 1);
      setIsPlaying(false);
  };

  const deleteSequence = (id: number) => {
    if (sequences.length <= 1) return; // Prevent deleting the last one

    const idxToDelete = sequences.findIndex(s => s.id === id);
    if (idxToDelete === -1) return;

    snapshot();

    const newSequences = sequences.filter(s => s.id !== id);
    setSequences(newSequences);

    // If we deleted the active sequence, or a sequence before it, we need to adjust activeIndex
    // If the index was the last one, move back one.
    if (activeIndex >= newSequences.length) {
        setActiveIndex(Math.max(0, newSequences.length - 1));
    } else if (idxToDelete < activeIndex) {
        // If we deleted something before the current one, shift index left
        setActiveIndex(activeIndex - 1);
    }
  };

  const reorderSequences = (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return;

      const activeId = sequences[activeIndex].id;
      const newSequences = [...sequences];
      const [moved] = newSequences.splice(fromIndex, 1);
      newSequences.splice(toIndex, 0, moved);
      
      setSequences(newSequences);
      
      // Keep the active sequence selected even if it moved
      const newActiveIndex = newSequences.findIndex(s => s.id === activeId);
      if (newActiveIndex !== -1) {
          setActiveIndex(newActiveIndex);
      }
  };

  const resetSequences = () => {
      snapshot();
      setSequences(DEFAULT_SEQUENCES);
      setActiveIndex(0);
      setIsPlaying(false);
  };

  const loadSequences = (newSequences: Sequence[]) => {
      setSequences(newSequences);
      setActiveIndex(0);
      setIsPlaying(false); // Let the caller decide if they want to start playing
  };
  
  const togglePlay = () => setIsPlaying(prev => !prev);
  const setPlaying = (playing: boolean) => setIsPlaying(playing);

  const selectSequence = (index: number) => {
    setIsPlaying(false);
    setActiveIndex(index);
  };

  return {
    sequences,
    activeIndex,
    activeSequence: sequences[activeIndex] || sequences[0],
    isPlaying,
    setPlaying,
    timingMs,
    setTimingMs,
    updateSequence: handleSequenceUpdate,
    resizeSequence,
    addSequence,
    importSequence,
    addImageSequences,
    duplicateSequence,
    deleteSequence,
    reorderSequences,
    resetSequences,
    loadSequences,
    togglePlay,
    selectSequence,
    undo
  };
};