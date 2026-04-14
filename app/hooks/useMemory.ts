'use client';

import { useState, useCallback } from 'react';
import { getClientToken } from '@/lib/client-auth';
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
    const token = getClientToken();
    if (!token) return;
    setLoading(true);
    try {
      const params = category ? `?category=${category}` : '';
      const res = await fetch(`/api/memories${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMemories(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Fetch memories failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const addMemory = useCallback(async (category: string, content: string, importance = 0.5) => {
    const token = getClientToken();
    if (!token) {
      toast.error('Please sign in to add memories');
      return null;
    }
    try {
      const res = await fetch('/api/memories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ category, content, importance }),
      });
      if (res.ok) {
        const data = await res.json();
        setMemories(prev => [data, ...prev]);
        toast.success('Memory added');
        return data;
      }
      const err = await res.json().catch(() => ({ error: 'Failed' }));
      toast.error(err.error || 'Failed to add memory');
      return null;
    } catch (err) {
      toast.error('Failed to add memory');
      return null;
    }
  }, []);

  const deleteMemory = useCallback(async (id: string) => {
    const token = getClientToken();
    if (!token) return;
    try {
      const res = await fetch(`/api/memories?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setMemories(prev => prev.filter(m => m.id !== id));
        toast.success('Memory deleted');
      }
    } catch {}
  }, []);

  return { memories, loading, fetchMemories, addMemory, deleteMemory };
}