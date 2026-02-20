import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface AccordionItemProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  icon?: React.ElementType;
}

export const AccordionItem: React.FC<AccordionItemProps> = ({ title, children, defaultOpen = false, icon: Icon }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-slate-100 dark:border-slate-800 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-3 px-1 text-left group transition-colors"
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon size={14} className={`text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors ${isOpen ? 'text-blue-500 dark:text-blue-400' : ''}`} />}
          <span className={`text-xs font-semibold tracking-wide uppercase ${isOpen ? 'text-slate-800 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300'}`}>
            {title}
          </span>
        </div>
        {isOpen ? (
          <ChevronDown size={14} className="text-slate-400" />
        ) : (
          <ChevronRight size={14} className="text-slate-300" />
        )}
      </button>
      
      <div 
        className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[500px] opacity-100 mb-4' : 'max-h-0 opacity-0'}`}
      >
        <div className="px-1 pt-1">
          {children}
        </div>
      </div>
    </div>
  );
};