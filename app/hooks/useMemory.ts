'use client';

import { useState, useCallback } from 'react';
import { useUser } from '@/app/store/useUser';
import { toast } from 'sonner';

interface Memory {
  id: string;
  category: string;
  content: string;
  importance: number;
  accessCount: number;
  createdAt: string;
}

// Get token from zustand persisted store or useUser
function getToken(): string | null {
  try {
    const raw = localStorage.getItem('xeron-user');
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed?.state?.token || null;
    }
  } catch {}
  return null;
}

export function useMemory() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(false);
  const { token: storeToken } = useUser();

  const getAuthToken = useCallback(() => {
    return storeToken || getToken();
  }, [storeToken]);

  const fetchMemories = useCallback(async (category?: string) => {
    const token = getAuthToken();
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
  }, [getAuthToken]);

  const addMemory = useCallback(async (category: string, content: string, importance = 0.5) => {
    const token = getAuthToken();
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
        setMemories((prev) => [data, ...prev]);
        toast.success('Memory added');
        return data;
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to add memory');
        return null;
      }
    } catch (err) {
      console.error('Failed to add memory:', err);
      toast.error('Failed to add memory');
      return null;
    }
  }, [getAuthToken]);

  const deleteMemory = useCallback(async (id: string) => {
    const token = getAuthToken();
    if (!token) {
      toast.error('Please sign in to delete memories');
      return;
    }
    try {
      const res = await fetch(`/api/memories?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setMemories((prev) => prev.filter((m) => m.id !== id));
        toast.success('Memory deleted');
      }
    } catch (err) {
      console.error('Failed to delete memory:', err);
      toast.error('Failed to delete memory');
    }
  }, [getAuthToken]);

  return { memories, loading, fetchMemories, addMemory, deleteMemory };
}
