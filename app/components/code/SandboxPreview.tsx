'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  RefreshCw,
  ExternalLink,
  Terminal,
  X,
  ChevronDown,
  AlertTriangle,
  Info,
  AlertCircle,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Framework = 'html' | 'react' | 'vue' | 'svelte' | 'vanilla';

interface ConsoleEntry {
  level: 'log' | 'warn' | 'error' | 'info';
  args: string[];
  timestamp: number;
}

interface SandboxPreviewProps {
  files: Record<string, string>;
  framework: Framework;
  className?: string;
}

// ---------------------------------------------------------------------------
// Console‑capture script injected into every iframe
// ---------------------------------------------------------------------------

const CONSOLE_CAPTURE_SCRIPT = `
<script>
(function() {
  var _origConsole = {
    log:   console.log.bind(console),
    warn:  console.warn.bind(console),
    error: console.error.bind(console),
    info:  console.info.bind(console),
  };

  function serialize(args) {
    return Array.prototype.map.call(args, function(a) {
      if (a === null) return 'null';
      if (a === undefined) return 'undefined';
      if (typeof a === 'object') {
        try { return JSON.stringify(a, null, 2); } catch(e) { return String(a); }
      }
      return String(a);
    });
  }

  ['log','warn','error','info'].forEach(function(level) {
    console[level] = function() {
      _origConsole[level].apply(console, arguments);
      try {
        window.parent.postMessage({
          __sandbox_console: true,
          level: level,
          args: serialize(arguments),
          timestamp: Date.now(),
        }, '*');
      } catch(e) {}
    };
  });

  window.addEventListener('error', function(e) {
    console.error(e.message + ' (line ' + e.lineno + ')');
  });

  window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled promise rejection: ' + (e.reason && e.reason.message ? e.reason.message : e.reason));
  });
})();
</script>`;

// ---------------------------------------------------------------------------
// HTML document builders per framework
// ---------------------------------------------------------------------------

function buildHtmlDoc(files: Record<string, string>): string {
  const html = files['index.html'] ?? '';
  const css = files['style.css'] ?? files['styles.css'] ?? '';
  const js = files['script.js'] ?? files['index.js'] ?? files['main.js'] ?? '';

  // If the user already provided a full HTML document just inject extras
  if (html.trim().toLowerCase().startsWith('<!doctype') || html.trim().toLowerCase().startsWith('<html')) {
    const injectedCss = css ? `<style>${css}</style>` : '';
    const injectedJs = js ? `<script>${js}<\/script>` : '';

    // Inject right before </head> or at the start
    let doc = html;
    if (doc.includes('</head>')) {
      doc = doc.replace('</head>', `${injectedCss}${CONSOLE_CAPTURE_SCRIPT}</head>`);
    } else {
      doc = CONSOLE_CAPTURE_SCRIPT + injectedCss + doc;
    }
    if (js && doc.includes('</body>')) {
      doc = doc.replace('</body>', `${injectedJs}</body>`);
    } else if (js) {
      doc += injectedJs;
    }
    return doc;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
${CONSOLE_CAPTURE_SCRIPT}
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: system-ui, -apple-system, sans-serif; }
${css}
</style>
</head>
<body>
${html}
<script>${js}<\/script>
</body>
</html>`;
}

function buildReactDoc(files: Record<string, string>): string {
  const jsx =
    files['app.jsx'] ??
    files['App.jsx'] ??
    files['index.jsx'] ??
    files['app.tsx'] ??
    files['App.tsx'] ??
    files['index.tsx'] ??
    '';
  const css = files['style.css'] ?? files['styles.css'] ?? '';
  const html = files['index.html'] ?? '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
${CONSOLE_CAPTURE_SCRIPT}
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: system-ui, -apple-system, sans-serif; }
${css}
</style>
<script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"><\/script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"><\/script>
<script crossorigin src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>
</head>
<body>
${html || '<div id="root"></div>'}
<script type="text/babel" data-type="module">
${jsx || `
function App() {
  return <h1>Hello from React</h1>;
}
`}

// Auto‑mount if App is defined and #root exists
if (typeof App !== 'undefined' && document.getElementById('root')) {
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(React.createElement(App));
}
<\/script>
</body>
</html>`;
}

