'use client';

import { useState, useCallback } from 'react';
import { useUser } from '@/app/store/useUser';

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
  const { token } = useUser();

  const fetchMemories = useCallback(async (category?: string) => {
    if (!token) return;
    setLoading(true);
    try {
      const params = category ? `?category=${category}` : '';
      const res = await fetch(`/api/memories${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMemories(data);
      }
    } catch (err) {
      console.error('Failed to fetch memories:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const addMemory = useCallback(async (category: string, content: string, importance = 0.5) => {
    if (!token) return;
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
        setMemories((prev) => [data, ...prev]);
        return data;
      }
    } catch (err) {
      console.error('Failed to add memory:', err);
    }
  }, [token]);

  const deleteMemory = useCallback(async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/memories?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setMemories((prev) => prev.filter((m) => m.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete memory:', err);
    }
  }, [token]);

  return { memories, loading, fetchMemories, addMemory, deleteMemory };
}
