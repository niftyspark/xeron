'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useScheduledTasks } from '@/app/hooks/useScheduledTasks';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Badge } from '@/app/components/ui/badge';
import { Switch } from '@/app/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/app/components/ui/dialog';
import { Plus, Calendar, Clock, Play, Pause, Trash2, MoreVertical } from 'lucide-react';

export default function TasksPage() {
  const { tasks, loading, fetchTasks, createTask, toggleTask, deleteTask } = useScheduledTasks();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    prompt: '',
    cronExpression: '0 9 * * *',
    model: 'llama-3.3-70b-versatile',
    timezone: 'UTC',
    isActive: true,
  });

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleCreate = async () => {
    if (!form.name || !form.prompt) return;
    const result = await createTask(form);
    if (result) {
      setShowCreate(false);
      setForm({ name: '', description: '', prompt: '', cronExpression: '0 9 * * *', model: 'llama-3.3-70b-versatile', timezone: 'UTC', isActive: true });
    }
  };

  const cronPresets = [
    { label: 'Every hour', value: '0 * * * *' },
    { label: 'Every day at 9am', value: '0 9 * * *' },
    { label: 'Every Monday', value: '0 9 * * 1' },
    { label: 'Every month', value: '0 9 1 * *' },
    { label: 'Every 5 minutes', value: '*/5 * * * *' },
    { label: 'Every 12 hours', value: '0 */12 * * *' },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Scheduled Tasks</h1>
          <p className="text-sm text-white/40 mt-1">
            Automate recurring AI tasks with cron scheduling
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          New Task
        </Button>
      </div>

      {tasks.length === 0 && !loading ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <Calendar className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white/60 mb-2">No scheduled tasks yet</h3>
          <p className="text-sm text-white/30 mb-6">Create your first automated task to get started</p>
          <Button onClick={() => setShowCreate(true)} variant="outline">
            Create Task
          </Button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {tasks.map((task, i) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-5 rounded-2xl glass hover:bg-white/[0.06] transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-medium text-white">{task.name}</h3>
                  {task.description && (
                    <p className="text-xs text-white/40 mt-1">{task.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={task.isActive}
                    onCheckedChange={() => toggleTask(task.id)}
                  />
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="p-1 rounded text-white/20 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                <Badge variant={task.isActive ? 'success' : 'secondary'}>
                  {task.isActive ? 'Active' : 'Paused'}
                </Badge>
                <Badge variant="outline">
                  <Clock className="w-3 h-3 mr-1" />
                  {task.cronExpression}
                </Badge>
                <Badge variant="outline">{task.model}</Badge>
              </div>

              <div className="text-xs text-white/30 space-y-1">
                <p>Runs: {task.runCount || 0}</p>
                {task.lastRun && <p>Last run: {new Date(task.lastRun).toLocaleString()}</p>}
                {task.nextRun && <p>Next run: {new Date(task.nextRun).toLocaleString()}</p>}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Task Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Scheduled Task</DialogTitle>
            <DialogDescription>
              Set up an automated AI task with cron scheduling
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm text-white/60 mb-1 block">Task Name</label>
              <Input
                placeholder="e.g., Daily news summary"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm text-white/60 mb-1 block">Description</label>
              <Input
                placeholder="Optional description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm text-white/60 mb-1 block">Prompt / Instructions</label>
              <Textarea
                placeholder="What should XERON do?"
                value={form.prompt}
                onChange={(e) => setForm({ ...form, prompt: e.target.value })}
                rows={3}
              />
            </div>

            <div>
              <label className="text-sm text-white/60 mb-2 block">Schedule</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {cronPresets.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => setForm({ ...form, cronExpression: preset.value })}
                    className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                      form.cronExpression === preset.value
                        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                        : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <Input
                value={form.cronExpression}
                onChange={(e) => setForm({ ...form, cronExpression: e.target.value })}
                placeholder="Cron expression"
                className="font-mono text-sm"
              />
            </div>

            <Button onClick={handleCreate} className="w-full">
              Create Task
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
