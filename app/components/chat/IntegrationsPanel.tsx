'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useUI } from '@/app/store/useUI';
import { integrations, integrationCategories, type IntegrationCategory } from '@/lib/integrations';
import { X, Layers, Search, ExternalLink, Check } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { useState } from 'react';

const categoryIcons: Record<IntegrationCategory, React.ElementType> = {
  productivity: 'div',
  social: 'div',
  development: 'div',
  design: 'div',
  communication: 'div',
  marketing: 'div',
  finance: 'div',
  data: 'div',
  media: 'div',
  gaming: 'div',
};

export function IntegrationsPanel() {
  const { integrationsPanelOpen, setIntegrationsPanelOpen } = useUI();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<IntegrationCategory | 'all'>('all');

  const filtered = integrations.filter(i => {
    const matchesSearch = !search || 
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'all' || i.category === category;
    return matchesSearch && matchesCategory;
  }).slice(0, 10);

  return (
    <AnimatePresence>
      {integrationsPanelOpen && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="absolute left-0 bottom-full mb-2 w-80 bg-[#12121a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
        >
          <div className="flex items-center justify-between p-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-white font-medium">Integrations</span>
              <Badge variant="secondary" className="text-[10px]">
                {integrations.length} apps
              </Badge>
            </div>
            <button onClick={() => setIntegrationsPanelOpen(false)}>
              <X className="w-4 h-4 text-white/30 hover:text-white" />
            </button>
          </div>

          <div className="p-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
              <input
                type="text"
                placeholder="Search apps..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-7 pr-2 py-1.5 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 outline-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-1 px-2 pb-2">
            <button
              onClick={() => setCategory('all')}
              className={`px-2 py-0.5 text-[10px] rounded-full transition-colors ${
                category === 'all' ? 'bg-purple-500 text-white' : 'bg-white/5 text-white/50'
              }`}
            >
              All
            </button>
            {integrationCategories.slice(0, 4).map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`px-2 py-0.5 text-[10px] rounded-full transition-colors ${
                  category === cat.id ? 'bg-purple-500 text-white' : 'bg-white/5 text-white/50'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="p-2 max-h-64 overflow-y-auto">
            {filtered.map((integration) => (
              <button
                key={integration.id}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors text-left"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs"
                  style={{ backgroundColor: integration.color }}
                >
                  {integration.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/80">{integration.name}</p>
                  <p className="text-[11px] text-white/30 truncate">{integration.description}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="p-3 border-t border-white/5">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-white/50"
              onClick={() => window.location.href = '/dashboard/tools'}
            >
              View all integrations →
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}