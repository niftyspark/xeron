'use client';

import { useState, useCallback } from 'react';
import { useUser } from '@/app/store/useUser';

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
  const { token } = useUser();

  const fetchTasks = useCallback(async () => {
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
  }, [token]);

  const createTask = useCallback(async (task: Omit<ScheduledTask, 'id' | 'lastRun' | 'nextRun' | 'runCount'>) => {
    if (!token) return;
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
        return data;
      }
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  }, [token]);

  const toggleTask = useCallback(async (id: string) => {
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
  }, [token]);

  const deleteTask = useCallback(async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/tasks?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  }, [token]);

  return { tasks, loading, fetchTasks, createTask, toggleTask, deleteTask };
}