function buildVueDoc(files: Record<string, string>): string {
  const vue =
    files['app.vue'] ??
    files['App.vue'] ??
    files['index.vue'] ??
    files['app.js'] ??
    files['App.js'] ??
    '';
  const css = files['style.css'] ?? files['styles.css'] ?? '';
  const html = files['index.html'] ?? '';

  // Try to extract <template>, <script>, <style> blocks from SFC
  const templateMatch = vue.match(/<template>([\s\S]*?)<\/template>/);
  const scriptMatch = vue.match(/<script[^>]*>([\s\S]*?)<\/script>/);
  const styleMatch = vue.match(/<style[^>]*>([\s\S]*?)<\/style>/);

  const template = templateMatch ? templateMatch[1].trim() : vue;
  const script = scriptMatch ? scriptMatch[1].trim() : '';
  const sfcStyle = styleMatch ? styleMatch[1].trim() : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
${CONSOLE_CAPTURE_SCRIPT}
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: system-ui, -apple-system, sans-serif; }
${css}
${sfcStyle}
</style>
<script src="https://unpkg.com/vue@3/dist/vue.global.js"><\/script>
</head>
<body>
${html || '<div id="app"></div>'}
<script>
(function() {
  ${script ? `
  // User component script
  var __componentOptions = (function() {
    var exports = {};
    var module = { exports: exports };
    ${script.replace(/export\s+default\s+/, 'module.exports = ')}
    return module.exports;
  })();
  ` : 'var __componentOptions = {};'}

  __componentOptions.template = ${JSON.stringify(template || '<div>Hello from Vue</div>')};

  var app = Vue.createApp(__componentOptions);
  app.mount('#app');
})();
<\/script>
</body>
</html>`;
}

function buildSvelteDoc(files: Record<string, string>): string {
  const svelte =
    files['App.svelte'] ??
    files['app.svelte'] ??
    files['index.svelte'] ??
    '';
  const css = files['style.css'] ?? files['styles.css'] ?? '';

  // Extract blocks from .svelte file
  const scriptMatch = svelte.match(/<script[^>]*>([\s\S]*?)<\/script>/);
  const styleMatch = svelte.match(/<style[^>]*>([\s\S]*?)<\/style>/);

  const sfcStyle = styleMatch ? styleMatch[1].trim() : '';

  // Strip <script> and <style> to get the template markup
  let template = svelte
    .replace(/<script[^>]*>[\s\S]*?<\/script>/g, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/g, '')
    .trim();

  // Strip Svelte reactive syntax ({#each}, {#if}, {:else}, {/...}, {expression})
  // and turn simple {variable} into spans for display
  template = template
    .replace(/\{#[\s\S]*?\}/g, '')
    .replace(/\{\/[\s\S]*?\}/g, '')
    .replace(/\{:[\s\S]*?\}/g, '')
    .replace(/on:\w+\s*=\s*\{[^}]*\}/g, '')
    .replace(/bind:\w+\s*=\s*\{[^}]*\}/g, '');

  // Extract script variable declarations for initial values
  const scriptContent = scriptMatch ? scriptMatch[1].trim() : '';
  const varDeclarations: Record<string, string> = {};
  const varRegex = /(?:let|const|var)\s+(\w+)\s*=\s*(['"`])(.*?)\2/g;
  let m: RegExpExecArray | null;
  while ((m = varRegex.exec(scriptContent)) !== null) {
    varDeclarations[m[1]] = m[3];
  }
  const numVarRegex = /(?:let|const|var)\s+(\w+)\s*=\s*(\d+)/g;
  while ((m = numVarRegex.exec(scriptContent)) !== null) {
    varDeclarations[m[1]] = m[2];
  }

  // Replace {variable} with its initial value where possible
  template = template.replace(/\{(\w+)\}/g, (_, name) => {
    return varDeclarations[name] !== undefined ? varDeclarations[name] : name;
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
${CONSOLE_CAPTURE_SCRIPT}
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: system-ui, -apple-system, sans-serif; }
${css}
${sfcStyle}
</style>
</head>
<body>
<div id="app">
${template || '<p>Svelte template preview (static render)</p>'}
</div>
<script>
// Svelte in-browser compilation is too heavy.
// This is a static render of the template with initial variable values.
console.info('[SandboxPreview] Svelte components are rendered as static HTML previews. Reactive bindings are not active.');
<\/script>
</body>
</html>`;
}

function buildVanillaDoc(files: Record<string, string>): string {
  const js =
    files['script.js'] ??
    files['index.js'] ??
    files['main.js'] ??
    files['canvas.js'] ??
    '';
  const css = files['style.css'] ?? files['styles.css'] ?? '';
  const html = files['index.html'] ?? '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
${CONSOLE_CAPTURE_SCRIPT}
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: system-ui, -apple-system, sans-serif; overflow: hidden; }
canvas { display: block; }
${css}
</style>
</head>
<body>
${html || '<canvas id="canvas" width="800" height="600"></canvas>'}
<script>
// Provide convenient canvas references
var canvas = document.getElementById('canvas') || document.querySelector('canvas');
var ctx = canvas ? canvas.getContext('2d') : null;

// Auto-resize canvas to fill viewport if it exists
if (canvas) {
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
}

${js}
<\/script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Builders map
// ---------------------------------------------------------------------------

const DOC_BUILDERS: Record<Framework, (files: Record<string, string>) => string> = {
  html: buildHtmlDoc,
  react: buildReactDoc,
  vue: buildVueDoc,
  svelte: buildSvelteDoc,
  vanilla: buildVanillaDoc,
};

// ---------------------------------------------------------------------------
// Framework metadata
// ---------------------------------------------------------------------------

const FRAMEWORK_META: Record<Framework, { label: string; color: string }> = {
  html: { label: 'HTML', color: 'text-orange-400' },
  react: { label: 'React', color: 'text-cyan-400' },
  vue: { label: 'Vue', color: 'text-emerald-400' },
  svelte: { label: 'Svelte', color: 'text-red-400' },
  vanilla: { label: 'Vanilla JS', color: 'text-yellow-400' },
};

const FRAMEWORKS: Framework[] = ['html', 'react', 'vue', 'svelte', 'vanilla'];

// ---------------------------------------------------------------------------
// Console entry icon
// ---------------------------------------------------------------------------

function ConsoleIcon({ level }: { level: ConsoleEntry['level'] }) {
  switch (level) {
    case 'warn':
      return <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 shrink-0" />;
    case 'error':
      return <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />;
    case 'info':
      return <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
    default:
      return <Terminal className="w-3.5 h-3.5 text-white/30 shrink-0" />;
  }
}

const LEVEL_COLORS: Record<ConsoleEntry['level'], string> = {
  log: 'text-white/70',
  warn: 'text-yellow-300',
  error: 'text-red-300',
  info: 'text-blue-300',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SandboxPreview({
  files,
  framework: initialFramework,
  className,
}: SandboxPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  const [framework, setFramework] = useState<Framework>(initialFramework);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState<ConsoleEntry[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showFrameworkDropdown, setShowFrameworkDropdown] = useState(false);

  // Sync prop → state when the parent changes the framework
  useEffect(() => {
    setFramework(initialFramework);
  }, [initialFramework]);

  // Build the full HTML document
  const srcdoc = useMemo(() => {
    const builder = DOC_BUILDERS[framework];
    return builder(files);
  }, [files, framework, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for console messages from the iframe
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.data && event.data.__sandbox_console) {
        const entry: ConsoleEntry = {
          level: event.data.level,
          args: event.data.args,
          timestamp: event.data.timestamp,
        };
        setConsoleLogs((prev) => [...prev, entry]);
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // Auto-scroll console
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [consoleLogs]);

  // Clear console on refresh
  const handleRefresh = useCallback(() => {
    setConsoleLogs([]);
    setRefreshKey((k) => k + 1);
  }, []);

  // Open in new tab
  const handleOpenNewTab = useCallback(() => {
    const blob = new Blob([srcdoc], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    // Revoke after a short delay so the browser has time to load
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }, [srcdoc]);

  const meta = FRAMEWORK_META[framework];
  const errorCount = consoleLogs.filter((l) => l.level === 'error').length;

  return (
    <div className={cn('flex flex-col h-full w-full bg-[#0c0c14] rounded-xl border border-white/5 overflow-hidden', className)}>
      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between h-10 px-3 border-b border-white/5 bg-[#0a0a12] shrink-0">
        {/* Left: framework selector */}
        <div className="relative">
          <button
            onClick={() => setShowFrameworkDropdown((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-medium hover:bg-white/5 px-2 py-1 rounded-md transition-colors"
          >
            <span className={cn('font-semibold', meta.color)}>{meta.label}</span>
            <ChevronDown className="w-3 h-3 text-white/40" />
          </button>

          {showFrameworkDropdown && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowFrameworkDropdown(false)}
              />
              <div className="absolute top-full left-0 mt-1 z-50 bg-[#12121a] border border-white/10 rounded-lg shadow-xl py-1 min-w-[140px]">
                {FRAMEWORKS.map((fw) => (
                  <button
                    key={fw}
                    onClick={() => {
                      setFramework(fw);
                      setShowFrameworkDropdown(false);
                      handleRefresh();
                    }}
                    className={cn(
                      'w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-white/5',
                      fw === framework ? 'bg-white/5' : '',
                    )}
                  >
                    <span className={cn('font-medium', FRAMEWORK_META[fw].color)}>
                      {FRAMEWORK_META[fw].label}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleRefresh}
            title="Refresh preview"
            className="p-1.5 rounded-md text-white/40 hover:text-white hover:bg-white/5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleOpenNewTab}
            title="Open in new tab"
            className="p-1.5 rounded-md text-white/40 hover:text-white hover:bg-white/5 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setConsoleOpen((v) => !v)}
            title="Toggle console"
            className={cn(
              'p-1.5 rounded-md transition-colors relative',
              consoleOpen
                ? 'text-blue-400 bg-blue-500/10'
                : 'text-white/40 hover:text-white hover:bg-white/5',
            )}
          >
            <Terminal className="w-3.5 h-3.5" />
            {errorCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 text-[9px] font-bold bg-red-500 text-white rounded-full flex items-center justify-center">
                {errorCount > 9 ? '9+' : errorCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Preview iframe ──────────────────────────────────────── */}
      <div className="flex-1 relative min-h-0">
        <iframe
          ref={iframeRef}
          key={refreshKey}
          srcDoc={srcdoc}
          sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
          title="Sandbox Preview"
          className="absolute inset-0 w-full h-full bg-white border-0"
        />
      </div>

      {/* ── Console panel ───────────────────────────────────────── */}
      {consoleOpen && (
        <div className="shrink-0 border-t border-white/5 bg-[#0a0a12] flex flex-col max-h-[200px]">
          {/* Console header */}
          <div className="flex items-center justify-between px-3 h-8 border-b border-white/5 shrink-0">
            <div className="flex items-center gap-2">
              <Terminal className="w-3 h-3 text-white/30" />
              <span className="text-[10px] font-medium text-white/50 uppercase tracking-wider">
                Console
              </span>
              {consoleLogs.length > 0 && (
                <span className="text-[10px] text-white/30">
                  ({consoleLogs.length})
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setConsoleLogs([])}
                title="Clear console"
                className="text-[10px] text-white/30 hover:text-white/60 px-1.5 py-0.5 rounded transition-colors"
              >
                Clear
              </button>
              <button
                onClick={() => setConsoleOpen(false)}
                className="p-0.5 rounded text-white/30 hover:text-white/60 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Console entries */}
          <div className="flex-1 overflow-y-auto font-mono text-xs">
            {consoleLogs.length === 0 ? (
              <div className="flex items-center justify-center h-full text-white/20 text-[11px]">
                No console output
              </div>
            ) : (
              consoleLogs.map((entry, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex items-start gap-2 px-3 py-1 border-b border-white/[0.03] hover:bg-white/[0.02]',
                    entry.level === 'error' && 'bg-red-500/[0.04]',
                    entry.level === 'warn' && 'bg-yellow-500/[0.04]',
                  )}
                >
                  <ConsoleIcon level={entry.level} />
                  <span className={cn('whitespace-pre-wrap break-all leading-relaxed', LEVEL_COLORS[entry.level])}>
                    {entry.args.join(' ')}
                  </span>
                </div>
              ))
            )}
            <div ref={consoleEndRef} />
          </div>
        </div>
      )}
    </div>
  );
}
