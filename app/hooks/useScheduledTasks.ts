'use client';

import { useState, useCallback } from 'react';
import { authFetch } from '@/lib/client-auth';
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
    setLoading(true);
    try {
      const res = await authFetch('/api/tasks');
      if (res.ok) {
        const data = (await res.json()) as ScheduledTask[];
        setTasks(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Fetch tasks failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createTask = useCallback(async (task: Partial<ScheduledTask> & { name: string; prompt: string; cronExpression: string }) => {
    try {
      const res = await authFetch('/api/tasks', {
        method: 'POST',
        json: task,
      });
      if (res.status === 401) {
        toast.error('Session expired. Please sign in again.');
        return null;
      }
      if (res.ok) {
        const data = (await res.json()) as ScheduledTask;
        setTasks((prev) => [data, ...prev]);
        toast.success('Task created');
        return data;
      }
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(err.error || 'Failed to create task');
      return null;
    } catch {
      toast.error('Failed to create task');
      return null;
    }
  }, []);

  const toggleTask = useCallback(async (id: string) => {
    try {
      const res = await authFetch('/api/tasks', {
        method: 'PATCH',
        json: { id, toggle: true },
      });
      if (res.ok) {
        setTasks((prev) =>
          prev.map((t) => (t.id === id ? { ...t, isActive: !t.isActive } : t)),
        );
      } else if (res.status === 404) {
        // Remove from UI — task no longer exists server-side.
        setTasks((prev) => prev.filter((t) => t.id !== id));
        toast.error('Task no longer exists.');
      } else {
        toast.error('Failed to update task.');
      }
    } catch {
      toast.error('Failed to update task.');
    }
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    try {
      const res = await authFetch(`/api/tasks?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (res.ok || res.status === 404) {
        setTasks((prev) => prev.filter((t) => t.id !== id));
        toast.success('Task deleted');
      } else {
        toast.error('Failed to delete task.');
      }
    } catch {
      toast.error('Failed to delete task.');
    }
  }, []);

  return { tasks, loading, fetchTasks, createTask, toggleTask, deleteTask };
}
