import React, { useEffect } from 'react';
import QRPGenerator from './QRPGenerator';
import { X } from 'lucide-react';
import { GeoConfig } from '../types';

interface FullScreenOverlayProps {
  onClose: () => void;
  sequence: number[];
  sequenceName: string;
  sequenceDesc?: string;
  isPlaying: boolean;
  geoConfig: GeoConfig;
  isViewOnly?: boolean;
}

const FullScreenOverlay: React.FC<FullScreenOverlayProps> = ({
  onClose,
  sequence,
  sequenceName,
  sequenceDesc,
  isPlaying,
  geoConfig,
  isViewOnly = false
}) => {
  
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-200 transition-colors">
        {!isViewOnly && (
            <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-slate-100 dark:bg-white/10 rounded-full text-slate-500 dark:text-white hover:bg-slate-200 dark:hover:bg-white/20 transition-colors"
            >
                <X size={24} />
            </button>
        )}
        
        <div className="w-full max-w-2xl bg-transparent flex flex-col items-center justify-center h-full">
             <div className="w-full h-full relative flex items-center justify-center">
                  <QRPGenerator 
                      sequence={sequence} 
                      active={isPlaying}
                      showLabels={false}
                      title={sequenceName}
                      description={sequenceDesc}
                      {...geoConfig}
                  />
             </div>
             
             {/* Only show overlay text if not in frame */}
             {(!geoConfig.showFrame || !geoConfig.frameDoubleTop) && (
                <div className="absolute bottom-10 flex flex-col items-center gap-2 pointer-events-none">
                    <h2 className="text-xl font-light text-slate-900 dark:text-white/80">{sequenceName}</h2>
                </div>
             )}
        </div>
    </div>
  );
};

export default FullScreenOverlay;