'use client';

import { useState, useCallback } from 'react';
import { authFetch } from '@/lib/client-auth';
import { toast } from 'sonner';

interface Memory {
  id: string;
  category: string;
  content: string;
  importance: number;
  accessCount: number;
  createdAt: string;
}

export function useMemory() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMemories = useCallback(async (category?: string) => {
    setLoading(true);
    try {
      const params = category ? `?category=${encodeURIComponent(category)}` : '';
      const res = await authFetch(`/api/memories${params}`);
      if (res.status === 401) {
        setMemories([]);
        return;
      }
      if (res.ok) {
        const data = (await res.json()) as Memory[];
        setMemories(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Fetch memories failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const addMemory = useCallback(
    async (category: string, content: string, importance = 0.5) => {
      try {
        const res = await authFetch('/api/memories', {
          method: 'POST',
          json: { category, content, importance },
        });
        if (res.status === 401) {
          toast.error('Session expired. Please sign in again.');
          return null;
        }
        if (res.ok) {
          const data = (await res.json()) as Memory;
          setMemories((prev) => [data, ...prev]);
          toast.success('Memory added');
          return data;
        }
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(err.error || 'Failed to add memory');
        return null;
      } catch {
        toast.error('Failed to add memory');
        return null;
      }
    },
    [],
  );

  const deleteMemory = useCallback(async (id: string) => {
    try {
      const res = await authFetch(`/api/memories?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setMemories((prev) => prev.filter((m) => m.id !== id));
        toast.success('Memory deleted');
      } else if (res.status === 404) {
        // Silently remove from UI — server says it's gone.
        setMemories((prev) => prev.filter((m) => m.id !== id));
      } else {
        toast.error('Failed to delete memory');
      }
    } catch {
      toast.error('Failed to delete memory');
    }
  }, []);

  return { memories, loading, fetchMemories, addMemory, deleteMemory };
}
