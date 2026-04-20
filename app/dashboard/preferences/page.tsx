'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { authFetch } from '@/lib/client-auth';
import { Button } from '@/app/components/ui/button';
import {
  Brain,
  Globe,
  Image as ImageIcon,
  Save,
  Loader2,
  Zap,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BUILTIN_SKILLS } from '@/lib/skills';

/**
 * /dashboard/preferences
 *
 * Single page that owns every user-facing chat-composition toggle:
 *   - persistent memory on/off
 *   - per-tool on/off (web_search, analyze_image)
 *   - per-skill on/off
 *   - custom system prompt that replaces the Xeron persona when set
 *
 * All state lives server-side (users.settings.preferences) via
 * /api/user/preferences. The chat route reads this on every request.
 */

interface Preferences {
  memoryEnabled: boolean;
  toolsEnabled: {
    web_search: boolean;
    analyze_image: boolean;
  };
  enabledSkillIds: string[];
  customSystemPrompt: string;
}

const DEFAULTS: Preferences = {
  memoryEnabled: true,
  toolsEnabled: { web_search: true, analyze_image: true },
  enabledSkillIds: [],
  customSystemPrompt: '',
};

function Toggle({
  label,
  description,
  checked,
  onChange,
  icon: Icon,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <label
      className={cn(
        'flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors',
        checked
          ? 'border-blue-500/30 bg-blue-500/5'
          : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04]',
      )}
    >
      {Icon && (
        <div
          className={cn(
            'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
            checked ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-white/40',
          )}
        >
          <Icon className="w-4 h-4" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-medium">{label}</p>
        {description && (
          <p className="text-xs text-white/40 mt-0.5">{description}</p>
        )}
      </div>
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div
        className={cn(
          'w-10 h-6 rounded-full transition-colors relative shrink-0 mt-1',
          checked ? 'bg-blue-500' : 'bg-white/10',
        )}
      >
        <div
          className={cn(
            'absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform',
            checked ? 'translate-x-4' : 'translate-x-0.5',
          )}
        />
      </div>
    </label>
  );
}

export default function PreferencesPage() {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Load preferences from the server on mount. We always apply the DEFAULTS
  // before overlaying the server response, so a missing field is never
  // `undefined` in component state.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch('/api/user/preferences');
        if (!res.ok) return;
        const data = (await res.json()) as Partial<Preferences>;
        if (cancelled) return;
        setPrefs({
          ...DEFAULTS,
          ...data,
          toolsEnabled: { ...DEFAULTS.toolsEnabled, ...(data.toolsEnabled ?? {}) },
          enabledSkillIds: data.enabledSkillIds ?? [],
          customSystemPrompt: data.customSystemPrompt ?? '',
        });
      } catch {
        /* keep defaults */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback(<K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setPrefs((p) => ({ ...p, [key]: value }));
    setDirty(true);
  }, []);

  const toggleTool = useCallback(
    (name: keyof Preferences['toolsEnabled'], value: boolean) => {
      setPrefs((p) => ({
        ...p,
        toolsEnabled: { ...p.toolsEnabled, [name]: value },
      }));
      setDirty(true);
    },
    [],
  );

  const toggleSkill = useCallback((id: string, value: boolean) => {
    setPrefs((p) => ({
      ...p,
      enabledSkillIds: value
        ? [...new Set([...p.enabledSkillIds, id])]
        : p.enabledSkillIds.filter((sid) => sid !== id),
    }));
    setDirty(true);
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const res = await authFetch('/api/user/preferences', {
        method: 'PATCH',
        json: prefs,
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? `Save failed (${res.status})`);
      }
      toast.success('Preferences saved');
      setDirty(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }, [prefs]);

  const resetPrompt = useCallback(() => {
    setPrefs((p) => ({ ...p, customSystemPrompt: '' }));
    setDirty(true);
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-white/40" />
      </div>
    );
  }

  const promptLen = prefs.customSystemPrompt.length;
  const promptOverLimit = promptLen > 8000;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Preferences</h1>
          <p className="text-sm text-white/40 mt-1">
            Control what the AI sees on every request. All preferences are
            stored on your account and apply to every device.
          </p>
        </div>
        <Button
          onClick={save}
          disabled={!dirty || saving || promptOverLimit}
          className="shrink-0"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save
        </Button>
      </div>

      {/* ── Memory ───────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3 mb-8"
      >
        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wide">
          Memory
        </h2>
        <Toggle
          label="Persistent memory"
          description="Include your remembered facts and preferences in every chat. When off, the AI starts fresh each conversation."
          checked={prefs.memoryEnabled}
          onChange={(v) => update('memoryEnabled', v)}
          icon={Brain}
        />
      </motion.section>

      {/* ── Tools ────────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="space-y-3 mb-8"
      >
        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wide">
          Tools the AI can call mid-chat
        </h2>
        <Toggle
          label="Web search (Google via Serper)"
          description="Let the AI search the web for current events, recent facts, docs, and things beyond its training cutoff."
          checked={prefs.toolsEnabled.web_search}
          onChange={(v) => toggleTool('web_search', v)}
          icon={Globe}
        />
        <Toggle
          label="Image analyzer (Llama 3.2 Vision)"
          description="Let the AI analyze an image by URL or data URI when you reference one in chat."
          checked={prefs.toolsEnabled.analyze_image}
          onChange={(v) => toggleTool('analyze_image', v)}
          icon={ImageIcon}
        />
      </motion.section>

      {/* ── Skills ───────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-3 mb-8"
      >
        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wide">
          Skills ({prefs.enabledSkillIds.length} enabled)
        </h2>
        <p className="text-xs text-white/40">
          Each enabled skill adds a short instruction block to the system
          prompt. Enable only what you need — every skill costs input tokens.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {BUILTIN_SKILLS.map((skill) => {
            const enabled = prefs.enabledSkillIds.includes(skill.id);
            return (
              <Toggle
                key={skill.id}
                label={skill.name}
                description={skill.description}
                checked={enabled}
                onChange={(v) => toggleSkill(skill.id, v)}
                icon={Zap}
              />
            );
          })}
        </div>
      </motion.section>

      {/* ── Custom system prompt ─────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="space-y-3"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wide">
            Custom system prompt
          </h2>
          {prefs.customSystemPrompt && (
            <button
              type="button"
              onClick={resetPrompt}
              className="text-xs text-white/40 hover:text-white/70 inline-flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Reset to default
            </button>
          )}
        </div>
        <div className="p-3 rounded-xl border border-white/5 bg-white/[0.02]">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-white/40 shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-medium">
                Override the AI&apos;s personality
              </p>
              <p className="text-xs text-white/40 mt-0.5">
                If you set this, it <strong>fully replaces</strong> the default
                Xeron character for your account. Leave empty to keep the
                default persona.
              </p>
            </div>
          </div>
          <textarea
            value={prefs.customSystemPrompt}
            onChange={(e) =>
              update('customSystemPrompt', e.target.value.slice(0, 8000))
            }
            placeholder="e.g. You are a senior staff engineer. Reply in concise, technical prose. Never use emoji."
            className="w-full min-h-[160px] rounded-lg bg-[#0a0a0f] border border-white/10 p-3 text-sm text-white/80 placeholder:text-white/20 outline-none focus:border-blue-500/40 resize-y font-mono"
          />
          <div className="flex items-center justify-between mt-2">
            <p
              className={cn(
                'text-xs',
                promptOverLimit ? 'text-red-400' : 'text-white/30',
              )}
            >
              {promptLen.toLocaleString()} / 8,000 characters
            </p>
            {prefs.customSystemPrompt.trim() && (
              <p className="text-xs text-amber-400">
                Xeron persona disabled — using your custom prompt.
              </p>
            )}
          </div>
        </div>
      </motion.section>

      <div className="h-12" />
    </div>
  );
}
