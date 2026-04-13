'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { FileText, FilePlus, Trash2, Edit3, FileCode2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileTreeProps {
  files: Record<string, string>;
  activeFile: string;
  onSelectFile: (filename: string) => void;
  onCreateFile: (filename: string) => void;
  onDeleteFile: (filename: string) => void;
  onRenameFile: (oldName: string, newName: string) => void;
}

const EXT_COLORS: Record<string, string> = {
  '.html': 'text-orange-400',
  '.css': 'text-blue-400',
  '.js': 'text-yellow-400',
  '.jsx': 'text-yellow-400',
  '.ts': 'text-blue-400',
  '.tsx': 'text-blue-400',
  '.json': 'text-green-400',
  '.py': 'text-blue-400',
  '.vue': 'text-green-400',
  '.svelte': 'text-red-400',
  '.md': 'text-white/70',
};

function getExtension(filename: string): string {
  const dotIndex = filename.lastIndexOf('.');
  return dotIndex >= 0 ? filename.slice(dotIndex) : '';
}

function getIconColor(filename: string): string {
  return EXT_COLORS[getExtension(filename)] || 'text-white/40';
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ filename, className }: { filename: string; className?: string }) {
  const color = getIconColor(filename);
  const ext = getExtension(filename);
  const isCode = ['.js', '.jsx', '.ts', '.tsx', '.py', '.vue', '.svelte', '.html', '.css'].includes(ext);

  if (isCode) {
    return <FileCode2 className={cn('w-4 h-4 shrink-0', color, className)} />;
  }
  return <FileText className={cn('w-4 h-4 shrink-0', color, className)} />;
}

export function FileTree({
  files,
  activeFile,
  onSelectFile,
  onCreateFile,
  onDeleteFile,
  onRenameFile,
}: FileTreeProps) {
  const [showNewFileInput, setShowNewFileInput] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [contextMenu, setContextMenu] = useState<{ filename: string; x: number; y: number } | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const newFileInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const filenames = Object.keys(files).sort((a, b) => a.localeCompare(b));

  // Focus new-file input when it appears
  useEffect(() => {
    if (showNewFileInput && newFileInputRef.current) {
      newFileInputRef.current.focus();
    }
  }, [showNewFileInput]);

  // Focus rename input when it appears
  useEffect(() => {
    if (renaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renaming]);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;

    function handleClick(e: MouseEvent) {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    }

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [contextMenu]);

  const handleCreateFile = useCallback(() => {
    const trimmed = newFileName.trim();
    if (trimmed && !files[trimmed]) {
      onCreateFile(trimmed);
      setNewFileName('');
      setShowNewFileInput(false);
    }
  }, [newFileName, files, onCreateFile]);

  const handleRename = useCallback(
    (oldName: string) => {
      const trimmed = renameValue.trim();
      if (trimmed && trimmed !== oldName && !files[trimmed]) {
        onRenameFile(oldName, trimmed);
      }
      setRenaming(null);
      setRenameValue('');
    },
    [renameValue, files, onRenameFile],
  );

  const openContextMenu = (e: React.MouseEvent, filename: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ filename, x: e.clientX, y: e.clientY });
  };

  const startRename = (filename: string) => {
    setRenaming(filename);
    setRenameValue(filename);
    setContextMenu(null);
  };

  const startDelete = (filename: string) => {
    onDeleteFile(filename);
    setContextMenu(null);
  };

  return (
    <div className="w-[220px] h-full flex flex-col bg-[#0d0d14] border-r border-white/5 select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
          Files
        </span>
        <button
          onClick={() => {
            setShowNewFileInput(true);
            setNewFileName('');
          }}
          className="p-1 rounded-md hover:bg-white/10 text-white/40 hover:text-white transition-colors"
          title="New File"
        >
          <FilePlus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* New file input */}
      {showNewFileInput && (
        <div className="px-2 py-1.5 border-b border-white/5">
          <input
            ref={newFileInputRef}
            type="text"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateFile();
              if (e.key === 'Escape') {
                setShowNewFileInput(false);
                setNewFileName('');
              }
            }}
            onBlur={() => {
              if (!newFileName.trim()) {
                setShowNewFileInput(false);
              } else {
                handleCreateFile();
              }
            }}
            placeholder="filename.ext"
            className="w-full px-2 py-1 text-xs bg-white/5 border border-white/10 rounded-md text-white placeholder:text-white/20 outline-none focus:border-blue-500/50"
          />
        </div>
      )}

      {/* File list */}
      <div className="flex-1 overflow-y-auto py-1">
        {filenames.length === 0 && (
          <div className="px-3 py-4 text-center">
            <FileText className="w-8 h-8 text-white/10 mx-auto mb-2" />
            <p className="text-[11px] text-white/20">No files yet</p>
          </div>
        )}

        {filenames.map((filename) => {
          const isActive = filename === activeFile;
          const size = new TextEncoder().encode(files[filename]).length;

          if (renaming === filename) {
            return (
              <div key={filename} className="px-2 py-0.5">
                <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-white/5">
                  <FileIcon filename={renameValue || filename} />
                  <input
                    ref={renameInputRef}
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRename(filename);
                      if (e.key === 'Escape') {
                        setRenaming(null);
                        setRenameValue('');
                      }
                    }}
                    onBlur={() => handleRename(filename)}
                    className="flex-1 min-w-0 px-1 py-0 text-xs bg-transparent border border-blue-500/50 rounded text-white outline-none"
                  />
                </div>
              </div>
            );
          }

          return (
            <div key={filename} className="px-2 py-0.5">
              <button
                onClick={() => onSelectFile(filename)}
                onContextMenu={(e) => openContextMenu(e, filename)}
                className={cn(
                  'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors group',
                  isActive
                    ? 'bg-blue-600/15 text-white border border-blue-500/20'
                    : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent',
                )}
              >
                <FileIcon filename={filename} />
                <span className="flex-1 min-w-0 truncate text-xs">{filename}</span>
                <span className="text-[10px] text-white/20 shrink-0 tabular-nums">
                  {formatBytes(size)}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {/* File count */}
      {filenames.length > 0 && (
        <div className="px-3 py-1.5 border-t border-white/5">
          <span className="text-[10px] text-white/20">
            {filenames.length} file{filenames.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-[100] min-w-[140px] py-1 bg-[#1a1a2e] border border-white/10 rounded-lg shadow-xl shadow-black/50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={() => startRename(contextMenu.filename)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Rename
          </button>
          <button
            onClick={() => startDelete(contextMenu.filename)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
