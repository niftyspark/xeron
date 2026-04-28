'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { useUser } from '@/app/store/useUser';
import { useUI } from '@/app/store/useUI';
import { toast } from 'sonner';
import {
  User, Palette, Database, Shield, ExternalLink,
  Save, Check, Zap, Crown, Rocket, Loader2, Cpu, Key, Globe, Cloud, Sparkles,
} from 'lucide-react';
import { authFetch } from '@/lib/client-auth';

const AI_PROVIDERS = [
  { id: 'groq', name: 'Groq', icon: Sparkles, desc: 'Fast inference, free tier', color: 'from-orange-500 to-red-500' },
  { id: 'openai', name: 'OpenAI', icon: Cpu, desc: 'GPT-4o, GPT-4o Mini', color: 'from-green-500 to-emerald-500' },
  { id: 'cloudflare', name: 'Cloudflare', icon: Cloud, desc: 'Workers AI, Llama models', color: 'from-orange-400 to-yellow-500' },
  { id: 'huggingface', name: 'HuggingFace', icon: Globe, desc: 'Open source models', color: 'from-blue-400 to-orange-500' },
  { id: 'openrouter', name: 'OpenRouter', icon: Globe, desc: '140+ models unified', color: 'from-purple-500 to-pink-500' },
  { id: 'jan', name: 'Jan.ai (Local)', icon: Cpu, desc: 'Local LLM via llama.cpp', color: 'from-cyan-500 to-blue-500' },
];

