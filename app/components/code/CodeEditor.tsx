'use client';

import { useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-[#1e1e1e]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-white/40">Loading editor...</span>
      </div>
    </div>
  ),
});

const EXTENSION_LANGUAGE_MAP: Record<string, string> = {
  '.html': 'html',
  '.tsx': 'typescript',
  '.jsx': 'javascript',
  '.ts': 'typescript',
  '.js': 'javascript',
  '.css': 'css',
  '.json': 'json',
  '.py': 'python',
  '.vue': 'html',
  '.svelte': 'html',
  '.md': 'markdown',
};

function getLanguageFromFilename(filename: string): string {
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
  return EXTENSION_LANGUAGE_MAP[ext] ?? 'plaintext';
}

interface CodeEditorProps {
  files: Record<string, string>;
  activeFile: string;
  onFileChange: (filename: string, newContent: string) => void;
  onActiveFileChange: (filename: string) => void;
}

export function CodeEditor({
  files,
  activeFile,
  onFileChange,
  onActiveFileChange,
}: CodeEditorProps) {
  const filenames = useMemo(() => Object.keys(files), [files]);
  const activeContent = files[activeFile] ?? '';
  const language = useMemo(() => getLanguageFromFilename(activeFile), [activeFile]);

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      onFileChange(activeFile, value ?? '');
    },
    [activeFile, onFileChange],
  );

  return (
    <div className="flex flex-col w-full h-full min-h-0 rounded-lg overflow-hidden border border-white/10 bg-[#1e1e1e]">
      {/* File tabs */}
      <div className="flex items-center gap-0 overflow-x-auto bg-[#252526] border-b border-white/10 shrink-0">
        {filenames.map((filename) => {
          const isActive = filename === activeFile;
          return (
            <button
              key={filename}
              onClick={() => onActiveFileChange(filename)}
              className={`
                px-4 py-2 text-sm whitespace-nowrap transition-colors border-r border-white/5
                ${
                  isActive
                    ? 'bg-[#1e1e1e] text-white border-t-2 border-t-blue-500'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/5 border-t-2 border-t-transparent'
                }
              `}
            >
              {filename}
            </button>
          );
        })}
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0">
        <MonacoEditor
          key={activeFile}
          language={language}
          value={activeContent}
          theme="vs-dark"
          onChange={handleEditorChange}
          options={{
            fontSize: 14,
            tabSize: 2,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            padding: { top: 12 },
            wordWrap: 'on',
            lineNumbersMinChars: 3,
            renderLineHighlight: 'line',
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
          }}
        />
      </div>
    </div>
  );
}
