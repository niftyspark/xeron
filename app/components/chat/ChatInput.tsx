'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Square, Zap, Paperclip, Layers, ImageIcon, X, Eye } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { cn } from '@/lib/utils';
import { useUI } from '@/app/store/useUI';
import { useSkills } from '@/app/store/useSkills';
import { SkillsPanel } from './SkillsPanel';
import { IntegrationsPanel } from './IntegrationsPanel';

interface Attachment {
  type: 'text' | 'image';
  name: string;
  content: string;       // text content or base64 data URL
  preview?: string;       // thumbnail for images
}

interface ChatInputProps {
  onSend: (content: string, attachments?: Attachment[]) => void;
  onImageGenerate?: (prompt: string) => void;
  isStreaming: boolean;
  onStop: () => void;
}

export function ChatInput({ onSend, onImageGenerate, isStreaming, onStop }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [imageMode, setImageMode] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { skillsPanelOpen, setSkillsPanelOpen, integrationsPanelOpen, setIntegrationsPanelOpen } = useUI();
  const { enabledSkills } = useSkills();

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
  }, [input]);

  const handleSend = () => {
    if ((!input.trim() && attachments.length === 0) || isStreaming) return;
    if (imageMode && input.trim() && onImageGenerate) {
      onImageGenerate(input.trim());
      setInput('');
      setImageMode(false);
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      return;
    }
    onSend(input.trim(), attachments.length > 0 ? attachments : undefined);
    setInput('');
    setAttachments([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');

    if (isImage) {
      // Read as base64 for images
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setAttachments(prev => [...prev, {
          type: 'image',
          name: file.name,
          content: dataUrl,
          preview: dataUrl,
        }]);
      };
      reader.readAsDataURL(file);
    } else {
      // Read as text for code/documents
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setAttachments(prev => [...prev, {
          type: 'text',
          name: file.name,
          content: text.slice(0, 10000),
        }]);
      };
      reader.readAsText(file);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
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
    <div className="relative border-t border-white/5 p-4 bg-[#0a0a0f]/80 backdrop-blur-xl">
      {skillsPanelOpen && (
        <div className="absolute bottom-full left-4 mb-2 z-50">
          <SkillsPanel />
        </div>
      )}
      {integrationsPanelOpen && (
        <div className="absolute bottom-full left-4 mb-2 z-50">
          <IntegrationsPanel />
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        {/* Attachment previews */}
        {attachments.length > 0 && (
          <div className="flex gap-2 mb-2 flex-wrap">
            {attachments.map((att, i) => (
              <div key={i} className="relative group rounded-lg overflow-hidden border border-white/10 bg-white/5">
                {att.type === 'image' ? (
                  <img src={att.preview} alt={att.name} className="h-20 w-20 object-cover" />
                ) : (
                  <div className="h-20 w-20 flex flex-col items-center justify-center px-1">
                    <Paperclip className="w-4 h-4 text-white/40 mb-1" />
                    <span className="text-[9px] text-white/40 truncate w-full text-center">{att.name}</span>
                  </div>
                )}
                <button
                  onClick={() => removeAttachment(i)}
                  className="absolute top-0.5 right-0.5 p-0.5 bg-black/70 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
                {att.type === 'image' && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5">
                    <div className="flex items-center gap-0.5">
                      <Eye className="w-2.5 h-2.5 text-cyan-400" />
                      <span className="text-[8px] text-cyan-400">AI Vision</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="relative flex items-end gap-2 rounded-2xl glass-strong p-3">
          <div className="flex items-center gap-1 pb-1">
            {/* File Upload */}
            <button
              className="p-2 rounded-lg hover:bg-white/10 text-white/30 hover:text-white/60 transition-colors"
              title="Attach file or image"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileUpload}
              accept=".txt,.md,.json,.js,.ts,.py,.html,.css,.svg,.png,.jpg,.jpeg,.gif,.webp,.bmp,.pdf"
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

            {/* Image Mode Toggle */}
            {onImageGenerate && (
              <button
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  imageMode
                    ? 'bg-pink-600/20 text-pink-400'
                    : 'hover:bg-white/10 text-white/30 hover:text-white/60'
                )}
                title={imageMode ? 'Image mode ON — click to turn off' : 'Turn on image generation mode'}
                onClick={() => setImageMode(!imageMode)}
              >
                <ImageIcon className="w-4 h-4" />
              </button>
            )}
          </div>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={imageMode ? 'Describe the image you want to generate...' : attachments.some(a => a.type === 'image') ? 'Ask about the image...' : 'Ask XERON anything...'}
            rows={1}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 outline-none resize-none max-h-[200px] py-2"
          />

          <div className="flex items-center gap-2 pb-1">
            {isStreaming ? (
              <Button variant="destructive" size="icon-sm" onClick={onStop} className="rounded-lg">
                <Square className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button
                variant="default"
                size="icon-sm"
                onClick={handleSend}
                disabled={!input.trim() && attachments.length === 0}
                className={cn(
                  'rounded-lg transition-all',
                  imageMode && input.trim()
                    ? 'bg-pink-600 hover:bg-pink-700'
                    : (input.trim() || attachments.length > 0) ? 'bg-blue-600 hover:bg-blue-700' : 'bg-white/10'
                )}
              >
                {imageMode ? <ImageIcon className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-2 px-1">
          <span className="text-[10px] text-white/20">
            {imageMode ? '🎨 Image mode — type a description and press Enter' : `Enter to send · Shift+Enter for new line${attachments.some(a => a.type === 'image') ? ' · Image will be analyzed by AI' : ''}`}
          </span>
          <span className="text-[10px] text-white/20">
            Powered by 4EverLand AI
          </span>
        </div>
      </div>
    </div>
  );
}

export type { Attachment };