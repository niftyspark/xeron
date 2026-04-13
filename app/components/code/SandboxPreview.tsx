'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  RefreshCw, ExternalLink, Terminal, X, Monitor, Tablet, Smartphone,
  Globe, ChevronDown, Trash2,
} from 'lucide-react';

type Framework = 'html' | 'react' | 'vue' | 'svelte' | 'vanilla';

interface ConsoleEntry {
  level: 'log' | 'warn' | 'error' | 'info';
  args: string[];
  ts: number;
}

interface Props {
  files: Record<string, string>;
  framework: Framework;
  className?: string;
}

// ── console capture script injected into every iframe ──────────────────────
const CONSOLE_CAPTURE = `<script>
(function(){
  var _p=window.parent;
  ['log','warn','error','info'].forEach(function(l){
    var _o=console[l];
    console[l]=function(){
      var a=Array.prototype.slice.call(arguments).map(function(x){
        try{return typeof x==='object'?JSON.stringify(x,null,2):String(x)}catch(e){return String(x)}
      });
      _p.postMessage({__xeron_console:true,level:l,args:a},'*');
      _o.apply(console,arguments);
    };
  });
  window.onerror=function(m,s,l,c,e){
    _p.postMessage({__xeron_console:true,level:'error',args:['Error: '+m+(s?' at '+s+':'+l:'')]},'*');
  };
  window.addEventListener('unhandledrejection',function(e){
    _p.postMessage({__xeron_console:true,level:'error',args:['Unhandled: '+(e.reason&&e.reason.message||e.reason||'Promise rejected')]},'*');
  });
})();
</script>`;

// ── framework builders ─────────────────────────────────────────────────────
function buildHTML(files: Record<string, string>): string {
  const html = files['index.html'] || '<p>No index.html</p>';
  const css = files['style.css'] || '';
  const js = files['script.js'] || '';
  if (html.includes('<!DOCTYPE') || html.includes('<html')) {
    return html.replace('</head>', `<style>${css}</style>${CONSOLE_CAPTURE}</head>`)
               .replace('</body>', `<script>${js}<\/script></body>`);
  }
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;}</style><style>${css}</style>${CONSOLE_CAPTURE}</head><body>${html}<script>${js}<\/script></body></html>`;
}

function buildReact(files: Record<string, string>): string {
  const jsx = files['App.jsx'] || files['App.tsx'] || files['app.jsx'] || 'function App(){return <h1>Hello</h1>}';
  const css = files['style.css'] || '';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<script src="https://unpkg.com/react@18/umd/react.development.js"><\/script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"><\/script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;}</style>
<style>${css}</style>${CONSOLE_CAPTURE}</head><body><div id="root"></div>
<script type="text/babel" data-type="module">
${jsx}
const _App = typeof App !== 'undefined' ? App : () => React.createElement('p',null,'Define an App component');
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(_App));
<\/script></body></html>`;
}

function buildVue(files: Record<string, string>): string {
  const vue = files['App.vue'] || files['app.vue'] || '<template><h1>Hello Vue</h1></template>';
  const css = files['style.css'] || '';
  const tplMatch = vue.match(/<template>([\s\S]*?)<\/template>/);
  const scrMatch = vue.match(/<script[^>]*>([\s\S]*?)<\/script>/);
  const styMatch = vue.match(/<style[^>]*>([\s\S]*?)<\/style>/);
  const tpl = tplMatch ? tplMatch[1] : '<h1>Hello Vue</h1>';
  const scr = scrMatch ? scrMatch[1].replace(/export\s+default/, 'const _component =') : 'const _component = {}';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<script src="https://unpkg.com/vue@3/dist/vue.global.prod.js"><\/script>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;}</style>
<style>${css}</style>${styMatch ? `<style>${styMatch[1]}</style>` : ''}${CONSOLE_CAPTURE}</head><body><div id="app">${tpl}</div>
<script>${scr};Vue.createApp(_component).mount('#app');<\/script></body></html>`;
}

function buildVanilla(files: Record<string, string>): string {
  const html = files['index.html'] || '<canvas id="canvas"></canvas>';
  const css = files['style.css'] || 'canvas{display:block;width:100vw;height:100vh}';
  const js = files['script.js'] || '';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;overflow:hidden;}</style>
<style>${css}</style>${CONSOLE_CAPTURE}</head><body>${html}<script>${js}<\/script></body></html>`;
}

function buildDoc(files: Record<string, string>, fw: Framework): string {
  switch (fw) {
    case 'react': return buildReact(files);
    case 'vue': return buildVue(files);
    case 'svelte': return buildHTML(files); // fallback to HTML for svelte
    case 'vanilla': return buildVanilla(files);
    default: return buildHTML(files);
  }
}

