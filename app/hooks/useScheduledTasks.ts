'use client';

import { useState, useCallback } from 'react';
import { getClientToken } from '@/lib/client-auth';
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

export function useScheduledTasks() {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTasks = useCallback(async () => {
    const token = getClientToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/tasks', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Fetch tasks failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createTask = useCallback(async (task: any) => {
    const token = getClientToken();
    if (!token) {
      toast.error('Session expired. Please refresh the page.');
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
        setTasks(prev => [data, ...prev]);
        toast.success('Task created');
        return data;
      }
      const err = await res.json().catch(() => ({ error: 'Failed' }));
      toast.error(err.error || 'Failed to create task');
      return null;
    } catch (err) {
      toast.error('Failed to create task');
      return null;
    }
  }, []);

  const toggleTask = useCallback(async (id: string) => {
    const token = getClientToken();
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
        setTasks(prev => prev.map(t => t.id === id ? { ...t, isActive: !t.isActive } : t));
      }
    } catch {}
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    const token = getClientToken();
    if (!token) return;
    try {
      const res = await fetch(`/api/tasks?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setTasks(prev => prev.filter(t => t.id !== id));
        toast.success('Task deleted');
      }
    } catch {}
  }, []);

  return { tasks, loading, fetchTasks, createTask, toggleTask, deleteTask };
}