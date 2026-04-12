'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from '@/app/store/useChat';
import { ALL_MODELS } from '@/lib/constants';
import { ChevronDown, Search, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ModelSelector() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { currentModel, setCurrentModel } = useChat();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentModelInfo = ALL_MODELS.find(m => m.modelId === currentModel);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = ALL_MODELS
    .filter(m => m.category === 'chat' || m.category === 'code')
    .filter(m => 
      m.displayName.toLowerCase().includes(search.toLowerCase()) ||
      m.modelId.toLowerCase().includes(search.toLowerCase()) ||
      m.provider.toLowerCase().includes(search.toLowerCase())
    )
    .slice(0, 20);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-sm"
      >
        <span className="text-white/70 truncate max-w-[120px]">
          {currentModelInfo?.displayName || currentModel}
        </span>
        <ChevronDown className={cn('w-3.5 h-3.5 text-white/40 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-[#12121a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
          <div className="p-2 border-b border-white/5">
            <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-white/5">
              <Search className="w-4 h-4 text-white/30" />
              <input
                type="text"
                placeholder="Search models..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 outline-none"
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto py-1">
            {filtered.map((model) => (
              <button
                key={model.modelId}
                onClick={() => {
                  setCurrentModel(model.modelId);
                  setOpen(false);
                  setSearch('');
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 transition-colors text-left',
                  model.modelId === currentModel && 'bg-blue-600/10'
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white/80 truncate">{model.displayName}</span>
                    {model.isFree && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Free
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-white/30 truncate block">{model.provider} &middot; {model.contextWindow > 0 ? `${(model.contextWindow / 1000).toFixed(0)}K ctx` : ''}</span>
                </div>
                {model.modelId === currentModel && (
                  <Check className="w-4 h-4 text-blue-400 shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
