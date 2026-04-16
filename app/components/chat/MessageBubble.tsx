'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ChatMessage } from '@/app/store/useChat';
import { Copy, RotateCcw, ThumbsUp, ThumbsDown, User, Sparkles, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { formatRelativeTime } from '@/lib/utils';

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<'up' | 'down' | null>(null);
  const isUser = message.role === 'user';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFeedback = async (type: 'up' | 'down') => {
    if (feedbackGiven) return;

    try {
      const { getClientToken } = await import('@/lib/client-auth');
      const token = getClientToken();
      const res = await fetch('/api/learning', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          trigger: 'user_feedback',
          lesson: message.content.slice(0, 200),
          appliedTo: 'chat_response',
          confidence: type === 'up' ? 1.0 : 0.0,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to submit feedback');
      }

      setFeedbackGiven(type);
      toast.success(type === 'up' ? 'Thanks for the positive feedback!' : 'Feedback recorded. We\'ll improve.');
    } catch (err) {
      toast.error('Failed to submit feedback');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex gap-3 py-4', isUser ? 'flex-row-reverse' : '')}
    >
      {/* Avatar */}
      <div className={cn(
        'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
        isUser 
          ? 'bg-blue-600/20 border border-blue-500/20' 
          : 'bg-gradient-to-br from-blue-600/20 to-cyan-500/20 border border-cyan-500/20'
      )}>
        {isUser ? (
          <User className="w-4 h-4 text-blue-400" />
        ) : (
          <Sparkles className="w-4 h-4 text-cyan-400" />
        )}
      </div>

      {/* Message content */}
      <div className={cn('flex-1 max-w-[85%]', isUser ? 'items-end' : '')}>
        <div className={cn(
          'rounded-2xl px-4 py-3',
          isUser ? 'message-user ml-auto' : 'message-assistant'
        )}>
          {isUser ? (
            <div>
              <p className="text-sm text-white/90 whitespace-pre-wrap">{message.content}</p>
              {/* Render attached images */}
              {(message as any).metadata?.images?.map((img: string, i: number) => (
                <div key={i} className="mt-2 rounded-xl overflow-hidden border border-white/10 inline-block">
                  <img src={img} alt="Attached" className="max-w-xs max-h-48 object-cover rounded-xl" />
                </div>
              ))}
            </div>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown
                components={{
                  code({ node, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    const isInline = !match;
                    
                    if (isInline) {
                      return (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    }

                    return (
                      <div className="relative group my-3">
                        <div className="flex items-center justify-between px-4 py-2 bg-black/30 border-b border-white/5 rounded-t-lg">
                          <span className="text-xs text-white/30">{match[1]}</span>
                          <button
                            onClick={async () => {
                              await navigator.clipboard.writeText(String(children));
                              setCopied(true);
                              setTimeout(() => setCopied(false), 2000);
                            }}
                            className="text-white/30 hover:text-white/60 transition-colors"
                          >
                            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <SyntaxHighlighter
                          style={oneDark}
                          language={match[1]}
                          PreTag="div"
                          customStyle={{
                            margin: 0,
                            borderTopLeftRadius: 0,
                            borderTopRightRadius: 0,
                            background: 'rgba(0,0,0,0.3)',
                          }}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      </div>
                    );
                  },
                  p({ children }) {
                    return <p className="text-sm text-white/80 leading-relaxed mb-2 last:mb-0">{children}</p>;
                  },
                  ul({ children }) {
                    return <ul className="text-sm text-white/80 space-y-1 list-disc pl-4 mb-2">{children}</ul>;
                  },
                  ol({ children }) {
                    return <ol className="text-sm text-white/80 space-y-1 list-decimal pl-4 mb-2">{children}</ol>;
                  },
                  h1({ children }) {
                    return <h1 className="text-lg font-bold text-white mb-2 mt-4">{children}</h1>;
                  },
                  h2({ children }) {
                    return <h2 className="text-base font-bold text-white mb-2 mt-3">{children}</h2>;
                  },
                  h3({ children }) {
                    return <h3 className="text-sm font-bold text-white mb-1 mt-2">{children}</h3>;
                  },
                  a({ children, href }) {
                    return <a href={href} className="text-blue-400 hover:text-blue-300 underline" target="_blank" rel="noreferrer">{children}</a>;
                  },
                  blockquote({ children }) {
                    return <blockquote className="border-l-2 border-blue-500/30 pl-3 italic text-white/50">{children}</blockquote>;
                  },
                  img({ src, alt }) {
                    return (
                      <div className="my-3 rounded-xl overflow-hidden border border-white/10">
                        <img
                          src={src}
                          alt={alt || 'Generated image'}
                          className="w-full max-w-md rounded-xl"
                          loading="lazy"
                        />
                      </div>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
              {/* Render generated images from metadata */}
              {(message as any).metadata?.images?.map((img: string, i: number) => (
                <div key={i} className="mt-3 rounded-xl overflow-hidden border border-white/10 inline-block">
                  <img
                    src={img}
                    alt="Generated image"
                    className="max-w-md w-full rounded-xl"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        {!isUser && message.content && (
          <div className="flex items-center gap-1 mt-1 px-1">
            <button onClick={handleCopy} className="p-1 rounded text-white/20 hover:text-white/50 transition-colors" title="Copy">
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => handleFeedback('up')}
              disabled={feedbackGiven !== null}
              className={cn(
                'p-1 rounded transition-colors',
                feedbackGiven === 'up'
                  ? 'text-emerald-400'
                  : feedbackGiven !== null
                    ? 'text-white/10 cursor-not-allowed'
                    : 'text-white/20 hover:text-white/50'
              )}
              title="Good response"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleFeedback('down')}
              disabled={feedbackGiven !== null}
              className={cn(
                'p-1 rounded transition-colors',
                feedbackGiven === 'down'
                  ? 'text-red-400'
                  : feedbackGiven !== null
                    ? 'text-white/10 cursor-not-allowed'
                    : 'text-white/20 hover:text-white/50'
              )}
              title="Bad response"
            >
              <ThumbsDown className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] text-white/15 ml-2">
              {formatRelativeTime(message.createdAt)}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
