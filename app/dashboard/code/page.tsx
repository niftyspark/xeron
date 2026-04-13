'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { CodeEditor } from '@/app/components/code/CodeEditor';
import { SandboxPreview } from '@/app/components/code/SandboxPreview';
import { FileTree } from '@/app/components/code/FileTree';
import {
  Send,
  Sparkles,
  Bug,
  BookOpen,
  Play,
  GripVertical,
  ChevronDown,
  Loader2,
  Bot,
  User,
  Code2,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Framework = 'html' | 'react' | 'vue' | 'svelte' | 'vanilla';
type Action = 'generate' | 'edit' | 'fix' | 'explain';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ---------------------------------------------------------------------------
// Default starter files per framework
// ---------------------------------------------------------------------------

const DEFAULT_FILES: Record<Framework, Record<string, string>> = {
  html: {
    'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>My Project</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <div class="container">
    <h1>Hello World</h1>
    <p>Start building something amazing!</p>
  </div>
  <script src="script.js"><\/script>
</body>
</html>`,
    'style.css': `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  background: #0f0f1a;
  color: #e0e0e0;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.container {
  text-align: center;
  padding: 2rem;
}

h1 {
  font-size: 2.5rem;
  background: linear-gradient(135deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 0.5rem;
}

p {
  color: #888;
  font-size: 1.1rem;
}`,
    'script.js': `// Your JavaScript code here
console.log('Hello from XERON Code Agent!');`,
  },

  react: {
    'App.jsx': `function App() {
  const [count, setCount] = React.useState(0);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0f0f1a',
      color: '#e0e0e0',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <h1 style={{
        fontSize: '2.5rem',
        background: 'linear-gradient(135deg, #667eea, #764ba2)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        marginBottom: '1rem',
      }}>
        React App
      </h1>
      <p style={{ color: '#888', marginBottom: '1.5rem' }}>Count: {count}</p>
      <button
        onClick={() => setCount(c => c + 1)}
        style={{
          padding: '0.75rem 2rem',
          borderRadius: '0.5rem',
          border: 'none',
          background: 'linear-gradient(135deg, #667eea, #764ba2)',
          color: 'white',
          fontSize: '1rem',
          cursor: 'pointer',
          fontWeight: 600,
        }}
      >
        Increment
      </button>
    </div>
  );
}`,
    'style.css': `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}`,
  },

  vue: {
    'App.vue': `<template>
  <div class="app">
    <h1>Vue App</h1>
    <p>Count: {{ count }}</p>
    <button @click="count++">Increment</button>
  </div>
</template>

<script>
export default {
  data() {
    return {
      count: 0,
    };
  },
};
</script>

<style>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #0f0f1a;
  color: #e0e0e0;
  font-family: system-ui, -apple-system, sans-serif;
}

h1 {
  font-size: 2.5rem;
  background: linear-gradient(135deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 1rem;
}

p {
  color: #888;
  margin-bottom: 1.5rem;
}

button {
  padding: 0.75rem 2rem;
  border-radius: 0.5rem;
  border: none;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  font-size: 1rem;
  cursor: pointer;
  font-weight: 600;
}
</style>`,
    'style.css': `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}`,
  },

  svelte: {
    'App.svelte': `<script>
  let count = 0;
</script>

<div class="app">
  <h1>Svelte App</h1>
  <p>Count: {count}</p>
  <button on:click={() => count++}>Increment</button>
</div>

<style>
  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: #0f0f1a;
    color: #e0e0e0;
    font-family: system-ui, -apple-system, sans-serif;
  }

  h1 {
    font-size: 2.5rem;
    background: linear-gradient(135deg, #667eea, #764ba2);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 1rem;
  }

  p {
    color: #888;
    margin-bottom: 1.5rem;
  }

  button {
    padding: 0.75rem 2rem;
    border-radius: 0.5rem;
    border: none;
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    font-size: 1rem;
    cursor: pointer;
    font-weight: 600;
  }
</style>`,
    'style.css': `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}`,
  },

  vanilla: {
    'index.html': `<canvas id="canvas"></canvas>`,
    'style.css': `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  overflow: hidden;
  background: #0a0a0f;
}

canvas {
  display: block;
}`,
    'script.js': `// Particle animation
const particles = [];
const PARTICLE_COUNT = 120;

