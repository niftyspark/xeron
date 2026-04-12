'use client';

import { motion } from 'framer-motion';
import { useChat } from '@/app/store/useChat';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { MessageSquare, Search, Trash2, Pin, Clock } from 'lucide-react';
import { useState } from 'react';
import { formatRelativeTime } from '@/lib/utils';

export default function HistoryPage() {
  const { conversations, setActiveConversation, deleteConversation } = useChat();
  const [search, setSearch] = useState('');

  const filtered = conversations.filter((c) =>
    (c.title || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Conversation History</h1>
        <p className="text-sm text-white/40 mt-1">
          {conversations.length} conversations
        </p>
      </div>

      <div className="relative max-w-md mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <Input
          placeholder="Search conversations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <MessageSquare className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white/60 mb-2">No conversations yet</h3>
          <p className="text-sm text-white/30">Start chatting with XERON to see your history here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((conv, i) => (
            <motion.div
              key={conv.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center gap-4 p-4 rounded-xl glass hover:bg-white/[0.06] transition-all group cursor-pointer"
              onClick={() => setActiveConversation(conv.id)}
            >
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                <MessageSquare className="w-5 h-5 text-white/30" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-white truncate">
                    {conv.title || 'New Conversation'}
                  </h3>
                  {conv.isPinned && <Pin className="w-3 h-3 text-blue-400" />}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-[10px]">{conv.model}</Badge>
                  <span className="text-[10px] text-white/20">
                    {conv.messages.length} messages
                  </span>
                  <span className="text-[10px] text-white/20 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatRelativeTime(conv.updatedAt)}
                  </span>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteConversation(conv.id);
                }}
                className="p-2 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
