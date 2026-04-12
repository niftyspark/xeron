'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Switch } from '@/app/components/ui/switch';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import {
  Globe, Code2, BarChart3, Blocks, FileText, Sparkles,
  Mail, Link2, FolderOpen, Calculator, Search as SearchIcon,
  Laptop, Image, PenTool, Webhook, Database, Terminal,
  FileCode, Bot, Wand2, Braces, Palette
} from 'lucide-react';

const toolCategories = [
  {
    id: 'search',
    name: 'Web Search & Scraping',
    icon: Globe,
    tools: [
      { name: 'Web Search', description: 'Search the web for information', active: true },
      { name: 'Web Scraper', description: 'Extract content from web pages', active: true },
      { name: 'News Fetcher', description: 'Get latest news articles', active: false },
      { name: 'Academic Search', description: 'Search academic papers', active: false },
    ]
  },
  {
    id: 'code',
    name: 'Code Execution & Analysis',
    icon: Code2,
    tools: [
      { name: 'Code Generator', description: 'Generate code in any language', active: true },
      { name: 'Code Reviewer', description: 'Review and analyze code quality', active: true },
      { name: 'Unit Test Writer', description: 'Auto-generate unit tests', active: false },
      { name: 'Regex Builder', description: 'Build and test regex patterns', active: true },
      { name: 'SQL Generator', description: 'Generate SQL queries', active: true },
    ]
  },
  {
    id: 'data',
    name: 'Data Processing',
    icon: BarChart3,
    tools: [
      { name: 'CSV Processor', description: 'Process and transform CSV files', active: true },
      { name: 'JSON Transformer', description: 'Transform JSON data structures', active: true },
      { name: 'Data Visualizer', description: 'Create charts and visualizations', active: false },
      { name: 'Statistics Calculator', description: 'Compute statistical measures', active: false },
    ]
  },
  {
    id: 'web3',
    name: 'Web3 & Blockchain',
    icon: Blocks,
    tools: [
      { name: 'Contract Analyzer', description: 'Analyze smart contracts', active: true },
      { name: 'Token Checker', description: 'Check token prices and stats', active: false },
      { name: 'Wallet Inspector', description: 'Analyze wallet activity', active: false },
      { name: 'Gas Estimator', description: 'Estimate transaction gas costs', active: false },
    ]
  },
  {
    id: 'text',
    name: 'Document & Text',
    icon: FileText,
    tools: [
      { name: 'Summarizer', description: 'Summarize long documents', active: true },
      { name: 'Translator', description: 'Translate between languages', active: true },
      { name: 'Grammar Checker', description: 'Fix grammar and spelling', active: false },
      { name: 'Markdown Formatter', description: 'Format and beautify markdown', active: true },
    ]
  },
  {
    id: 'creative',
    name: 'Creative & Generation',
    icon: Sparkles,
    tools: [
      { name: 'Blog Writer', description: 'Write blog posts and articles', active: true },
      { name: 'Tweet Composer', description: 'Compose engaging tweets', active: false },
      { name: 'Image Prompt Gen', description: 'Generate AI image prompts', active: false },
      { name: 'Story Generator', description: 'Create creative stories', active: false },
    ]
  },
  {
    id: 'comms',
    name: 'Communication',
    icon: Mail,
    tools: [
      { name: 'Email Drafter', description: 'Draft professional emails', active: true },
      { name: 'Slack Message', description: 'Compose Slack messages', active: false },
      { name: 'Meeting Notes', description: 'Generate meeting summaries', active: false },
    ]
  },
  {
    id: 'api',
    name: 'API & Integration',
    icon: Link2,
    tools: [
      { name: 'API Tester', description: 'Test API endpoints', active: true },
      { name: 'Webhook Handler', description: 'Process webhook payloads', active: false },
      { name: 'GraphQL Builder', description: 'Build GraphQL queries', active: false },
    ]
  },
  {
    id: 'file',
    name: 'File Management',
    icon: FolderOpen,
    tools: [
      { name: 'File Converter', description: 'Convert between file formats', active: false },
      { name: 'PDF Reader', description: 'Extract text from PDFs', active: false },
    ]
  },
  {
    id: 'math',
    name: 'Math & Computation',
    icon: Calculator,
    tools: [
      { name: 'Math Solver', description: 'Solve mathematical problems', active: true },
      { name: 'Unit Converter', description: 'Convert between units', active: false },
      { name: 'Financial Calculator', description: 'Financial computations', active: false },
    ]
  },
];

export default function ToolsPage() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const filteredCategories = toolCategories.filter((cat) => {
    if (activeTab !== 'all' && cat.id !== activeTab) return false;
    if (search) {
      return cat.tools.some(
        (t) =>
          t.name.toLowerCase().includes(search.toLowerCase()) ||
          t.description.toLowerCase().includes(search.toLowerCase())
      );
    }
    return true;
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Tools</h1>
        <p className="text-sm text-white/40 mt-1">
          All available tools organized by category. Toggle to enable or disable.
        </p>
      </div>

      <div className="flex flex-col gap-4 mb-6">
        <Input
          placeholder="Search tools..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <div className="overflow-x-auto pb-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex-wrap">
              <TabsTrigger value="all">All</TabsTrigger>
              {toolCategories.map((cat) => (
                <TabsTrigger key={cat.id} value={cat.id}>
                  {cat.name.split(' ')[0]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="space-y-8">
        {filteredCategories.map((category, ci) => (
          <motion.div
            key={category.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: ci * 0.1 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                <category.icon className="w-4 h-4 text-white/40" />
              </div>
              <h2 className="text-lg font-semibold text-white">{category.name}</h2>
              <Badge variant="secondary">{category.tools.length}</Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {category.tools
                .filter((t) => !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase()))
                .map((tool) => (
                  <div
                    key={tool.name}
                    className="flex items-center justify-between p-4 rounded-xl glass hover:bg-white/[0.06] transition-all"
                  >
                    <div>
                      <h3 className="text-sm font-medium text-white">{tool.name}</h3>
                      <p className="text-xs text-white/40 mt-0.5">{tool.description}</p>
                    </div>
                    <Switch checked={tool.active} />
                  </div>
                ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