const PROVIDER_MODELS: Record<string, Array<{ id: string; name: string }>> = {
  groq: [
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile' },
    { id: 'llama-3.1-70b-versatile', name: 'Llama 3.1 70B' },
    { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant' },
  ],
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
  ],
  cloudflare: [
    { id: '@cf/meta/llama-3.1-70b-instruct', name: 'Llama 3.1 70B' },
    { id: '@cf/meta/llama-3.1-8b-instruct', name: 'Llama 3.1 8B' },
  ],
  huggingface: [
    { id: 'meta-llama/Llama-3.1-70B-Instruct', name: 'Llama 3.1 70B' },
    { id: 'meta-llama/Llama-3.1-8B-Instruct', name: 'Llama 3.1 8B' },
  ],
  openrouter: [
    { id: 'openai/gpt-4o', name: 'GPT-4o' },
    { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' },
    { id: 'anthropic/claude-4-opus', name: 'Claude 4 Opus' },
  ],
  jan: [
    { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant' },
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile' },
    { id: 'Vikhr-Llama-3.2-1B-Instruct-abliterated.Q4_K_M.gguf', name: 'Vikhr Llama 3.2 1B' },
  ],
};

export default function SettingsPage() {
  const { walletAddress, displayName, isAuthenticated, clear, setUser, userId } = useUser();
  const { appTheme, setAppTheme, userTier, messagesRemaining, messagesLimit } = useUI();
  const router = useRouter();

  const [name, setName] = useState(displayName || '');
  const [saving, setSaving] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('groq');
  const [selectedModel, setSelectedModel] = useState('llama-3.3-70b-versatile');
  const [savingProvider, setSavingProvider] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [clearingMemories, setClearingMemories] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const handleSaveProfile = async () => {
    if (!isAuthenticated) return;
    setSaving(true);
    try {
      const res = await authFetch('/api/user', {
        method: 'PATCH',
        json: { displayName: name },
      });
      if (res.ok) {
        if (userId && walletAddress) {
          setUser({ userId, walletAddress, displayName: name });
        }
        toast.success('Profile updated');
      } else {
        toast.error('Could not update profile.');
      }
    } catch {
      toast.error('Error saving profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProvider = async () => {
    if (!isAuthenticated) return;
    setSavingProvider(true);
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'test' }],
          model: selectedModel,
        }),
      });

      if (res.ok) {
        toast.success(`Connected to ${selectedProvider}`);
      } else {
        const error = await res.text();
        toast.error(`Failed: ${error.slice(0, 100)}`);
      }
    } catch {
      toast.error('Error connecting to provider');
    } finally {
      setSavingProvider(false);
    }
  };

  const handleExportData = async () => {
    if (!isAuthenticated) {
      toast.error('You must be signed in to export data');
      return;
    }
    setExporting(true);
    try {
      const [conversationsRes, memoriesRes, userRes] = await Promise.all([
        authFetch('/api/conversations'),
        authFetch('/api/memories'),
        authFetch('/api/user'),
      ]);

      const conversations = conversationsRes.ok ? await conversationsRes.json() : [];
      const memories = memoriesRes.ok ? await memoriesRes.json() : [];
      const user = userRes.ok ? await userRes.json() : {};

      const exportData = {
        exportedAt: new Date().toISOString(),
        user,
        conversations,
        memories,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `xeron-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Data exported successfully');
    } catch {
      toast.error('Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  const handleClearMemories = async () => {
    if (!isAuthenticated) return;
    const confirmed = window.confirm(
      'Are you sure you want to clear all memories? This action cannot be undone.',
    );
    if (!confirmed) return;

    setClearingMemories(true);
    try {
      const res = await authFetch('/api/memories', {
        method: 'DELETE',
        json: { clearAll: true },
      });
      if (res.ok) toast.success('All memories cleared');
      else toast.error('Failed to clear memories');
    } catch {
      toast.error('Failed to clear memories');
    } finally {
      setClearingMemories(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!isAuthenticated) return;
    const confirmed = window.confirm(
      'WARNING: This will permanently delete your account and all associated data. This action CANNOT be undone. Continue?',
    );
    if (!confirmed) return;

    setDeletingAccount(true);
    try {
      const res = await authFetch('/api/user', { method: 'DELETE' });
      if (res.ok) {
        clear();
        try {
          localStorage.removeItem('xeron-user');
          localStorage.removeItem('xeron-chat');
          localStorage.removeItem('xeron-code-sessions');
          localStorage.removeItem('xeron-ui');
        } catch {
          /* localStorage unavailable — ignore */
        }
        router.push('/');
      } else {
        toast.error('Failed to delete account');
      }
    } catch {
      toast.error('Failed to delete account');
    } finally {
      setDeletingAccount(false);
    }
  };

  const hasLimit = messagesLimit > 0;
  const usagePercent = hasLimit
    ? Math.min((messagesRemaining / messagesLimit) * 100, 100)
    : 100;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-white/40 mt-1">
          Configure your XERON experience
        </p>
      </div>

      <div className="space-y-8">
        {/* AI Provider Settings */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl glass"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">AI Provider</h2>
              <p className="text-xs text-white/40">Select your preferred AI model</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Provider Selection */}
            <div>
              <label className="text-sm text-white/60 mb-2 block">Provider</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {AI_PROVIDERS.map((provider) => {
                  const Icon = provider.icon;
                  const isSelected = selectedProvider === provider.id;
                  return (
                    <button
                      key={provider.id}
                      onClick={() => {
                        setSelectedProvider(provider.id);
                        const models = PROVIDER_MODELS[provider.id];
                        if (models && models.length > 0) {
                          setSelectedModel(models[0].id);
                        }
                      }}
                      className={`relative p-4 rounded-xl border transition-all text-left ${
                        isSelected
                          ? 'border-blue-500/50 bg-blue-500/10'
                          : 'border-white/10 glass hover:border-white/20'
                      }`}
                    >
                      {isSelected && (
                        <Badge className="absolute -top-2 -right-2 bg-blue-500 text-[10px]">
                          Active
                        </Badge>
                      )}
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${provider.color} flex items-center justify-center mb-2`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="text-sm font-medium text-white">{provider.name}</div>
                      <div className="text-xs text-white/40">{provider.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Model Selection */}
            <div>
              <label className="text-sm text-white/60 mb-2 block">Model</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-blue-500/50 focus:outline-none"
              >
                {PROVIDER_MODELS[selectedProvider]?.map((model) => (
                  <option key={model.id} value={model.id} className="bg-[#0a0a0f]">
                    {model.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Provider URL for Jan */}
            {selectedProvider === 'jan' && (
              <div>
                <label className="text-sm text-white/60 mb-1 block">Jan.ai URL</label>
                <Input
                  value={process.env.NEXT_PUBLIC_JAN_URL || 'http://localhost:1337/v1/chat/completions'}
                  readOnly
                  className="bg-white/5"
                />
                <p className="text-xs text-white/40 mt-1">
                  Make sure Jan.ai is running with API mode enabled
                </p>
              </div>
            )}

            {/* API Key Status */}
            <div className="p-4 rounded-xl glass">
              <div className="flex items-center gap-2 mb-2">
                <Key className="w-4 h-4 text-white/60" />
                <span className="text-sm text-white/60">Status</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  selectedProvider === 'jan' ? 'bg-green-500' : 
                  selectedProvider === 'groq' ? 'bg-green-500' : 'bg-yellow-500'
                }`} />
                <span className="text-sm text-white">
                  {selectedProvider === 'jan' ? 'Local (no key needed)' : 
                   selectedProvider === 'groq' ? 'Configured' : 'Add API key in .env'}
                </span>
              </div>
            </div>

            <Button onClick={handleSaveProvider} disabled={savingProvider} variant="secondary" className="w-full">
              {savingProvider ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {savingProvider ? 'Testing...' : 'Test Connection'}
            </Button>
          </div>
        </motion.section>

        {/* Rest of the settings sections remain unchanged */}
        {/* User Profile / Subscription */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 rounded-2xl glass"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Your Plan</h2>
              <p className="text-xs text-white/40">Manage subscription and usage</p>
            </div>
          </div>

          <div className="mt-6 p-4 rounded-xl glass">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm text-white">Messages today</p>
                <p className="text-xs text-white/40">
                  {hasLimit
                    ? `${messagesRemaining} / ${messagesLimit}`
                    : 'Unlimited'}
                </p>
              </div>
              {hasLimit && (
                <div className="text-right">
                  <p className="text-lg font-bold text-white">
                    {Math.round(usagePercent)}%
                  </p>
                  <p className="text-[10px] text-white/40">remaining</p>
                </div>
              )}
            </div>
            {hasLimit && (
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all"
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            )}
          </div>
        </motion.section>

        {/* Profile Settings */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 rounded-2xl glass"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/20 flex items-center justify-center">
              <User className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Profile</h2>
              <p className="text-xs text-white/40">Your identity and display settings</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-white/60 mb-1 block">Display Name</label>
              <div className="flex gap-2">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your display name"
                />
                <Button onClick={handleSaveProfile} disabled={saving} variant="secondary">
                  <Save className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm text-white/60 mb-1 block">Email</label>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-white/5 border border-white/10">
                <span className="text-sm text-white/50 font-mono">{walletAddress || 'Not connected'}</span>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Appearance */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-6 rounded-2xl glass"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/20 flex items-center justify-center">
              <Palette className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Appearance</h2>
              <p className="text-xs text-white/40">Customize the look and feel</p>
            </div>
          </div>

          <div className="space-y-2">
            {(['dark', 'light', 'neumorphism', 'cyberpunk'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setAppTheme(t)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${
                  appTheme === t ? 'bg-blue-600/10 border border-blue-500/30' : 'glass hover:bg-white/[0.06]'
                }`}
              >
                <div>
                  <span className="text-sm text-white">{t.charAt(0).toUpperCase() + t.slice(1)}</span>
                  <p className="text-xs text-white/30">
                    {t === 'dark' && 'Default dark theme'}
                    {t === 'light' && 'Clean light mode'}
                    {t === 'neumorphism' && 'Soft extruded shadows'}
                    {t === 'cyberpunk' && 'Industrial neon style'}
                  </p>
                </div>
                {appTheme === t && <Check className="w-4 h-4 text-blue-400" />}
              </button>
            ))}
          </div>
        </motion.section>

        {/* Data Management */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="p-6 rounded-2xl glass"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/20 flex items-center justify-center">
              <Database className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Data Management</h2>
              <p className="text-xs text-white/40">Export and manage your data</p>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={handleExportData}
              disabled={exporting}
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ExternalLink className="w-4 h-4" />
              )}
              {exporting ? 'Exporting...' : 'Export All Data'}
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-2 text-amber-400 hover:text-amber-300"
              onClick={handleClearMemories}
              disabled={clearingMemories}
            >
              {clearingMemories ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Database className="w-4 h-4" />
              )}
              {clearingMemories ? 'Clearing...' : 'Clear All Memories'}
            </Button>
            <Button
              variant="destructive"
              className="w-full justify-start gap-2"
              onClick={handleDeleteAccount}
              disabled={deletingAccount}
            >
              {deletingAccount ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Shield className="w-4 h-4" />
              )}
              {deletingAccount ? 'Deleting...' : 'Delete Account'}
            </Button>
          </div>
        </motion.section>
      </div>
    </div>
  );
}