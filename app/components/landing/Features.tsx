'use client';

import { motion } from 'framer-motion';
import { Brain, Zap, Calendar, Database, Shield, Cpu, MessageSquare, Layers } from 'lucide-react';

const features = [
  {
    icon: Brain,
    title: 'Persistent Memory',
    description: 'XERON remembers everything across conversations. Facts, preferences, and context persist forever.',
    color: 'from-purple-500 to-violet-600',
  },
  {
    icon: Zap,
    title: '20+ Skills',
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
    title: '1000+ Models',
    description: 'Access to every major AI model: GPT-4o, Claude, Llama, Gemini, Mistral, and 900+ more.',
    color: 'from-blue-500 to-cyan-600',
  },
  {
    icon: Database,
    title: 'Self-Learning',
    description: 'XERON learns from your corrections and patterns, continuously improving its responses.',
    color: 'from-rose-500 to-pink-600',
  },
  {
    icon: Shield,
    title: 'Decentralized Auth',
    description: 'No passwords. Connect your wallet on Base chain. Your data, your keys, your agent.',
    color: 'from-indigo-500 to-blue-600',
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

export function Features() {
  return (
    <section className="relative py-32 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">Autonomous Intelligence</span>
          </h2>
          <p className="text-lg text-white/40 max-w-2xl mx-auto">
            A fully autonomous AI agent that thinks, remembers, learns, and executes tasks on your behalf.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={item}
              className="group p-6 rounded-2xl glass hover:bg-white/[0.06] transition-all duration-300 hover:border-white/20"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-white/40 leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {[
            { label: 'AI Models', value: '1,000+' },
            { label: 'Built-in Skills', value: '20+' },
            { label: 'Cost', value: '$0' },
            { label: 'Open Source', value: '100%' },
          ].map((stat) => (
            <div key={stat.label} className="text-center p-6 rounded-xl glass">
              <div className="text-3xl font-bold gradient-text mb-1">{stat.value}</div>
              <div className="text-sm text-white/40">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
