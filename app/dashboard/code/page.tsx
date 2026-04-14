'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { SandboxPreview } from '@/app/components/code/SandboxPreview';
import { FileTree } from '@/app/components/code/FileTree';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Sparkles, Bug, BookOpen, Code2, Eye, ChevronDown, ChevronRight,
  Loader2, Bot, User, FileCode2, Plus, Lightbulb, Wand2, MessageSquare, Square,
} from 'lucide-react';

const CodeEditor = dynamic(
  () => import('@/app/components/code/CodeEditor').then(m => ({ default: m.CodeEditor })),
  { ssr: false, loading: () => <div className="flex-1 flex items-center justify-center bg-[#0d0d14]"><Loader2 className="w-6 h-6 text-white/20 animate-spin" /></div> }
);

// ── Types ──────────────────────────────────────────────────────────────────
type Framework = 'html' | 'react' | 'vue' | 'svelte' | 'vanilla';
type Mode = 'plan' | 'agent';
type RightTab = 'preview' | 'code';

interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  mode: Mode;
  files?: Record<string, string>;
  isStreaming?: boolean;
}

// ── Default templates ──────────────────────────────────────────────────────
const TEMPLATES: Record<Framework, Record<string, string>> = {
  html: {
    'index.html': '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>My App</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <div class="container">\n    <h1>Hello World</h1>\n    <p>Start building your app</p>\n  </div>\n  <script src="script.js"></script>\n</body>\n</html>',
    'style.css': '* { margin: 0; padding: 0; box-sizing: border-box; }\nbody { font-family: system-ui, sans-serif; min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #0f0f1a; color: #fff; }\n.container { text-align: center; }\nh1 { font-size: 2.5rem; margin-bottom: 0.5rem; background: linear-gradient(135deg, #3b82f6, #06b6d4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }\np { color: #888; }',
    'script.js': 'console.log("App loaded");',
  },
  react: {
    'App.jsx': 'import React from "react";\n\nfunction App() {\n  const [count, setCount] = React.useState(0);\n\n  return (\n    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f0f1a", color: "#fff", fontFamily: "system-ui" }}>\n      <div style={{ textAlign: "center" }}>\n        <h1 style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>React App</h1>\n        <button\n          onClick={() => setCount(c => c + 1)}\n          style={{ padding: "12px 24px", fontSize: "1rem", background: "#3b82f6", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}\n        >\n          Count: {count}\n        </button>\n      </div>\n    </div>\n  );\n}\n\nexport default App;',
    'style.css': '* { margin: 0; padding: 0; box-sizing: border-box; }',
  },
  vue: {
    'App.vue': '<template>\n  <div class="app">\n    <h1>Vue App</h1>\n    <button @click="count++">Count: {{ count }}</button>\n  </div>\n</template>\n\n<script>\nexport default {\n  data() {\n    return { count: 0 }\n  }\n}\n</script>\n\n<style>\n.app { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #0f0f1a; color: #fff; font-family: system-ui; }\nbutton { padding: 12px 24px; font-size: 1rem; background: #3b82f6; color: #fff; border: none; border-radius: 8px; cursor: pointer; margin-top: 1rem; }\n</style>',
    'style.css': '',
  },
  svelte: {
    'index.html': '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Svelte App</title></head><body><h1>Svelte App</h1><p>Svelte preview renders templates</p></body></html>',
    'style.css': 'body { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #0f0f1a; color: #fff; font-family: system-ui; }',
  },
  vanilla: {
    'index.html': '<canvas id="canvas"></canvas>',
    'style.css': 'body { margin: 0; overflow: hidden; background: #0f0f1a; }',
    'script.js': 'const canvas = document.getElementById("canvas");\nconst ctx = canvas.getContext("2d");\ncanvas.width = window.innerWidth;\ncanvas.height = window.innerHeight;\n\nconst particles = Array.from({length: 100}, () => ({\n  x: Math.random() * canvas.width,\n  y: Math.random() * canvas.height,\n  vx: (Math.random() - 0.5) * 2,\n  vy: (Math.random() - 0.5) * 2,\n  r: Math.random() * 3 + 1,\n}));\n\nfunction draw() {\n  ctx.fillStyle = "rgba(15,15,26,0.1)";\n  ctx.fillRect(0, 0, canvas.width, canvas.height);\n  particles.forEach(p => {\n    p.x += p.vx; p.y += p.vy;\n    if (p.x < 0 || p.x > canvas.width) p.vx *= -1;\n    if (p.y < 0 || p.y > canvas.height) p.vy *= -1;\n    ctx.beginPath();\n    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);\n    ctx.fillStyle = "#3b82f6";\n    ctx.fill();\n  });\n  requestAnimationFrame(draw);\n}\ndraw();',
  },
};