const DEVICES = [
  { id: 'desktop', icon: Monitor, w: '100%', label: 'Desktop' },
  { id: 'tablet', icon: Tablet, w: '768px', label: 'Tablet' },
  { id: 'mobile', icon: Smartphone, w: '375px', label: 'Mobile' },
] as const;

export function SandboxPreview({ files, framework, className }: Props) {
  const [device, setDevice] = useState<string>('desktop');
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [entries, setEntries] = useState<ConsoleEntry[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const srcdoc = useMemo(() => buildDoc(files, framework), [files, framework, refreshKey]);
  const errorCount = entries.filter(e => e.level === 'error').length;

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.__xeron_console) {
        setEntries(prev => [...prev.slice(-200), { level: e.data.level, args: e.data.args, ts: Date.now() }]);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  useEffect(() => { setLoading(true); }, [srcdoc]);

  const openExternal = useCallback(() => {
    const blob = new Blob([srcdoc], { type: 'text/html' });
    window.open(URL.createObjectURL(blob), '_blank');
  }, [srcdoc]);

  const deviceConfig = DEVICES.find(d => d.id === device) || DEVICES[0];

  return (
    <div className={cn('flex flex-col h-full bg-[#0c0c14] rounded-lg overflow-hidden border border-white/5', className)}>
      {/* ── Browser chrome ───────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[#111119] border-b border-white/5">
        {/* Traffic lights */}
        <div className="flex items-center gap-1.5 mr-2">
          <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
          <div className="w-3 h-3 rounded-full bg-[#28c840]" />
        </div>

        {/* URL bar */}
        <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0a0a12] border border-white/8">
          <Globe className="w-3.5 h-3.5 text-white/30 shrink-0" />
          <span className="text-xs text-white/40 truncate font-mono">
            localhost:3000
          </span>
        </div>

        {/* Device toggles */}
        <div className="flex items-center gap-0.5 ml-1">
          {DEVICES.map(d => (
            <button
              key={d.id}
              onClick={() => setDevice(d.id)}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                device === d.id ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'
              )}
              title={d.label}
            >
              <d.icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 ml-1">
          <button
            onClick={() => { setRefreshKey(k => k + 1); setEntries([]); }}
            className="p-1.5 rounded-md text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={openExternal}
            className="p-1.5 rounded-md text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors"
            title="Open in new tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setConsoleOpen(!consoleOpen)}
            className={cn(
              'p-1.5 rounded-md transition-colors relative',
              consoleOpen ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'
            )}
            title="Console"
          >
            <Terminal className="w-3.5 h-3.5" />
            {errorCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] flex items-center justify-center text-white font-bold">
                {errorCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Loading bar ──────────────────────────────────────────────── */}
      {loading && (
        <div className="h-0.5 bg-[#0a0a12]">
          <div className="h-full bg-blue-500 animate-pulse" style={{ width: '60%' }} />
        </div>
      )}

      {/* ── Preview area ─────────────────────────────────────────────── */}
      <div className="flex-1 flex items-start justify-center overflow-auto bg-[#0a0a0f] p-0">
        <div
          className="h-full transition-all duration-300 bg-white"
          style={{ width: deviceConfig.w, maxWidth: '100%' }}
        >
          <iframe
            key={refreshKey}
            ref={iframeRef}
            srcDoc={srcdoc}
            sandbox="allow-scripts allow-modals allow-forms allow-same-origin allow-popups"
            className="w-full h-full border-0"
            onLoad={() => setLoading(false)}
            title="Preview"
          />
        </div>
      </div>

      {/* ── Console panel ────────────────────────────────────────────── */}
      {consoleOpen && (
        <div className="border-t border-white/5 bg-[#0a0a0f] max-h-48 flex flex-col">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/5">
            <span className="text-xs text-white/50 font-medium">Console</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setEntries([])} className="p-1 text-white/30 hover:text-white/60">
                <Trash2 className="w-3 h-3" />
              </button>
              <button onClick={() => setConsoleOpen(false)} className="p-1 text-white/30 hover:text-white/60">
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-2 space-y-0.5 font-mono text-[11px]">
            {entries.length === 0 && (
              <p className="text-white/20 text-center py-4">No console output</p>
            )}
            {entries.map((e, i) => (
              <div
                key={i}
                className={cn(
                  'px-2 py-0.5 rounded',
                  e.level === 'error' && 'bg-red-500/10 text-red-400',
                  e.level === 'warn' && 'bg-yellow-500/10 text-yellow-400',
                  e.level === 'info' && 'bg-blue-500/10 text-blue-400',
                  e.level === 'log' && 'text-white/60',
                )}
              >
                {e.args.join(' ')}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}