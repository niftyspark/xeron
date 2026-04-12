'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import {
  integrationCategories,
  integrations,
  searchIntegrations,
  PLANS,
  type Integration,
  type IntegrationCategory,
} from '@/lib/integrations';
import {
  Search, ExternalLink, Check, Zap, Star, Crown, Rocket,
  Briefcase, Users, Code, Palette, MessageSquare,
  TrendingUp, DollarSign, Database, Image, Gamepad2
} from 'lucide-react';

const categoryIcons: Record<IntegrationCategory, React.ElementType> = {
  productivity: Briefcase,
  social: Users,
  development: Code,
  design: Palette,
  communication: MessageSquare,
  marketing: TrendingUp,
  finance: DollarSign,
  data: Database,
  media: Image,
  gaming: Gamepad2,
};

const tierBadges: Record<string, { icon: React.ElementType; color: string }> = {
  free: { icon: Check, color: 'text-green-400' },
  starter: { icon: Zap, color: 'text-blue-400' },
  pro: { icon: Star, color: 'text-purple-400' },
  ultra: { icon: Crown, color: 'text-yellow-400' },
};

function IntegrationCard({ integration, connected }: { integration: Integration; connected: boolean }) {
  const tierBadge = tierBadges[integration.tier];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative p-4 rounded-xl glass hover:bg-white/[0.06] transition-all"
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
          style={{ backgroundColor: integration.color }}
        >
          {integration.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-white truncate">{integration.name}</h3>
            <tierBadge.icon className={`w-3 h-3 ${tierBadge.color}`} />
          </div>
          <p className="text-xs text-white/40 mt-0.5 line-clamp-2">{integration.description}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {integration.features.slice(0, 3).map((feature) => (
              <Badge key={feature} variant="secondary" className="text-[10px] px-1.5 py-0">
                {feature}
              </Badge>
            ))}
            {integration.features.length > 3 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                +{integration.features.length - 3}
              </Badge>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
        <Button size="sm" variant={connected ? 'secondary' : 'default'} className="flex-1">
          {connected ? 'Connected' : 'Connect'}
        </Button>
        <Button size="sm" variant="ghost" className="px-2">
          <ExternalLink className="w-3 h-3" />
        </Button>
      </div>
    </motion.div>
  );
}

function PlanCard({ plan, current }: { plan: typeof PLANS[number]; current: boolean }) {
  const Icon = plan.id === 'free' ? Check : plan.id === 'starter' ? Zap : plan.id === 'pro' ? Rocket : Crown;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative p-5 rounded-xl border ${
        plan.popular
          ? 'border-purple-500/50 bg-purple-500/5'
          : 'border-white/10 glass'
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
        {plan.trialDays && (
          <Badge variant="secondary" className="ml-2 text-xs">
            {plan.trialDays}-day free trial
          </Badge>
        )}
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
        variant={current ? 'secondary' : plan.popular ? 'default' : 'outline'}
        disabled={current}
      >
        {current ? 'Current Plan' : 'Upgrade'}
      </Button>
    </motion.div>
  );
}

export default function ToolsPage() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<IntegrationCategory | 'all'>('all');
  const [view, setView] = useState<'integrations' | 'plans'>('integrations');

  const filteredIntegrations = search
    ? searchIntegrations(search)
    : activeTab === 'all'
    ? integrations
    : integrations.filter((i) => i.category === activeTab);

  const totalConnected = 0;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Tools & Integrations</h1>
          <p className="text-sm text-white/40 mt-1">
            Connect your favorite apps and upgrade your plan for more features.
          </p>
        </div>
        <Tabs value={view} onValueChange={(v) => setView(v as 'integrations' | 'plans')}>
          <TabsList>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="plans">Plans</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {view === 'integrations' ? (
        <>
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <Input
                  placeholder="Search integrations..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="overflow-x-auto pb-2">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as IntegrationCategory | 'all')}>
                <TabsList>
                  <TabsTrigger value="all">All ({integrations.length})</TabsTrigger>
                  {integrationCategories.map((cat) => {
                    const count = integrations.filter((i) => i.category === cat.id).length;
                    const Icon = categoryIcons[cat.id];
                    return (
                      <TabsTrigger key={cat.id} value={cat.id} className="flex items-center gap-1.5">
                        <Icon className="w-3.5 h-3.5" />
                        {cat.name} ({count})
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </Tabs>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-4 text-sm text-white/50">
            <Check className="w-4 h-4 text-green-400" />
            {totalConnected} integrations connected
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredIntegrations.map((integration) => (
              <IntegrationCard
                key={integration.id}
                integration={integration}
                connected={false}
              />
            ))}
          </div>

          {filteredIntegrations.length === 0 && (
            <div className="text-center py-12">
              <Search className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white">No integrations found</h3>
              <p className="text-sm text-white/40 mt-1">
                Try a different search term or category
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-6">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Choose Your Plan</h2>
            <p className="text-white/60">
              Start free and upgrade as you grow. All plans include a 7-day free trial.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLANS.map((plan) => (
              <PlanCard key={plan.id} plan={plan} current={plan.id === 'free'} />
            ))}
          </div>

          <div className="mt-8 p-6 rounded-xl glass text-center">
            <h3 className="text-lg font-semibold text-white mb-2">Need a custom plan?</h3>
            <p className="text-sm text-white/50 mb-4">
              Contact us for enterprise pricing and custom integrations.
            </p>
            <Button variant="outline">Contact Sales</Button>
          </div>
        </div>
      )}
    </div>
  );
}