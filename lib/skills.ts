export interface SkillDefinition {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  icon: string;
  systemPrompt: string;
  toolSchema?: {
    name: string;
    description: string;
    parameters: {
      type: string;
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
}

export const BUILTIN_SKILLS: SkillDefinition[] = [
  {
    id: 'web-search',
    name: 'Web Search',
    slug: 'web-search',
    description: 'Search the web for current information and news',
    category: 'search',
    icon: 'Globe',
    systemPrompt: 'You have access to web search capabilities. Use search to find current information, verify facts, or get up-to-date data when needed.',
  },
  {
    id: 'code-generator',
    name: 'Code Generator',
    slug: 'code-generator',
    description: 'Generate code in multiple programming languages',
    category: 'code',
    icon: 'Code2',
    systemPrompt: 'You are an expert code generator. Generate clean, well-commented, production-ready code. Always consider best practices, security, and performance.',
    toolSchema: {
      name: 'generate_code',
      description: 'Generate code in a specified programming language',
      parameters: {
        type: 'object',
        properties: {
          language: { type: 'string', description: 'Programming language' },
          task: { type: 'string', description: 'What the code should do' },
          framework: { type: 'string', description: 'Optional framework to use' },
        },
        required: ['language', 'task'],
      },
    },
  },
  {
    id: 'code-analyzer',
    name: 'Code Analyzer',
    slug: 'code-analyzer',
    description: 'Analyze, debug, and optimize existing code',
    category: 'code',
    icon: 'Bug',
    systemPrompt: 'You are an expert code analyst. Analyze code for bugs, security vulnerabilities, performance issues, and suggest improvements. Provide specific, actionable recommendations.',
  },
  {
    id: 'summarizer',
    name: 'Summarizer',
    slug: 'summarizer',
    description: 'Summarize long documents and conversations',
    category: 'productivity',
    icon: 'FileText',
    systemPrompt: 'You specialize in creating concise, accurate summaries. Capture key points while maintaining the essential context and meaning.',
  },
  {
    id: 'translator',
    name: 'Translator',
    slug: 'translator',
    description: 'Translate text between multiple languages',
    category: 'productivity',
    icon: 'Languages',
    systemPrompt: 'You are an expert translator. Provide accurate, natural translations that preserve tone, nuance, and cultural context.',
  },
  {
    id: 'math-solver',
    name: 'Math Solver',
    slug: 'math-solver',
    description: 'Solve mathematical problems and show work',
    category: 'data',
    icon: 'Calculator',
    systemPrompt: 'You are a mathematical problem solver. Show all steps clearly, explain the reasoning, and provide the final answer with verification when possible.',
  },
  {
    id: 'data-analyzer',
    name: 'Data Analyzer',
    slug: 'data-analyzer',
    description: 'Analyze datasets and extract insights',
    category: 'data',
    icon: 'BarChart3',
    systemPrompt: 'You are a data analysis expert. Analyze datasets, identify patterns, create visualizations conceptually, and provide actionable insights.',
    toolSchema: {
      name: 'analyze_data',
      description: 'Analyze a dataset and provide insights',
      parameters: {
        type: 'object',
        properties: {
          data: { type: 'string', description: 'The data to analyze (CSV, JSON, etc.)' },
          analysis_type: { type: 'string', description: 'Type of analysis to perform' },
        },
        required: ['data'],
      },
    },
  },
  {
    id: 'json-processor',
    name: 'JSON/CSV Processor',
    slug: 'json-processor',
    description: 'Process and transform JSON and CSV data',
    category: 'data',
    icon: 'Database',
    systemPrompt: 'You are an expert at processing JSON and CSV data. Transform, filter, aggregate, and restructure data as needed.',
  },
  {
    id: 'regex-builder',
    name: 'Regex Builder',
    slug: 'regex-builder',
    description: 'Build and explain regular expressions',
    category: 'code',
    icon: 'Regex',
    systemPrompt: 'You are a regex expert. Build precise, efficient regular expressions and explain how they work with examples.',
  },
  {
    id: 'email-drafter',
    name: 'Email Drafter',
    slug: 'email-drafter',
    description: 'Draft professional emails for various purposes',
    category: 'productivity',
    icon: 'Mail',
    systemPrompt: 'You are a professional email writer. Draft clear, concise, and appropriately toned emails for business and personal communication.',
  },
  {
    id: 'tweet-composer',
    name: 'Tweet Composer',
    slug: 'tweet-composer',
    description: 'Compose engaging tweets and threads',
    category: 'creative',
    icon: 'Twitter',
    systemPrompt: 'You are a social media expert. Create engaging, viral-worthy tweets and threads that match the requested tone and purpose.',
  },
  {
    id: 'blog-writer',
    name: 'Blog Writer',
    slug: 'blog-writer',
    description: 'Write engaging blog posts and articles',
    category: 'creative',
    icon: 'PenTool',
    systemPrompt: 'You are a skilled content writer. Create engaging, SEO-friendly blog posts with proper structure, headlines, and formatting.',
  },
  {
    id: 'seo-analyzer',
    name: 'SEO Analyzer',
    slug: 'seo-analyzer',
    description: 'Analyze and optimize content for search engines',
    category: 'productivity',
    icon: 'Search',
    systemPrompt: 'You are an SEO expert. Analyze content for keyword optimization, readability, and search engine ranking factors.',
  },
  {
    id: 'smart-contract-analyzer',
    name: 'Smart Contract Analyzer',
    slug: 'smart-contract-analyzer',
    description: 'Analyze Solidity smart contracts for security',
    category: 'web3',
    icon: 'FileCode',
    systemPrompt: 'You are a blockchain security expert. Analyze Solidity smart contracts for vulnerabilities, best practices, and optimization opportunities.',
  },
  {
    id: 'token-price-checker',
    name: 'Token Price Checker',
    slug: 'token-price-checker',
    description: 'Check cryptocurrency token prices and stats',
    category: 'web3',
    icon: 'TrendingUp',
    systemPrompt: 'You can provide general information about cryptocurrencies and tokens. Note that you cannot make real-time API calls but can discuss concepts and provide context.',
  },
  {
    id: 'wallet-analyzer',
    name: 'Wallet Analyzer',
    slug: 'wallet-analyzer',
    description: 'Analyze blockchain wallet activity',
    category: 'web3',
    icon: 'Wallet',
    systemPrompt: 'You are a blockchain analytics expert. Analyze wallet addresses, transaction patterns, and DeFi activity. Help users understand their on-chain footprint.',
  },
  {
    id: 'image-prompt-generator',
    name: 'Image Prompt Generator',
    slug: 'image-prompt-generator',
    description: 'Generate prompts for AI image generation',
    category: 'creative',
    icon: 'Image',
    systemPrompt: 'You are an expert at crafting image generation prompts. Create detailed, evocative prompts that will generate stunning AI art.',
  },
  {
    id: 'markdown-formatter',
    name: 'Markdown Formatter',
    slug: 'markdown-formatter',
    description: 'Format and beautify markdown content',
    category: 'productivity',
    icon: 'FileCode2',
    systemPrompt: 'You are a markdown formatting expert. Transform plain text into well-structured, properly formatted markdown.',
  },
  {
    id: 'api-tester',
    name: 'API Tester',
    slug: 'api-tester',
    description: 'Help test and debug API endpoints',
    category: 'code',
    icon: 'Network',
    systemPrompt: 'You are an API testing expert. Help construct API requests, analyze responses, and troubleshoot integration issues.',
  },
  {
    id: 'sql-generator',
    name: 'SQL Generator',
    slug: 'sql-generator',
    description: 'Generate and explain SQL queries',
    category: 'code',
    icon: 'Table',
    systemPrompt: 'You are a SQL expert. Generate optimized, secure SQL queries and explain complex queries in simple terms.',
  },
];

export const SKILL_CATEGORIES = [
  { id: 'search', name: 'Search', icon: 'Globe' },
  { id: 'code', name: 'Code', icon: 'Code2' },
  { id: 'data', name: 'Data', icon: 'BarChart3' },
  { id: 'web3', name: 'Web3', icon: 'Blocks' },
  { id: 'productivity', name: 'Productivity', icon: 'Zap' },
  { id: 'creative', name: 'Creative', icon: 'Sparkles' },
];

export function getSkillSystemPrompt(skillIds: string[]): string {
  const activeSkills = BUILTIN_SKILLS.filter(s => skillIds.includes(s.id));
  if (activeSkills.length === 0) return '';
  
  return '\n\n## ACTIVE SKILLS:\n' + activeSkills
    .map(s => `- **${s.name}**: ${s.systemPrompt}`)
    .join('\n');
}
