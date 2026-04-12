'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUI } from '@/app/store/useUI';
import { useUser } from '@/app/store/useUser';
import { X, Layers, Search, Check, Loader2, Link, Unplug } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';

interface ComposioToolkit {
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  meta?: { toolsCount?: number };
}

interface ConnectedAccount {
  id: string;
  toolkitSlug: string;
  status: string;
}

export function IntegrationsPanel() {
  const { integrationsPanelOpen, setIntegrationsPanelOpen } = useUI();
  const { token } = useUser();
  const [search, setSearch] = useState('');
  const [toolkits, setToolkits] = useState<ComposioToolkit[]>([]);
  const [connections, setConnections] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [connectingSlug, setConnectingSlug] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!integrationsPanelOpen) return;
    setLoading(true);
    try {
      const [tkRes, connRes] = await Promise.all([
        fetch('/api/integrations/toolkits'),
        token
          ? fetch('/api/integrations/connections', {
              headers: { Authorization: `Bearer ${token}` },
            })
          : Promise.resolve(null),
      ]);

      if (tkRes.ok) {
        const tkData = await tkRes.json();
        setToolkits(tkData.toolkits?.items || tkData.toolkits || []);
      }

      if (connRes && connRes.ok) {
        const connData = await connRes.json();
        setConnections(connData.connections?.items || connData.connections || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [integrationsPanelOpen, token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleConnect = async (slug: string) => {
    if (!token) return;
    setConnectingSlug(slug);
    try {
      const res = await fetch('/api/integrations/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ toolkit: slug, redirectUrl: window.location.href }),
      });
      if (res.ok) {
        const data = await res.json();
        const redirectUrl =
          data.connectionRequest?.redirectUrl ||
          data.connectionRequest?.connectionRequest?.redirectUrl ||
          data.connectionRequest?.url;
        if (redirectUrl) {
          window.open(redirectUrl, '_blank', 'width=600,height=700');
        }
        setTimeout(() => fetchData(), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setConnectingSlug(null);
    }
  };

  const connectedSlugs = new Set(connections.map((c) => c.toolkitSlug));

  const filtered = toolkits
    .filter((tk) => {
      if (!search) return true;
      return (
        tk.name?.toLowerCase().includes(search.toLowerCase()) ||
        tk.slug?.toLowerCase().includes(search.toLowerCase())
      );
    })
    .slice(0, 12);

  if (!integrationsPanelOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="w-80 bg-[#12121a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
    >
      <div className="flex items-center justify-between p-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-purple-400" />
          <span className="text-sm text-white font-medium">Integrations</span>
          <Badge variant="secondary" className="text-[10px]">
            {connections.length} connected
          </Badge>
        </div>
        <button onClick={() => setIntegrationsPanelOpen(false)}>
          <X className="w-4 h-4 text-white/30 hover:text-white" />
        </button>
      </div>

      <div className="p-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <input
            type="text"
            placeholder="Search toolkits..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-7 pr-2 py-1.5 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 outline-none"
          />
        </div>
      </div>

      <div className="p-2 max-h-72 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
            <span className="ml-2 text-xs text-white/40">Loading...</span>
          </div>
        ) : (
          filtered.map((tk) => {
            const isConnected = connectedSlugs.has(tk.slug);
            const isConnecting = connectingSlug === tk.slug;

            return (
              <div
                key={tk.slug}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors"
              >
                {tk.logo ? (
                  <img
                    src={tk.logo}
                    alt={tk.name}
                    className="w-7 h-7 rounded-md object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-7 h-7 rounded-md bg-blue-600/20 flex items-center justify-center text-white font-bold text-[10px]">
                    {tk.name?.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/80 truncate">{tk.name}</p>
                  {tk.meta?.toolsCount && (
                    <p className="text-[10px] text-white/30">{tk.meta.toolsCount} tools</p>
                  )}
                </div>
                {isConnected ? (
                  <Check className="w-4 h-4 text-green-400 shrink-0" />
                ) : (
                  <button
                    onClick={() => handleConnect(tk.slug)}
                    disabled={isConnecting}
                    className="px-2 py-1 text-[10px] bg-blue-600/20 text-blue-400 rounded-md hover:bg-blue-600/30 shrink-0"
                  >
                    {isConnecting ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      'Connect'
                    )}
                  </button>
                )}
              </div>
            );
          })
        )}
        {!loading && filtered.length === 0 && (
          <p className="text-xs text-white/30 text-center py-4">No toolkits found</p>
        )}
      </div>

      <div className="p-3 border-t border-white/5">
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs text-white/50"
          onClick={() => (window.location.href = '/dashboard/tools')}
        >
          View all integrations →
        </Button>
      </div>
    </motion.div>
  );
}