for (let i = 0; i < PARTICLE_COUNT; i++) {
  particles.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: (Math.random() - 0.5) * 1.5,
    vy: (Math.random() - 0.5) * 1.5,
    radius: Math.random() * 2 + 1,
  });
}

function draw() {
  ctx.fillStyle = 'rgba(10, 10, 15, 0.15)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;

    if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
    if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(102, 126, 234, 0.8)';
    ctx.fill();
  }

  // Draw connections
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 120) {
        ctx.beginPath();
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.strokeStyle = \`rgba(102, 126, 234, \${0.3 * (1 - dist / 120)})\`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }
  }

  requestAnimationFrame(draw);
}

draw();`,
  },
};

// ---------------------------------------------------------------------------
// Framework metadata
// ---------------------------------------------------------------------------

const FRAMEWORK_OPTIONS: { value: Framework; label: string; color: string }[] = [
  { value: 'html', label: 'HTML', color: 'text-orange-400' },
  { value: 'react', label: 'React', color: 'text-cyan-400' },
  { value: 'vue', label: 'Vue', color: 'text-emerald-400' },
  { value: 'svelte', label: 'Svelte', color: 'text-red-400' },
  { value: 'vanilla', label: 'Vanilla JS', color: 'text-yellow-400' },
];

// ---------------------------------------------------------------------------
// Parse code blocks from streamed AI response
// ---------------------------------------------------------------------------

