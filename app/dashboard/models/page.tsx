'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ALL_MODELS, MODEL_PROVIDERS, MODEL_CATEGORIES } from '@/lib/constants';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { useChat } from '@/app/store/useChat';
import { Search, MessageSquare, Check, Zap, Eye, Layers, Image, Code2 } from 'lucide-react';
import { formatNumber } from '@/lib/utils';

export default function ModelsPage() {
  const [search, setSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const { currentModel, setCurrentModel } = useChat();

  const filtered = useMemo(() => {
    return ALL_MODELS.filter((m) => {
      if (providerFilter !== 'all' && m.provider !== providerFilter) return false;
      if (categoryFilter !== 'all' && m.category !== categoryFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          m.displayName.toLowerCase().includes(q) ||
          m.modelId.toLowerCase().includes(q) ||
          m.provider.toLowerCase().includes(q) ||
          m.tags.some((t) => t.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [search, providerFilter, categoryFilter]);

  const catIcon: Record<string, any> = {
    chat: MessageSquare,
    code: Code2,
    vision: Eye,
    embedding: Layers,
    image: Image,
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Model Catalog</h1>
        <p className="text-sm text-white/40 mt-1">
          {ALL_MODELS.length} models from {MODEL_PROVIDERS.length}+ providers.
          {filtered.length !== ALL_MODELS.length && ` Showing ${filtered.length} results.`}
        </p>
      </div>

      {/* Search and filters */}
      <div className="space-y-4 mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <Input
            placeholder="Search models..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Tabs value={providerFilter} onValueChange={setProviderFilter}>
            <TabsList className="flex-wrap">
              <TabsTrigger value="all">All Providers</TabsTrigger>
              {MODEL_PROVIDERS.slice(0, 8).map((p) => (
                <TabsTrigger key={p.id} value={p.id}>
                  {p.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <Tabs value={categoryFilter} onValueChange={setCategoryFilter}>
            <TabsList>
              <TabsTrigger value="all">All Types</TabsTrigger>
              {MODEL_CATEGORIES.map((c) => (
                <TabsTrigger key={c.id} value={c.id}>
                  {c.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Model grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.slice(0, 60).map((model, i) => {
          const CatIcon = catIcon[model.category] || MessageSquare;
          const isSelected = model.modelId === currentModel;

          return (
            <motion.div
              key={model.modelId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.02, 0.5) }}
              className={`p-4 rounded-xl glass hover:bg-white/[0.06] transition-all cursor-pointer group ${
                isSelected ? 'ring-1 ring-blue-500/50 bg-blue-600/5' : ''
              }`}
              onClick={() => setCurrentModel(model.modelId)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-white/40 uppercase">
                    {model.provider.slice(0, 2)}
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-white truncate max-w-[180px]">
                      {model.displayName}
                    </h3>
                    <p className="text-[10px] text-white/30">{model.provider}</p>
                  </div>
                </div>
                {isSelected && <Check className="w-4 h-4 text-blue-400 shrink-0" />}
              </div>

              <p className="text-xs text-white/40 mb-3 line-clamp-1">{model.description}</p>

              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline" className="text-[10px] gap-1">
                  <CatIcon className="w-3 h-3" />
                  {model.category}
                </Badge>
                {model.contextWindow > 0 && (
                  <Badge variant="secondary" className="text-[10px]">
                    {formatNumber(model.contextWindow)} ctx
                  </Badge>
                )}
                {model.isFree && (
                  <Badge variant="success" className="text-[10px]">Free</Badge>
                )}
                {model.supportsVision && (
                  <Badge variant="default" className="text-[10px]">Vision</Badge>
                )}
                {model.supportsFunctionCalling && (
                  <Badge variant="default" className="text-[10px]">Tools</Badge>
                )}
              </div>

              <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="sm"
                  variant={isSelected ? 'secondary' : 'default'}
                  className="w-full text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentModel(model.modelId);
                  }}
                >
                  {isSelected ? 'Selected' : 'Use in Chat'}
                </Button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {filtered.length > 60 && (
        <div className="text-center mt-8 text-sm text-white/30">
          Showing 60 of {filtered.length} models. Use search to narrow results.
        </div>
      )}
    </div>
  );
}
