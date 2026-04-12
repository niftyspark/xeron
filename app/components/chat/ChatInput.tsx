'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Square, Zap, Paperclip, Layers } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { cn } from '@/lib/utils';
import { useUI } from '@/app/store/useUI';
import { useSkills } from '@/app/store/useSkills';
import { SkillsPanel } from './SkillsPanel';
import { IntegrationsPanel } from './IntegrationsPanel';

interface ChatInputProps {
  onSend: (content: string) => void;
  isStreaming: boolean;
  onStop: () => void;
}

export function ChatInput({ onSend, isStreaming, onStop }: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { skillsPanelOpen, setSkillsPanelOpen, integrationsPanelOpen, setIntegrationsPanelOpen } = useUI();
  const { enabledSkills } = useSkills();

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
  }, [input]);

  const handleSend = () => {
    if (input.trim() && !isStreaming) {
      onSend(input.trim());
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setInput((prev) => prev + `\n[File: ${file.name}]\n${content.slice(0, 5000)}`);
      };
      reader.readAsText(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const toggleSkills = () => {
    setSkillsPanelOpen(!skillsPanelOpen);
    setIntegrationsPanelOpen(false);
  };

  const toggleIntegrations = () => {
    setIntegrationsPanelOpen(!integrationsPanelOpen);
    setSkillsPanelOpen(false);
  };

  return (
    <div className="border-t border-white/5 p-4 bg-[#0a0a0f]/80 backdrop-blur-xl">
      {/* Skills Panel */}
      {skillsPanelOpen && (
        <div className="absolute bottom-full left-4 mb-2 z-50">
          <SkillsPanel />
        </div>
      )}
      
      {/* Integrations Panel */}
      {integrationsPanelOpen && (
        <div className="absolute bottom-full left-4 mb-2 z-50">
          <IntegrationsPanel />
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <div className="relative flex items-end gap-2 rounded-2xl glass-strong p-3">
          <div className="flex items-center gap-1 pb-1">
            {/* File Upload */}
            <button
              className="p-2 rounded-lg hover:bg-white/10 text-white/30 hover:text-white/60 transition-colors"
              title="Attach file"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileUpload}
              accept=".txt,.md,.json,.js,.ts,.py,.html,.css,.svg,.png,.jpg,.jpeg"
            />

            {/* Skills Button */}
            <button
              className={cn(
                'p-2 rounded-lg transition-colors relative',
                skillsPanelOpen 
                  ? 'bg-amber-600/20 text-amber-400' 
                  : 'hover:bg-white/10 text-white/30 hover:text-white/60'
              )}
              title="Skills"
              onClick={toggleSkills}
            >
              <Zap className="w-4 h-4" />
              {enabledSkills.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-amber-500 rounded-full text-[8px] flex items-center justify-center text-white">
                  {enabledSkills.length}
                </span>
              )}
            </button>

            {/* Integrations Button */}
            <button
              className={cn(
                'p-2 rounded-lg transition-colors',
                integrationsPanelOpen 
                  ? 'bg-purple-600/20 text-purple-400' 
                  : 'hover:bg-white/10 text-white/30 hover:text-white/60'
              )}
              title="Integrations"
              onClick={toggleIntegrations}
            >
              <Layers className="w-4 h-4" />
            </button>
          </div>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask XERON anything..."
            rows={1}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 outline-none resize-none max-h-[200px] py-2"
          />

          <div className="flex items-center gap-2 pb-1">
            <span className="text-[10px] text-white/20 hidden sm:block">
              {input.length > 0 && `${input.length} chars`}
            </span>
            
            {isStreaming ? (
              <Button
                variant="destructive"
                size="icon-sm"
                onClick={onStop}
                className="rounded-lg"
              >
                <Square className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button
                variant="default"
                size="icon-sm"
                onClick={handleSend}
                disabled={!input.trim()}
                className={cn(
                  'rounded-lg transition-all',
                  input.trim() ? 'bg-blue-600 hover:bg-blue-700' : 'bg-white/10'
                )}
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-2 px-1">
          <span className="text-[10px] text-white/20">
            Press Ctrl+Enter to send
          </span>
          <span className="text-[10px] text-white/20">
            Powered by 4EverLand AI
          </span>
        </div>
      </div>
    </div>
  );
}