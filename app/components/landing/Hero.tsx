'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { 
  Sparkles, Brain, Zap, Calendar, Database, Shield, Cpu, 
  Layers, MessageSquare, Code, Globe, Bot, Eye, Clock,
  ArrowRight, Check, Star, ChevronRight
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';

const features = [
  {
    icon: Brain,
    title: 'Persistent Memory',
    description: 'XERON remembers everything across conversations - facts, preferences, and context persist forever.',
    color: 'from-purple-500 to-violet-600',
  },
  {
    icon: Zap,
    title: '20+ Built-in Skills',
    description: 'Code generation, data analysis, web3 tools, content creation, and more. Extensible skill system.',
    color: 'from-amber-500 to-orange-600',
  },
  {
    icon: Calendar,
    title: 'Scheduled Tasks',
    description: 'Set up recurring AI tasks with visual cron builder. XERON works while you sleep.',
    color: 'from-emerald-500 to-teal-600',
  },
  {
    icon: Cpu,
    title: '1000+ AI Models',
    description: 'Access to every major AI model: GPT-4o, Claude, Llama, Gemini, Mistral, and 900+ more.',
    color: 'from-blue-500 to-cyan-600',
  },
  {
    icon: Database,
    title: 'Self-Learning',
    description: 'XERON learns from your corrections and patterns, continuously improving responses.',
    color: 'from-rose-500 to-pink-600',
  },
  {
    icon: Shield,
    title: 'Secure Auth',
    description: 'Sign in with Google. No passwords needed. Your data stays private.',
    color: 'from-indigo-500 to-blue-600',
  },
  {
    icon: Layers,
    title: 'App Integrations',
    description: 'Connect 100+ external apps: Notion, Slack, GitHub, Discord, Figma, and more.',
    color: 'from-cyan-500 to-blue-600',
  },
  {
    icon: Bot,
    title: 'Autonomous Agents',
    description: 'Create AI agents that execute complex multi-step tasks on your behalf automatically.',
    color: 'from-green-500 to-emerald-600',
  },
];

const stats = [
  { value: '1000+', label: 'AI Models' },
  { value: '20+', label: 'Built-in Skills' },
  { value: '100+', label: 'App Integrations' },
  { value: '$0', label: 'To Start' },
];

const howItWorks = [
  {
    step: '01',
    title: 'Connect or Sign In',
    description: 'Sign in with Google. Quick and secure.',
  },
  {
    step: '02',
    title: 'Start Chatting',
    description: 'Ask anything. XERON remembers context and learns from interactions.',
  },
  {
    step: '03',
    title: 'Enable Skills',
    description: 'Activate skills for coding, analysis, automation, and more.',
  },
];

export function Hero() {
  return (
    <section className="relative min-h-screen overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[#0a0a0f]" />
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[150px]" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[150px]" />
      <div className="absolute inset-0 grid-pattern opacity-20" />

      <div className="relative z-10">
        {/* Navigation */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">XERON</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" className="text-white/60 hover:text-white">
                Dashboard
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button className="bg-gradient-to-r from-blue-600 to-cyan-500">
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </motion.header>

        {/* Hero Content */}
        <div className="px-4 pt-12 pb-20 max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8">
              <Star className="w-4 h-4 text-amber-400" />
              <span className="text-sm text-white/70">Your Autonomous AI Agent</span>
            </div>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight">
              <span className="gradient-text">Autonomous AI</span>
              <br />
              <span className="text-white/80">That Never Forgets</span>
            </h1>

            <p className="text-xl text-white/50 max-w-2xl mx-auto mb-10">
              XERON is your personal AI agent with persistent memory, 1000+ model connectors, 
              20+ skills, and 100+ app integrations.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/dashboard">
                <Button size="lg" className="h-14 px-8 text-lg bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600">
                  Start Chatting Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg">
                  View Features
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 max-w-3xl mx-auto"
          >
            {stats.map((stat) => (
              <div key={stat.label} className="p-6 rounded-2xl glass">
                <div className="text-3xl md:text-4xl font-bold gradient-text">{stat.value}</div>
                <div className="text-sm text-white/40 mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Features Grid */}
        <div className="px-4 py-20 max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="gradient-text">Everything You Need</span>
            </h2>
            <p className="text-white/50 max-w-xl mx-auto">
              Powerful features to supercharge your productivity and creativity.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group p-6 rounded-2xl glass hover:bg-white/[0.06] transition-all"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* How It Works */}
        <div className="px-4 py-20 max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="gradient-text">How It Works</span>
            </h2>
            <p className="text-white/50">Get started in seconds</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {howItWorks.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative p-8 rounded-2xl glass"
              >
                <div className="text-6xl font-bold text-white/5 absolute top-4 right-6">{step.step}</div>
                <h3 className="text-xl font-semibold text-white mb-3">{step.title}</h3>
                <p className="text-white/40">{step.description}</p>
                {i < howItWorks.length - 1 && (
                  <ChevronRight className="w-6 h-6 text-white/20 absolute right-[-24px] top-1/2 -translate-y-1/2 hidden md:block" />
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="px-4 py-20 max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-12 rounded-3xl glass-strong relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-cyan-500/20" />
            <div className="relative z-10">
              <h2 className="text-4xl font-bold text-white mb-4">Ready to Transform Your Workflow?</h2>
              <p className="text-white/50 mb-8 max-w-lg mx-auto">
                Join thousands of users already leveraging XERON's autonomous AI capabilities.
              </p>
              <Link href="/dashboard">
                <Button size="lg" className="h-14 px-10 text-lg bg-gradient-to-r from-blue-600 to-cyan-500">
                  Get Started Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}