function parseCodeBlocks(text: string): Record<string, string> {
  const files: Record<string, string> = {};
  // Match ```filename.ext\n...code...\n``` blocks
  const regex = /```([a-zA-Z0-9_\-/.]+\.[a-zA-Z0-9]+)\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const filename = match[1].trim();
    const code = match[2].trimEnd();
    files[filename] = code;
  }
  return files;
}

// ---------------------------------------------------------------------------
// Strip code blocks to get explanation text
// ---------------------------------------------------------------------------

function extractExplanation(text: string): string {
  // Remove all code blocks, then trim
  return text
    .replace(/```[a-zA-Z0-9_\-/.]+\.[a-zA-Z0-9]+\n[\s\S]*?```/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CodePage() {
  // -- State ----------------------------------------------------------------
  const [files, setFiles] = useState<Record<string, string>>(DEFAULT_FILES.html);
  const [activeFile, setActiveFile] = useState<string>('index.html');
  const [framework, setFramework] = useState<Framework>('html');
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [showFrameworkDropdown, setShowFrameworkDropdown] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(true);
  const [previewWidth, setPreviewWidth] = useState(40); // percentage

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isDraggingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // -- Framework switch -----------------------------------------------------
  const switchFramework = useCallback((fw: Framework) => {
    setFramework(fw);
    const defaults = DEFAULT_FILES[fw];
    setFiles(defaults);
    setActiveFile(Object.keys(defaults)[0]);
    setChatMessages([]);
    setShowFrameworkDropdown(false);
  }, []);

  // -- File tree handlers ---------------------------------------------------
  const handleFileChange = useCallback((filename: string, newContent: string) => {
    setFiles((prev) => ({ ...prev, [filename]: newContent }));
  }, []);

  const handleCreateFile = useCallback((filename: string) => {
    setFiles((prev) => ({ ...prev, [filename]: '' }));
    setActiveFile(filename);
  }, []);

  const handleDeleteFile = useCallback(
    (filename: string) => {
      setFiles((prev) => {
        const next = { ...prev };
        delete next[filename];
        return next;
      });
      setActiveFile((prev) => {
        if (prev === filename) {
          const remaining = Object.keys(files).filter((f) => f !== filename);
          return remaining[0] ?? '';
        }
        return prev;
      });
    },
    [files],
  );

  const handleRenameFile = useCallback(
    (oldName: string, newName: string) => {
      setFiles((prev) => {
        const next = { ...prev };
        next[newName] = next[oldName];
        delete next[oldName];
        return next;
      });
      if (activeFile === oldName) {
        setActiveFile(newName);
      }
    },
    [activeFile],
  );

  // -- AI request -----------------------------------------------------------
  const sendToAI = useCallback(
    async (prompt: string, action: Action) => {
      if (!prompt.trim() || isGenerating) return;

      setIsGenerating(true);
      setChatMessages((prev) => [...prev, { role: 'user', content: prompt }]);
      setInputValue('');

      // Accumulate streamed text
      let fullText = '';

      // Add a placeholder assistant message
      setChatMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      try {
        const response = await fetch('/api/ai/code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            files,
            framework,
            action,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Request failed: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;

            const data = trimmed.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                fullText += delta;
                // Update the last assistant message
                setChatMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: 'assistant',
                    content: fullText,
                  };
                  return updated;
                });
              }
            } catch {
              // Skip malformed chunks
            }
          }
        }

        // Parse code blocks from the complete response and update files
        const extractedFiles = parseCodeBlocks(fullText);
        if (Object.keys(extractedFiles).length > 0) {
          setFiles((prev) => {
            const merged = { ...prev, ...extractedFiles };
            return merged;
          });
          // Switch to the first new/updated file
          const firstFile = Object.keys(extractedFiles)[0];
          if (firstFile) {
            setActiveFile(firstFile);
          }
        }
      } catch (err: any) {
        setChatMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'assistant',
            content: `Error: ${err.message}`,
          };
          return updated;
        });
      } finally {
        setIsGenerating(false);
      }
    },
    [files, framework, isGenerating],
  );

  // -- Submit handler -------------------------------------------------------
  const handleSubmit = useCallback(() => {
    if (inputValue.trim()) {
      sendToAI(inputValue, 'edit');
    }
  }, [inputValue, sendToAI]);

  // -- Quick actions --------------------------------------------------------
  const handleGenerate = useCallback(() => {
    const prompt = inputValue.trim() || 'Create a beautiful, interactive landing page';
    sendToAI(prompt, 'generate');
  }, [inputValue, sendToAI]);

  const handleFixBugs = useCallback(() => {
    sendToAI('Analyze and fix any bugs in the current code', 'fix');
  }, [sendToAI]);

  const handleExplain = useCallback(() => {
    sendToAI('Explain this code in detail', 'explain');
  }, [sendToAI]);

  // -- Resizable panels drag ------------------------------------------------
  const handleDragStart = useCallback(() => {
    isDraggingRef.current = true;

    const handleDragMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const totalWidth = rect.width - 220; // subtract file tree width
      const mouseX = e.clientX - rect.left - 220;
      const editorFraction = mouseX / totalWidth;
      const previewPct = Math.max(20, Math.min(70, (1 - editorFraction) * 100));
      setPreviewWidth(previewPct);
    };

    const handleDragEnd = () => {
      isDraggingRef.current = false;
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
  }, []);

  // -- Key handler for textarea ---------------------------------------------
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  // -- Current framework meta -----------------------------------------------
  const currentFw = FRAMEWORK_OPTIONS.find((f) => f.value === framework)!;

  return (
    <div ref={containerRef} className="flex h-full w-full bg-[#08080d] overflow-hidden">
      {/* ── LEFT: File Tree ──────────────────────────────────────── */}
      <FileTree
        files={files}
        activeFile={activeFile}
        onSelectFile={setActiveFile}
        onCreateFile={handleCreateFile}
        onDeleteFile={handleDeleteFile}
        onRenameFile={handleRenameFile}
      />

      {/* ── CENTER: Editor + Chat ────────────────────────────────── */}
      <div
        className="flex-1 flex flex-col min-w-0 min-h-0"
        style={previewVisible ? { width: `${100 - previewWidth}%` } : undefined}
      >
        {/* Toolbar */}
        <div className="flex items-center justify-between h-11 px-3 border-b border-white/5 bg-[#0a0a12] shrink-0">
          {/* Left: framework + branding */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Code2 className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-semibold text-white/80">Code Agent</span>
            </div>

            {/* Framework switcher */}
            <div className="relative">
              <button
                onClick={() => setShowFrameworkDropdown((v) => !v)}
                className="flex items-center gap-1.5 text-xs font-medium hover:bg-white/5 px-2.5 py-1.5 rounded-md transition-colors border border-white/5"
              >
                <span className={`font-semibold ${currentFw.color}`}>{currentFw.label}</span>
                <ChevronDown className="w-3 h-3 text-white/40" />
              </button>

              {showFrameworkDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowFrameworkDropdown(false)}
                  />
                  <div className="absolute top-full left-0 mt-1 z-50 bg-[#12121a] border border-white/10 rounded-lg shadow-xl py-1 min-w-[140px]">
                    {FRAMEWORK_OPTIONS.map((fw) => (
                      <button
                        key={fw.value}
                        onClick={() => switchFramework(fw.value)}
                        className={`w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-white/5 ${
                          fw.value === framework ? 'bg-white/5' : ''
                        }`}
                      >
                        <span className={`font-medium ${fw.color}`}>{fw.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right: quick actions */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/20 text-blue-300 hover:border-blue-500/40 transition-colors disabled:opacity-40"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Generate
            </button>
            <button
              onClick={handleFixBugs}
              disabled={isGenerating}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-white/50 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-40"
            >
              <Bug className="w-3.5 h-3.5" />
              Fix Bugs
            </button>
            <button
              onClick={handleExplain}
              disabled={isGenerating}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-white/50 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-40"
            >
              <BookOpen className="w-3.5 h-3.5" />
              Explain
            </button>

            <div className="w-px h-5 bg-white/10 mx-1" />

            <button
              onClick={() => setPreviewVisible((v) => !v)}
              title={previewVisible ? 'Hide preview' : 'Show preview'}
              className="p-1.5 rounded-md text-white/40 hover:text-white hover:bg-white/5 transition-colors"
            >
              {previewVisible ? (
                <PanelRightClose className="w-4 h-4" />
              ) : (
                <PanelRightOpen className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Editor area */}
        <div className="flex-1 min-h-0">
          <CodeEditor
            files={files}
            activeFile={activeFile}
            onFileChange={handleFileChange}
            onActiveFileChange={setActiveFile}
          />
        </div>

        {/* Chat panel at bottom */}
        <div className="shrink-0 border-t border-white/5 bg-[#0a0a12]">
          {/* Chat messages (scrollable, limited height) */}
          {chatMessages.length > 0 && (
            <div className="max-h-[200px] overflow-y-auto px-3 py-2 space-y-2 border-b border-white/5">
              {chatMessages.map((msg, i) => {
                const isUser = msg.role === 'user';
                const displayText = isUser ? msg.content : extractExplanation(msg.content);
                if (!displayText) return null;

                return (
                  <div key={i} className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
                    {!isUser && (
                      <div className="w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="w-3.5 h-3.5 text-blue-400" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                        isUser
                          ? 'bg-blue-600/20 text-blue-100 border border-blue-500/20'
                          : 'bg-white/5 text-white/70 border border-white/5'
                      }`}
                    >
                      {displayText}
                    </div>
                    {isUser && (
                      <div className="w-6 h-6 rounded-full bg-purple-600/20 flex items-center justify-center shrink-0 mt-0.5">
                        <User className="w-3.5 h-3.5 text-purple-400" />
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>
          )}

          {/* Input */}
          <div className="flex items-end gap-2 px-3 py-2.5">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isGenerating
                  ? 'AI is generating...'
                  : 'Describe what you want to build or change...'
              }
              disabled={isGenerating}
              rows={1}
              className="flex-1 resize-none bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none focus:border-blue-500/50 transition-colors disabled:opacity-40 max-h-[100px] overflow-y-auto"
              style={{ minHeight: '38px' }}
            />
            <button
              onClick={handleSubmit}
              disabled={isGenerating || !inputValue.trim()}
              className="shrink-0 h-[38px] w-[38px] rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:hover:bg-blue-600 flex items-center justify-center transition-colors"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              ) : (
                <Send className="w-4 h-4 text-white" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── DRAG HANDLE ──────────────────────────────────────────── */}
      {previewVisible && (
        <div
          onMouseDown={handleDragStart}
          className="w-1.5 cursor-col-resize bg-white/[0.02] hover:bg-blue-500/20 transition-colors flex items-center justify-center shrink-0 group"
        >
          <GripVertical className="w-3 h-3 text-white/10 group-hover:text-blue-400/50 transition-colors" />
        </div>
      )}

      {/* ── RIGHT: Sandbox Preview ───────────────────────────────── */}
      {previewVisible && (
        <div className="min-w-0 min-h-0 shrink-0" style={{ width: `${previewWidth}%` }}>
          <SandboxPreview files={files} framework={framework} className="h-full rounded-none border-0" />
        </div>
      )}
    </div>
  );
}