const STARTERS = [
  { icon: Sparkles, label: 'Landing page', prompt: 'Build a modern SaaS landing page with hero section, features grid, pricing cards, and a footer. Use gradient backgrounds and smooth animations.' },
  { icon: Wand2, label: 'React todo app', prompt: 'Create a beautiful React todo app with add, complete, delete, and filter functionality. Use local state. Style it with a modern dark theme.' },
  { icon: FileCode2, label: 'Portfolio site', prompt: 'Build a personal portfolio website with sections for about, projects, skills, and contact. Include smooth scroll animations and a clean dark design.' },
  { icon: Lightbulb, label: 'Dashboard', prompt: 'Create a dashboard with a sidebar, top stats cards, a line chart, a recent activity table, and a dark theme. Use placeholder data.' },
];

// ── Code block parser ──────────────────────────────────────────────────────
// Maps language identifiers to default filenames when AI doesn't use filename format
const LANG_TO_FILE: Record<string, string> = {
  html: 'index.html', htm: 'index.html',
  css: 'style.css', scss: 'style.scss',
  js: 'script.js', javascript: 'script.js',
  jsx: 'App.jsx', tsx: 'App.tsx', ts: 'app.ts', typescript: 'app.ts',
  json: 'data.json', py: 'main.py', python: 'main.py',
  vue: 'App.vue', svelte: 'App.svelte',
  md: 'README.md', markdown: 'README.md',
  xml: 'data.xml', svg: 'image.svg',
  sh: 'script.sh', bash: 'script.sh',
  yaml: 'config.yaml', yml: 'config.yaml',
};

