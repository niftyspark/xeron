'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/app/components/ui/badge';
import { BookOpen, ThumbsUp, ThumbsDown, Lightbulb, MessageSquare, Repeat, Zap, Loader2 } from 'lucide-react';

interface LearningEntry {
  id: string;
  userId: string;
  trigger: string;
  lesson: string;
  appliedTo: string | null;
  confidence: number;
  createdAt: string;
}

const triggerIcons: Record<string, any> = {
  feedback: MessageSquare,
  user_feedback: MessageSquare,
  correction: Repeat,
  pattern: Lightbulb,
  auto: Zap,
  manual: BookOpen,
};

const triggerColors: Record<string, string> = {
  feedback: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  user_feedback: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  correction: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  pattern: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  auto: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  manual: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

export default function LearningPage() {
  const [entries, setEntries] = useState<LearningEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLearningLogs() {
      try {
        const { getClientToken } = await import('@/lib/client-auth');
        const token = getClientToken();
        const res = await fetch('/api/learning', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) {
          throw new Error('Failed to fetch learning logs');
        }
        const data = await res.json();
        setEntries(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load learning logs');
      } finally {
        setLoading(false);
      }
    }
    fetchLearningLogs();
  }, []);

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          <p className="text-sm text-white/40">Loading learning logs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-center">
          <BookOpen className="w-8 h-8 text-red-400" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Learning Log</h1>
          <p className="text-sm text-white/40 mt-1">
            Track what XERON has learned from your interactions
          </p>
        </div>
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
          <BookOpen className="w-10 h-10 text-white/20" />
          <p className="text-sm text-white/40">No learning entries yet.</p>
          <p className="text-xs text-white/25">
            XERON will learn from your interactions and feedback over time.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Learning Log</h1>
        <p className="text-sm text-white/40 mt-1">
          Track what XERON has learned from your interactions
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Total Lessons', value: entries.length },
          { label: 'High Confidence', value: entries.filter(l => l.confidence > 0.8).length },
          { label: 'From Corrections', value: entries.filter(l => l.trigger === 'correction').length },
          { label: 'Auto-detected', value: entries.filter(l => l.trigger === 'auto').length },
        ].map((stat) => (
          <div key={stat.label} className="p-4 rounded-xl glass text-center">
            <div className="text-2xl font-bold gradient-text">{stat.value}</div>
            <div className="text-xs text-white/40">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="relative">
        <div className="absolute left-6 top-0 bottom-0 w-px bg-white/5" />

        <div className="space-y-4">
          {entries.map((entry, i) => {
            const TriggerIcon = triggerIcons[entry.trigger] || Lightbulb;

            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="relative flex gap-4 pl-2"
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 z-10 border ${triggerColors[entry.trigger] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
                  <TriggerIcon className="w-4 h-4" />
                </div>

                <div className="flex-1 p-4 rounded-xl glass hover:bg-white/[0.06] transition-all group">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-white/80">{entry.lesson}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className={triggerColors[entry.trigger] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}>{entry.trigger}</Badge>
                        {entry.appliedTo && (
                          <span className="text-[10px] text-white/30">
                            Applied to: {entry.appliedTo}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1 rounded text-white/30 hover:text-emerald-400 transition-colors" title="Approve">
                        <ThumbsUp className="w-3.5 h-3.5" />
                      </button>
                      <button className="p-1 rounded text-white/30 hover:text-red-400 transition-colors" title="Reject">
                        <ThumbsDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-3">
                    <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500"
                        style={{ width: `${entry.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-white/30">
                      {(entry.confidence * 100).toFixed(0)}% confidence
                    </span>
                  </div>

                  <p className="text-[10px] text-white/20 mt-2">
                    {new Date(entry.createdAt).toLocaleString()}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
