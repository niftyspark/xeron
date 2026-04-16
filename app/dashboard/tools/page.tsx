'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { PLANS } from '@/lib/integrations';
import { getClientToken } from '@/lib/client-auth';
import { toast } from 'sonner';
import {
  Search, ExternalLink, Check, Zap, Star, Crown, Rocket,
  Loader2, Unplug, Link, RefreshCw, ChevronDown, Play,
  AlertCircle
} from 'lucide-react';

interface ComposioToolkit {
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  categories?: string[];
  meta?: {
    toolsCount?: number;
    triggersCount?: number;
  };
}

interface ConnectedAccount {
  id: string;
  toolkitSlug: string;
  status: string;
  createdAt: string;
}

interface ToolAction {
  slug: string;
  description: string;
  parameters?: Record<string, unknown>;
}

export default function ToolsPage() {

  const [search, setSearch] = useState('');
  const [view, setView] = useState<'integrations' | 'connected' | 'plans'>('integrations');
  const [toolkits, setToolkits] = useState<ComposioToolkit[]>([]);
  const [connections, setConnections] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingSlug, setConnectingSlug] = useState<string | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selectedToolkit, setSelectedToolkit] = useState<string | null>(null);
  const [toolActions, setToolActions] = useState<ToolAction[]>([]);
  const [loadingTools, setLoadingTools] = useState(false);
  const [executingTool, setExecutingTool] = useState<string | null>(null);
  const [toolResult, setToolResult] = useState<string | null>(null);

  const fetchToolkits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/integrations/toolkits');
      if (!res.ok) throw new Error('Failed to fetch toolkits');
      const data = await res.json();
      setToolkits(data.toolkits?.items || data.toolkits || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchConnections = useCallback(async () => {
    const token = getClientToken();
    if (!token) return;
    try {
      const res = await fetch('/api/integrations/connections', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setConnections(data.connections?.items || data.connections || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchTools = useCallback(async (toolkitSlug: string) => {
    setLoadingTools(true);
    setToolActions([]);
    setToolResult(null);
    try {
      const res = await fetch(`/api/integrations/tools?toolkit=${toolkitSlug}`);
      if (!res.ok) throw new Error('Failed to fetch tools');
      const data = await res.json();
      setToolActions(data.tools?.items || data.tools || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTools(false);
    }
  }, []);

  useEffect(() => {
    fetchToolkits();
    fetchConnections();
  }, [fetchToolkits, fetchConnections]);

  const handleConnect = async (toolkitSlug: string) => {
    const token = getClientToken();
    if (!token) {
      toast.error('Please sign in first');
      return;
    }
    setConnectingSlug(toolkitSlug);
    try {
      const res = await fetch('/api/integrations/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ toolkit: toolkitSlug }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to connect (${res.status})`);
      }
      const data = await res.json();
      // The connectionRequest object has { id, status, redirectUrl }
      const cr = data.connectionRequest;
      const redirectUrl = cr?.redirectUrl || cr?.redirect_url || cr?.url || null;
      
      const connectionId = data.connectionRequest?.id;

      if (redirectUrl) {
        toast.success('Opening OAuth window...');
        window.open(redirectUrl, '_blank', 'width=600,height=700');
        
        // Poll for connection completion using status endpoint
        if (connectionId) {
          const pollStatus = async () => {
            try {
              const statusRes = await fetch(`/api/integrations/status?id=${connectionId}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (statusRes.ok) {
                const statusData = await statusRes.json();
                if (statusData.status === 'ACTIVE') {
                  toast.success(`Connected to ${toolkitSlug}!`);
                  fetchConnections();
                  return true;
                }
              }
            } catch {}
            return false;
          };

          // Poll at increasing intervals
          const intervals = [3000, 5000, 8000, 12000, 18000, 25000];
          for (const delay of intervals) {
            setTimeout(async () => {
              await pollStatus();
            }, delay);
          }
        } else {
          // No connection ID, just poll connections list
          setTimeout(() => fetchConnections(), 5000);
          setTimeout(() => fetchConnections(), 15000);
        }
      } else {
        // No redirect needed (API key based or already connected)
        toast.success(`Connected to ${toolkitSlug}!`);
        fetchConnections();
      }
    } catch (err: any) {
      console.error('Connect error:', err);
      toast.error(err.message || 'Connection failed');
    } finally {
      setConnectingSlug(null);
    }
  };

  const handleDisconnect = async (connectedAccountId: string) => {
    const token = getClientToken();
    if (!token) return;
    setDisconnectingId(connectedAccountId);
    try {
      await fetch('/api/integrations/connections', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ connectedAccountId }),
      });
      toast.success('Disconnected');
      fetchConnections();
    } catch (err) {
      console.error(err);
      toast.error('Failed to disconnect');
    } finally {
      setDisconnectingId(null);
    }
  };

  const handleExecuteTool = async (toolSlug: string) => {
    const token = getClientToken();
    if (!token) return;
    setExecutingTool(toolSlug);
    setToolResult(null);
    try {
      const res = await fetch('/api/integrations/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tool: toolSlug, params: {} }),
      });
      const data = await res.json();
      if (res.ok) {
        setToolResult(JSON.stringify(data.result, null, 2));
        toast.success('Tool executed');
      } else {
        setToolResult(JSON.stringify(data.error, null, 2));
        toast.error(data.error || 'Execution failed');
      }
    } catch (err: any) {
      setToolResult(`Error: ${err.message}`);
      toast.error(err.message);
    } finally {
      setExecutingTool(null);
    }
  };

  // Handle different field names from Composio SDK
  const connectedSlugs = new Set(
    connections.map((c: any) => c.toolkitSlug || c.appName || c.appUniqueId || '').filter(Boolean)
  );
  const filteredToolkits = toolkits.filter((tk) => {
    if (!search) return true;
    return (
      tk.name?.toLowerCase().includes(search.toLowerCase()) ||
      tk.slug?.toLowerCase().includes(search.toLowerCase()) ||
      tk.description?.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Tools & Integrations</h1>
          <p className="text-sm text-white/40 mt-1">
            Connect real services via Composio — OAuth, API calls, and tool execution.
          </p>
        </div>
        <Tabs value={view} onValueChange={(v) => setView(v as any)}>
          <TabsList>
            <TabsTrigger value="integrations">Toolkits ({toolkits.length})</TabsTrigger>
            <TabsTrigger value="connected">Connected ({connections.length})</TabsTrigger>
            <TabsTrigger value="plans">Plans</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <p className="text-sm text-red-300">{error}</p>
          <Button size="sm" variant="ghost" onClick={fetchToolkits} className="ml-auto">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      )}

      {view === 'integrations' && (
        <>
          <div className="flex items-center gap-3 mb-6">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input
                placeholder="Search toolkits..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="sm" onClick={fetchToolkits}>
              <RefreshCw className="w-4 h-4 mr-1" /> Refresh
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              <span className="ml-3 text-white/50">Loading toolkits from Composio...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredToolkits.map((tk) => {
                const isConnected = connectedSlugs.has(tk.slug);
                const isConnecting = connectingSlug === tk.slug;

                return (
                  <motion.div
                    key={tk.slug}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="group relative p-4 rounded-xl glass hover:bg-white/[0.06] transition-all"
                  >
                    <div className="flex items-start gap-3">
                      {tk.logo ? (
                        <img
                          src={tk.logo}
                          alt={tk.name}
                          className="w-10 h-10 rounded-lg object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center text-white font-bold text-sm">
                          {tk.name?.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium text-white truncate">{tk.name}</h3>
                          {isConnected && <Check className="w-3 h-3 text-green-400" />}
                        </div>
                        <p className="text-xs text-white/40 mt-0.5 line-clamp-2">
                          {tk.description || tk.slug}
                        </p>
                        {tk.meta?.toolsCount && (
                          <Badge variant="secondary" className="text-[10px] mt-1">
                            {tk.meta.toolsCount} tools
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
                      {isConnected ? (
                        <>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="flex-1 text-green-400"
                            onClick={() => {
                              setSelectedToolkit(selectedToolkit === tk.slug ? null : tk.slug);
                              if (selectedToolkit !== tk.slug) fetchTools(tk.slug);
                            }}
                          >
                            <Check className="w-3 h-3 mr-1" /> Connected
                            <ChevronDown className="w-3 h-3 ml-1" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="px-2 text-red-400"
                            onClick={() => {
                              const conn = connections.find((c: any) => (c.toolkitSlug || c.appName) === tk.slug);
                              if (conn) handleDisconnect(conn.id);
                            }}
                          >
                            <Unplug className="w-3 h-3" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="default"
                          className="flex-1"
                          onClick={() => handleConnect(tk.slug)}
                          disabled={isConnecting}
                        >
                          {isConnecting ? (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          ) : (
                            <Link className="w-3 h-3 mr-1" />
                          )}
                          {isConnecting ? 'Connecting...' : 'Connect'}
                        </Button>
                      )}
                    </div>

                    <AnimatePresence>
                      {selectedToolkit === tk.slug && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
                            <p className="text-xs text-white/50 font-medium">Available Actions:</p>
                            {loadingTools ? (
                              <div className="flex items-center gap-2 py-2">
                                <Loader2 className="w-3 h-3 animate-spin text-white/30" />
                                <span className="text-xs text-white/30">Loading tools...</span>
                              </div>
                            ) : (
                              <div className="max-h-48 overflow-y-auto space-y-1">
                                {toolActions.slice(0, 15).map((action) => (
                                  <div
                                    key={action.slug}
                                    className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06]"
                                  >
                                    <div className="flex-1 min-w-0 mr-2">
                                      <p className="text-xs text-white/70 truncate">{action.slug}</p>
                                      <p className="text-[10px] text-white/30 truncate">{action.description}</p>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="px-2 h-6 shrink-0"
                                      onClick={() => handleExecuteTool(action.slug)}
                                      disabled={executingTool !== null}
                                    >
                                      {executingTool === action.slug ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <Play className="w-3 h-3" />
                                      )}
                                    </Button>
                                  </div>
                                ))}
                                {toolActions.length > 15 && (
                                  <p className="text-[10px] text-white/20 text-center pt-1">
                                    +{toolActions.length - 15} more actions
                                  </p>
                                )}
                                {toolActions.length === 0 && !loadingTools && (
                                  <p className="text-[10px] text-white/20 text-center py-2">
                                    No tools found
                                  </p>
                                )}
                              </div>
                            )}

                            {toolResult && (
                              <div className="mt-2 p-2 rounded-lg bg-black/30 max-h-40 overflow-auto">
                                <pre className="text-[10px] text-green-300 whitespace-pre-wrap">
                                  {toolResult}
                                </pre>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}

          {!loading && filteredToolkits.length === 0 && (
            <div className="text-center py-12">
              <Search className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white">No toolkits found</h3>
              <p className="text-sm text-white/40 mt-1">Try a different search term</p>
            </div>
          )}
        </>
      )}

      {view === 'connected' && (
        <div>
          {connections.length === 0 ? (
            <div className="text-center py-20">
              <Unplug className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white">No connections yet</h3>
              <p className="text-sm text-white/40 mt-1">Connect your first app from the Toolkits tab</p>
              <Button className="mt-4" onClick={() => setView('integrations')}>
                Browse Toolkits
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {connections.map((conn) => {
                const toolkit = toolkits.find((tk: any) => tk.slug === (conn as any).toolkitSlug || tk.slug === (conn as any).appName);
                return (
                  <motion.div
                    key={conn.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl glass"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-green-600/20 flex items-center justify-center">
                        <Check className="w-5 h-5 text-green-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-white">
                          {toolkit?.name || (conn as any).toolkitSlug || (conn as any).appName}
                        </h3>
                        <p className="text-[11px] text-white/40">
                          Connected {new Date(conn.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="text-[10px] bg-green-500/20 text-green-400">
                        {conn.status}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="ml-auto text-red-400"
                        onClick={() => handleDisconnect(conn.id)}
                        disabled={disconnectingId === conn.id}
                      >
                        {disconnectingId === conn.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Unplug className="w-3 h-3" />
                        )}
                        <span className="ml-1 text-xs">Disconnect</span>
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {view === 'plans' && (
        <div className="space-y-6">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Choose Your Plan</h2>
            <p className="text-white/60">
              Start free and upgrade as you grow. All plans include a 7-day free trial.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLANS.map((plan) => {
              const Icon = plan.id === 'free' ? Check : plan.id === 'starter' ? Zap : plan.id === 'pro' ? Rocket : Crown;
              return (
                <div
                  key={plan.id}
                  className={`relative p-5 rounded-xl border ${
                    plan.popular ? 'border-purple-500/50 bg-purple-500/5' : 'border-white/10 glass'
                  }`}
                >
                  {plan.popular && (
                    <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-purple-500">
                      Most Popular
                    </Badge>
                  )}
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className={`w-5 h-5 ${plan.popular ? 'text-purple-400' : 'text-white/60'}`} />
                    <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                  </div>
                  <div className="mb-4">
                    <span className="text-3xl font-bold text-white">${plan.price}</span>
                    <span className="text-sm text-white/40">/{plan.period}</span>
                  </div>
                  <div className="space-y-2">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-2 text-sm text-white/70">
                        <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                        {feature}
                      </div>
                    ))}
                  </div>
                  <Button
                    className="w-full mt-4"
                    variant={plan.id === 'free' ? 'secondary' : plan.popular ? 'default' : 'outline'}
                    disabled={plan.id === 'free'}
                  >
                    {plan.id === 'free' ? 'Current Plan' : 'Upgrade'}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}