function parseCodeBlocks(text: string): Record<string, string> | null {
  const regex = /```(\S+)\n([\s\S]*?)```/g;
  const files: Record<string, string> = {};
  const usedDefaults: Record<string, number> = {};
  let match;

  while ((match = regex.exec(text)) !== null) {
    let name = match[1].trim();
    const code = match[2].trimEnd();

    if (!name || !code) continue;

    // If name has a dot, it's a filename — use as-is
    if (name.includes('.')) {
      files[name] = code;
    } else {
      // It's a language name — map to a default filename
      const base = LANG_TO_FILE[name.toLowerCase()];
      if (base) {
        // Handle multiple blocks of the same language (e.g. two JS blocks)
        const count = usedDefaults[base] || 0;
        const finalName = count === 0 ? base : base.replace('.', `_${count}.`);
        usedDefaults[base] = count + 1;
        files[finalName] = code;
      } else {
        // Unknown language — use name as filename with .txt
        files[`${name}.txt`] = code;
      }
    }
  }

  return Object.keys(files).length > 0 ? files : null;
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function CodeAgentPage() {
  const [mode, setMode] = useState<Mode>('agent');
  const [framework, setFramework] = useState<Framework>('html');
  const [files, setFiles] = useState<Record<string, string>>(TEMPLATES.html);
  const [activeFile, setActiveFile] = useState('index.html');
  const [rightTab, setRightTab] = useState<RightTab>('preview');
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [fwOpen, setFwOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Switch framework
  const switchFramework = useCallback((fw: Framework) => {
    setFramework(fw);
    const tpl = TEMPLATES[fw];
    setFiles(tpl);
    setActiveFile(Object.keys(tpl)[0]);
    setFwOpen(false);
  }, []);

  // Track which files the AI is currently writing (shown live in chat)
  const [activeWritingFiles, setActiveWritingFiles] = useState<string[]>([]);

  // Stop generation
  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsGenerating(false);
    setActiveWritingFiles([]);
    // Mark last assistant message as not streaming
    setMessages(prev => prev.map((m, i) =>
      i === prev.length - 1 && m.role === 'assistant' && m.isStreaming
        ? { ...m, isStreaming: false, content: m.content || 'Stopped.' }
        : m
    ));
  }, []);

  // Send message to AI
  const handleSend = useCallback(async (text?: string) => {
    const prompt = (text || input).trim();
    if (!prompt || isGenerating) return;
    setInput('');

    const userMsg: ChatMsg = { id: crypto.randomUUID(), role: 'user', content: prompt, mode };
    const assistantMsg: ChatMsg = { id: crypto.randomUUID(), role: 'assistant', content: '', mode, isStreaming: true };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setIsGenerating(true);
    setActiveWritingFiles([]);
    abortRef.current = new AbortController();

    try {
      const action = mode === 'plan' ? 'explain' : 'generate';
      const res = await fetch('/api/ai/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, files, framework, action }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, content: 'Failed to get response from AI.', isStreaming: false } : m));
        setIsGenerating(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let full = '';
      let sseBuffer = '';

      // State machine for tracking code blocks
      let insideBlock = false;
      let currentBlockName = '';
      let currentBlockCode = '';
      let completedFiles: Record<string, string> = {};

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        sseBuffer += decoder.decode(value, { stream: true });
        const lines = sseBuffer.split('\n');
        sseBuffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            const chunk = parsed.choices?.[0]?.delta?.content;
            if (!chunk) continue;

            full += chunk;

            if (mode !== 'agent') {
              // Plan mode: show full text in chat
              setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, content: full } : m));
              continue;
            }

            // AGENT MODE: state machine parser - NEVER show code in chat
            // Process the full text character by character to find code blocks
            // We re-parse from scratch each time (simple and correct)
            insideBlock = false;
            currentBlockName = '';
            currentBlockCode = '';
            completedFiles = {};
            let textOutsideBlocks = '';
            let currentlyWriting = '';

            let i = 0;
            while (i < full.length) {
              if (!insideBlock) {
                // Look for opening ```
                if (full[i] === '`' && full.substring(i, i + 3) === '```') {
                  // Find the end of the info line
                  const nlIdx = full.indexOf('\n', i + 3);
                  if (nlIdx === -1) {
                    // Haven't received the full opening line yet
                    currentlyWriting = '...';
                    break;
                  }
                  const infoStr = full.substring(i + 3, nlIdx).trim();
                  if (infoStr) {
                    insideBlock = true;
                    currentBlockName = infoStr;
                    currentBlockCode = '';
                    i = nlIdx + 1;
                    // Resolve name
                    if (!currentBlockName.includes('.')) {
                      currentBlockName = LANG_TO_FILE[currentBlockName.toLowerCase()] || currentBlockName + '.txt';
                    }
                    currentlyWriting = currentBlockName;
                  } else {
                    i++;
                  }
                } else {
                  textOutsideBlocks += full[i];
                  i++;
                }
              } else {
                // Inside a code block - look for closing ```
                if (full[i] === '`' && full.substring(i, i + 3) === '```') {
                  // Block completed
                  completedFiles[currentBlockName] = currentBlockCode.trimEnd();
                  insideBlock = false;
                  currentBlockName = '';
                  currentBlockCode = '';
                  currentlyWriting = '';
                  i += 3;
                  // Skip optional newline after closing ```
                  if (i < full.length && full[i] === '\n') i++;
                } else {
                  currentBlockCode += full[i];
                  i++;
                }
              }
            }

            // Update IDE with completed files
            const fileNames = Object.keys(completedFiles);
            if (fileNames.length > 0) {
              setFiles(prev => ({ ...prev, ...completedFiles }));
              setActiveFile(fileNames[fileNames.length - 1]);
              setRightTab('code');
            }

            // Update writing indicator
            const allWriting = [...fileNames];
            if (currentlyWriting) allWriting.push(currentlyWriting);
            if (allWriting.length > 0) {
              setActiveWritingFiles(allWriting);
              setRightTab('code');
            }

            // Chat: ONLY show file indicators, ZERO code
            setMessages(prev => prev.map(m => m.id === assistantMsg.id
              ? { ...m, content: '', files: fileNames.length > 0 ? completedFiles : undefined }
              : m
            ));
          } catch {}
        }
      }

      // ── Finalize ──────────────────────────────────────────────────
      const finalFiles = parseCodeBlocks(full);
      // Get text outside of code blocks
      let finalExplanation = '';
      {
        let inBlock = false;
        let idx = 0;
        while (idx < full.length) {
          if (!inBlock && full[idx] === '`' && full.substring(idx, idx + 3) === '```') {
            const nl = full.indexOf('\n', idx + 3);
            if (nl === -1) break;
            inBlock = true;
            idx = nl + 1;
          } else if (inBlock && full[idx] === '`' && full.substring(idx, idx + 3) === '```') {
            inBlock = false;
            idx += 3;
            if (idx < full.length && full[idx] === '\n') idx++;
          } else if (!inBlock) {
            finalExplanation += full[idx];
            idx++;
          } else {
            idx++;
          }
        }
        finalExplanation = finalExplanation.trim();
      }

      if (finalFiles && mode === 'agent') {
        setFiles(prev => ({ ...prev, ...finalFiles }));
        setActiveFile(Object.keys(finalFiles)[0]);
        const count = Object.keys(finalFiles).length;
        setMessages(prev => prev.map(m => m.id === assistantMsg.id
          ? { ...m, content: finalExplanation || `Created ${count} file${count > 1 ? 's' : ''}.`, files: finalFiles, isStreaming: false }
          : m
        ));
        setTimeout(() => setRightTab('preview'), 500);
      } else {
        setMessages(prev => prev.map(m => m.id === assistantMsg.id
          ? { ...m, content: mode === 'agent' ? (finalExplanation || 'Done.') : full, isStreaming: false }
          : m
        ));
      }
      setActiveWritingFiles([]);
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        // User stopped - keep whatever content we have
        setMessages(prev => prev.map(m => m.id === assistantMsg.id
          ? { ...m, content: m.content || 'Stopped by user.', isStreaming: false }
          : m
        ));
      } else {
        setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, content: 'Connection failed.', isStreaming: false } : m));
      }
      setActiveWritingFiles([]);
    } finally {
      setIsGenerating(false);
      abortRef.current = null;
    }
  }, [input, mode, files, framework, isGenerating]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* ════════════════════════════════════════════════════════════════
          LEFT PANEL — Chat
         ════════════════════════════════════════════════════════════════ */}
      <div className="w-[400px] min-w-[360px] flex flex-col border-r border-white/5 bg-[#0a0a0f]">
        {/* Header */}
        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
              <Code2 className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-white">Code Agent</span>
          </div>

          {/* Framework selector */}
          <div className="relative">
            <button
              onClick={() => setFwOpen(!fwOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-xs text-white/60 hover:bg-white/10 transition-colors"
            >
              {framework.charAt(0).toUpperCase() + framework.slice(1)}
              <ChevronDown className="w-3 h-3" />
            </button>
            {fwOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setFwOpen(false)} />
                <div className="absolute right-0 top-full mt-1 w-36 bg-[#12121a] border border-white/10 rounded-lg shadow-xl z-50 py-1">
                  {(['html', 'react', 'vue', 'svelte', 'vanilla'] as Framework[]).map(fw => (
                    <button
                      key={fw}
                      onClick={() => switchFramework(fw)}
                      className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${framework === fw ? 'bg-blue-600/20 text-blue-400' : 'text-white/60 hover:bg-white/5'}`}
                    >
                      {fw.charAt(0).toUpperCase() + fw.slice(1)}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Mode toggle */}
        <div className="px-4 py-2 border-b border-white/5">
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-white/5">
            {(['plan', 'agent'] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${
                  mode === m ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/60'
                }`}
              >
                {m === 'plan' ? '💡 Plan' : '⚡ Agent'}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-white/25 mt-1.5 text-center">
            {mode === 'plan' ? 'Discuss and plan before coding' : 'AI writes code directly'}
          </p>
        </div>

        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600/20 to-cyan-500/20 border border-blue-500/20 flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">What do you want to build?</h3>
              <p className="text-xs text-white/40 text-center mb-6 max-w-[280px]">
                Describe your app and the AI will build it. You can iterate with follow-up prompts.
              </p>
              <div className="space-y-2 w-full">
                {STARTERS.map(s => (
                  <button
                    key={s.label}
                    onClick={() => handleSend(s.prompt)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-white/10 transition-all text-left group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-600/10 flex items-center justify-center shrink-0 group-hover:bg-blue-600/20 transition-colors">
                      <s.icon className="w-4 h-4 text-blue-400" />
                    </div>
                    <span className="text-xs text-white/60 group-hover:text-white/80 transition-colors">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence>
            {messages.map(msg => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[90%] ${msg.role === 'user' ? 'order-2' : ''}`}>
                  {/* Avatar + name */}
                  <div className={`flex items-center gap-2 mb-1 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                    {msg.role === 'assistant' && (
                      <div className="w-5 h-5 rounded-md bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
                        <Bot className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <span className="text-[10px] text-white/30">{msg.role === 'user' ? 'You' : 'XERON'}</span>
                    {msg.mode === 'plan' && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">Plan</span>}
                  </div>

                  {/* Message bubble */}
                  <div className={`px-3 py-2.5 rounded-xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-blue-600/20 text-white/90 border border-blue-500/20'
                      : 'bg-white/[0.04] text-white/80 border border-white/5'
                  }`}>
                    {msg.isStreaming && !msg.content && activeWritingFiles.length === 0 ? (
                      <div className="flex items-center gap-1.5">
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-xs text-white/30">Thinking...</span>
                      </div>
                    ) : msg.content ? (
                      <div className="whitespace-pre-wrap text-xs">{msg.content}</div>
                    ) : null}

                    {/* Live file writing indicator while streaming */}
                    {msg.isStreaming && activeWritingFiles.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
                          <span className="text-[11px] text-blue-400 font-medium">Writing files...</span>
                        </div>
                        {activeWritingFiles.map(name => (
                          <div key={name} className="flex items-center gap-2 px-2 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[11px]">
                            <FileCode2 className="w-3 h-3 shrink-0 animate-pulse" />
                            {name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Completed file changes */}
                  {!msg.isStreaming && msg.files && Object.keys(msg.files).length > 0 && (
                    <div className="mt-2 space-y-1">
                      <p className="text-[10px] text-green-400/60">
                        {Object.keys(msg.files).length} file{Object.keys(msg.files).length > 1 ? 's' : ''} created
                      </p>
                      {Object.keys(msg.files).map(name => (
                        <button
                          key={name}
                          onClick={() => { setActiveFile(name); setRightTab('code'); }}
                          className="flex items-center gap-2 px-2 py-1 rounded-md bg-green-500/10 border border-green-500/20 text-green-400 text-[11px] hover:bg-green-500/20 transition-colors w-full text-left"
                        >
                          <FileCode2 className="w-3 h-3 shrink-0" />
                          {name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={chatEndRef} />
        </div>

        {/* Chat input */}
        <div className="px-4 py-3 border-t border-white/5">
          <div className="flex items-end gap-2 rounded-xl bg-white/[0.04] border border-white/8 p-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={mode === 'plan' ? 'Ask a question or plan your app...' : 'Describe what you want to build...'}
              rows={1}
              className="flex-1 bg-transparent text-sm text-white placeholder:text-white/25 outline-none resize-none min-h-[36px] max-h-[120px] py-1"
              style={{ height: 'auto' }}
              onInput={e => { const t = e.target as HTMLTextAreaElement; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 120) + 'px'; }}
            />
            {isGenerating ? (
              <button
                onClick={handleStop}
                className="p-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-all shrink-0"
                title="Stop generating"
              >
                <Square className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => handleSend()}
                disabled={!input.trim()}
                className={`p-2 rounded-lg transition-all shrink-0 ${
                  input.trim()
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-white/5 text-white/20'
                }`}
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex items-center justify-between mt-1.5 px-1">
            <span className="text-[10px] text-white/20">Enter to send · Shift+Enter new line</span>
            <span className="text-[10px] text-white/20">Claude Opus 4.6</span>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          RIGHT PANEL — Preview / Code
         ════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0c0c14]">
        {/* Tabs */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-[#0a0a0f]">
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-white/5">
            <button
              onClick={() => setRightTab('preview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                rightTab === 'preview' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
              }`}
            >
              <Eye className="w-3.5 h-3.5" /> Preview
            </button>
            <button
              onClick={() => setRightTab('code')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                rightTab === 'code' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" /> Code
            </button>
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-1">
            {[
              { icon: Sparkles, label: 'Generate', action: () => { setMode('agent'); inputRef.current?.focus(); } },
              { icon: Bug, label: 'Fix', action: () => handleSend('Fix any bugs or issues in the current code') },
              { icon: BookOpen, label: 'Explain', action: () => { setMode('plan'); handleSend('Explain how this code works'); } },
            ].map(a => (
              <button
                key={a.label}
                onClick={a.action}
                disabled={isGenerating}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors disabled:opacity-30"
              >
                <a.icon className="w-3 h-3" /> {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0">
          {rightTab === 'preview' ? (
            <SandboxPreview files={files} framework={framework} className="h-full rounded-none border-0" />
          ) : (
            <div className="flex h-full">
              <FileTree
                files={files}
                activeFile={activeFile}
                onSelectFile={setActiveFile}
                onCreateFile={name => setFiles(prev => ({ ...prev, [name]: '' }))}
                onDeleteFile={name => {
                  const next = { ...files };
                  delete next[name];
                  setFiles(next);
                  if (activeFile === name) setActiveFile(Object.keys(next)[0] || '');
                }}
                onRenameFile={(old, nw) => {
                  const next = { ...files };
                  next[nw] = next[old];
                  delete next[old];
                  setFiles(next);
                  if (activeFile === old) setActiveFile(nw);
                }}
              />
              <div className="flex-1 min-w-0">
                <CodeEditor
                  files={files}
                  activeFile={activeFile}
                  onFileChange={(name, content) => setFiles(prev => ({ ...prev, [name]: content }))}
                  onActiveFileChange={setActiveFile}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}