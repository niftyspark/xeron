'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Square, Zap, Paperclip } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSend: (content: string) => void;
  isStreaming: boolean;
  onStop: () => void;
}

export function ChatInput({ onSend, isStreaming, onStop }: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  return (
    <div className="border-t border-white/5 p-4 bg-[#0a0a0f]/80 backdrop-blur-xl">
      <div className="max-w-4xl mx-auto">
        <div className="relative flex items-end gap-2 rounded-2xl glass-strong p-3">
          <div className="flex items-center gap-1 pb-1">
            <button
              className="p-2 rounded-lg hover:bg-white/10 text-white/30 hover:text-white/60 transition-colors"
              title="Attach file"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <button
              className="p-2 rounded-lg hover:bg-white/10 text-white/30 hover:text-white/60 transition-colors"
              title="Skills"
            >
              <Zap className="w-4 h-4" />
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
