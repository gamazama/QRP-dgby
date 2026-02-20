import React from 'react';
import { Activity, Sun, Moon, Maximize, Settings2, Link, Download, Save } from 'lucide-react';

interface HeaderProps {
  isDarkMode: boolean;
  toggleTheme: () => void;
  toggleFullScreen: () => void;
  toggleEditor: () => void;
  showEditor: boolean;
  onShare: () => void;
  onImport: () => void;
  onSave: () => void;
  isViewOnly: boolean;
}

const Header: React.FC<HeaderProps> = ({ 
  isDarkMode, 
  toggleTheme, 
  toggleFullScreen, 
  toggleEditor, 
  showEditor,
  onShare,
  onImport,
  onSave,
  isViewOnly
}) => {
  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm transition-colors duration-300">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-slate-900 dark:bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-slate-900/20 dark:shadow-blue-900/20">
          <Activity size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white hidden sm:block">QRP Generator</h1>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:hidden">QRP Generator</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium tracking-wide hidden sm:block">Quantum Field Visualizer</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2 sm:gap-3">
           {/* Import Button */}
           <button
              onClick={onImport}
              className="p-2 sm:px-3 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
              title="Import from URL or JSON"
           >
              <Download size={18} />
              <span className="hidden sm:inline text-sm font-medium">Load</span>
           </button>

           {/* Save Button (JSON) */}
           <button
              onClick={onSave}
              className="p-2 sm:px-3 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
              title="Save Configuration as JSON"
           >
              <Save size={18} />
              <span className="hidden sm:inline text-sm font-medium">Save</span>
           </button>

           {/* Share Button (URL) */}
           <button
              onClick={onShare}
              className="p-2 sm:px-3 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
              title="Share Configuration (Copy URL)"
           >
              <Link size={18} />
              <span className="hidden sm:inline text-sm font-medium">Share</span>
           </button>

           <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block"></div>

           <button
              onClick={toggleTheme}
              className="p-2 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Toggle Theme"
           >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
           </button>
           
           {!isViewOnly && (
               <>
                <button 
                    onClick={toggleFullScreen}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 md:hidden"
                >
                    <Maximize size={18} />
                </button>
                <button 
                    onClick={toggleEditor}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        showEditor 
                        ? 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200' 
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                >
                    <Settings2 size={16} />
                    <span className="hidden sm:inline">Configuration</span>
                </button>
               </>
           )}
      </div>
    </header>
  );
};

export default Header;