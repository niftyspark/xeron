'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useMemory } from '@/app/hooks/useMemory';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Textarea } from '@/app/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/app/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Brain, Plus, Search, Trash2, Star, Clock, Eye } from 'lucide-react';

const categoryColors: Record<string, string> = {
  fact: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  preference: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  learned: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  episodic: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
};

export default function MemoryPage() {
  const { memories, loading, fetchMemories, addMemory, deleteMemory } = useMemory();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [newMemory, setNewMemory] = useState({ category: 'fact', content: '', importance: 0.5 });

  useEffect(() => {
    fetchMemories(activeCategory === 'all' ? undefined : activeCategory);
  }, [activeCategory, fetchMemories]);

  const filtered = memories.filter((m) =>
    m.content.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: memories.length,
    facts: memories.filter((m) => m.category === 'fact').length,
    preferences: memories.filter((m) => m.category === 'preference').length,
    learned: memories.filter((m) => m.category === 'learned').length,
  };

  const handleAdd = async () => {
    if (!newMemory.content) return;
    const result = await addMemory(newMemory.category, newMemory.content, newMemory.importance);
    if (result) {
      setShowAdd(false);
      setNewMemory({ category: 'fact', content: '', importance: 0.5 });
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Memory</h1>
          <p className="text-sm text-white/40 mt-1">
            XERON&apos;s persistent memory — what it remembers about you
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Memory
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total', value: stats.total, color: 'text-white' },
          { label: 'Facts', value: stats.facts, color: 'text-blue-400' },
          { label: 'Preferences', value: stats.preferences, color: 'text-purple-400' },
          { label: 'Learned', value: stats.learned, color: 'text-emerald-400' },
        ].map((stat) => (
          <div key={stat.label} className="p-4 rounded-xl glass text-center">
            <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-white/40">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <Input
            placeholder="Search memories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="fact">Facts</TabsTrigger>
            <TabsTrigger value="preference">Preferences</TabsTrigger>
            <TabsTrigger value="learned">Learned</TabsTrigger>
            <TabsTrigger value="episodic">Episodic</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Memory list */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <Brain className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white/60 mb-2">No memories yet</h3>
          <p className="text-sm text-white/30">XERON will remember important information from your conversations</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((memory, i) => (
            <motion.div
              key={memory.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="p-4 rounded-xl glass hover:bg-white/[0.06] transition-all group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={categoryColors[memory.category] || ''}>
                      {memory.category}
                    </Badge>
                    <div className="flex items-center gap-1 text-amber-400/60">
                      <Star className="w-3 h-3" />
                      <span className="text-[10px]">{((memory.importance || 0.5) * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  <p className="text-sm text-white/70">{memory.content}</p>
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-white/20">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {memory.accessCount || 0} views
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(memory.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => deleteMemory(memory.id)}
                  className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Memory Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Memory</DialogTitle>
            <DialogDescription>
              Manually add something for XERON to remember
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm text-white/60 mb-2 block">Category</label>
              <div className="flex gap-2">
                {['fact', 'preference', 'learned', 'episodic'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setNewMemory({ ...newMemory, category: cat })}
                    className={`px-3 py-1.5 rounded-lg text-xs capitalize transition-colors ${
                      newMemory.category === cat
                        ? categoryColors[cat] + ' border'
                        : 'bg-white/5 text-white/40 border border-white/10'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm text-white/60 mb-1 block">Content</label>
              <Textarea
                placeholder="What should XERON remember?"
                value={newMemory.content}
                onChange={(e) => setNewMemory({ ...newMemory, content: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm text-white/60 mb-1 block">
                Importance: {(newMemory.importance * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={newMemory.importance}
                onChange={(e) => setNewMemory({ ...newMemory, importance: parseFloat(e.target.value) })}
                className="w-full accent-blue-600"
              />
            </div>
            <Button onClick={handleAdd} className="w-full">Add Memory</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
