'use client';

import { useState, useCallback } from 'react';
import { useUser } from '@/app/store/useUser';
import { toast } from 'sonner';

interface ScheduledTask {
  id: string;
  name: string;
  description: string;
  prompt: string;
  model: string;
  cronExpression: string;
  timezone: string;
  isActive: boolean;
  lastRun: string | null;
  nextRun: string | null;
  runCount: number;
}

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

export function useScheduledTasks() {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(false);
  const { token: storeToken } = useUser();

  const getAuthToken = useCallback(() => {
    return storeToken || getToken();
  }, [storeToken]);

  const fetchTasks = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/tasks', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [getAuthToken]);

  const createTask = useCallback(async (task: Omit<ScheduledTask, 'id' | 'lastRun' | 'nextRun' | 'runCount'>) => {
    const token = getAuthToken();
    if (!token) {
      toast.error('Please sign in to create tasks');
      return null;
    }
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(task),
      });
      if (res.ok) {
        const data = await res.json();
        setTasks((prev) => [data, ...prev]);
        toast.success('Task created');
        return data;
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to create task');
        return null;
      }
    } catch (err) {
      console.error('Failed to create task:', err);
      toast.error('Failed to create task');
      return null;
    }
  }, [getAuthToken]);

  const toggleTask = useCallback(async (id: string) => {
    const token = getAuthToken();
    if (!token) return;
    try {
      const res = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id, toggle: true }),
      });
      if (res.ok) {
        setTasks((prev) =>
          prev.map((t) => (t.id === id ? { ...t, isActive: !t.isActive } : t))
        );
      }
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  }, [getAuthToken]);

  const deleteTask = useCallback(async (id: string) => {
    const token = getAuthToken();
    if (!token) return;
    try {
      const res = await fetch(`/api/tasks?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== id));
        toast.success('Task deleted');
      }
    } catch (err) {
      console.error('Failed to delete task:', err);
      toast.error('Failed to delete task');
    }
  }, [getAuthToken]);

  return { tasks, loading, fetchTasks, createTask, toggleTask, deleteTask };
}