export interface ModelDefinition {
  provider: string;
  modelId: string;
  displayName: string;
  category: string;
  contextWindow: number;
  isFree: boolean;
  supportsStreaming: boolean;
  supportsFunctionCalling: boolean;
  supportsVision: boolean;
  description: string;
  tags: string[];
}

export const MODEL_PROVIDERS = [
  { id: 'openai', name: 'OpenAI', icon: '/providers/openai.svg' },
  { id: 'anthropic', name: 'Anthropic', icon: '/providers/anthropic.svg' },
  { id: 'meta-llama', name: 'Meta', icon: '/providers/meta.svg' },
  { id: 'google', name: 'Google', icon: '/providers/google.svg' },
  { id: 'mistralai', name: 'Mistral', icon: '/providers/mistral.svg' },
  { id: 'cohere', name: 'Cohere', icon: '/providers/cohere.svg' },
  { id: 'deepseek', name: 'DeepSeek', icon: '/providers/deepseek.svg' },
  { id: 'qwen', name: 'Qwen', icon: '/providers/qwen.svg' },
  { id: 'microsoft', name: 'Microsoft', icon: '/providers/microsoft.svg' },
  { id: 'nous', name: 'Nous Research', icon: '/providers/nous.svg' },
  { id: 'perplexity', name: 'Perplexity', icon: '/providers/perplexity.svg' },
  { id: 'databricks', name: 'Databricks', icon: '/providers/databricks.svg' },
];

export const MODEL_CATEGORIES = [
  { id: 'chat', name: 'Chat', icon: 'MessageSquare' },
  { id: 'code', name: 'Code', icon: 'Code2' },
  { id: 'vision', name: 'Vision', icon: 'Eye' },
  { id: 'embedding', name: 'Embedding', icon: 'Layers' },
  { id: 'image', name: 'Image Generation', icon: 'Image' },
];

export const ALL_MODELS: ModelDefinition[] = [
  // OpenAI Models
  { provider: 'openai', modelId: 'openai/gpt-4o', displayName: 'GPT-4o', category: 'chat', contextWindow: 128000, isFree: false, supportsStreaming: true, supportsFunctionCalling: true, supportsVision: true, description: 'Most capable multimodal model from OpenAI', tags: ['multimodal', 'flagship', 'vision'] },
  { provider: 'openai', modelId: 'openai/gpt-4o-mini', displayName: 'GPT-4o Mini', category: 'chat', contextWindow: 128000, isFree: false, supportsStreaming: true, supportsFunctionCalling: true, supportsVision: true, description: 'Fast and affordable multimodal model', tags: ['multimodal', 'fast', 'affordable'] },
  { provider: 'openai', modelId: 'openai/gpt-4-turbo', displayName: 'GPT-4 Turbo', category: 'chat', contextWindow: 128000, isFree: false, supportsStreaming: true, supportsFunctionCalling: true, supportsVision: true, description: 'High-capability model with vision', tags: ['flagship', 'vision'] },
  { provider: 'openai', modelId: 'openai/gpt-4', displayName: 'GPT-4', category: 'chat', contextWindow: 8192, isFree: false, supportsStreaming: true, supportsFunctionCalling: true, supportsVision: false, description: 'Original GPT-4 model', tags: ['classic'] },
  { provider: 'openai', modelId: 'openai/gpt-3.5-turbo', displayName: 'GPT-3.5 Turbo', category: 'chat', contextWindow: 16385, isFree: false, supportsStreaming: true, supportsFunctionCalling: true, supportsVision: false, description: 'Fast and cost-effective', tags: ['fast', 'affordable'] },
  { provider: 'openai', modelId: 'openai/o1-preview', displayName: 'o1 Preview', category: 'chat', contextWindow: 128000, isFree: false, supportsStreaming: true, supportsFunctionCalling: false, supportsVision: false, description: 'Reasoning model for complex tasks', tags: ['reasoning', 'chain-of-thought'] },
  { provider: 'openai', modelId: 'openai/o1-mini', displayName: 'o1 Mini', category: 'chat', contextWindow: 128000, isFree: false, supportsStreaming: true, supportsFunctionCalling: false, supportsVision: false, description: 'Smaller reasoning model', tags: ['reasoning', 'fast'] },
  { provider: 'openai', modelId: 'openai/chatgpt-4o-latest', displayName: 'ChatGPT-4o Latest', category: 'chat', contextWindow: 128000, isFree: false, supportsStreaming: true, supportsFunctionCalling: true, supportsVision: true, description: 'Latest ChatGPT-4o version', tags: ['latest', 'multimodal'] },

  // Anthropic Models
  { provider: 'anthropic', modelId: 'anthropic/claude-opus-4.6', displayName: 'Claude Opus 3.5', category: 'chat', contextWindow: 200000, isFree: false, supportsStreaming: true, supportsFunctionCalling: true, supportsVision: true, description: 'Most capable Claude model with extended thinking', tags: ['flagship', 'long-context', 'vision'] },
  { provider: 'anthropic', modelId: 'anthropic/claude-sonnet-4', displayName: 'Claude 3.5 Sonnet', category: 'chat', contextWindow: 200000, isFree: false, supportsStreaming: true, supportsFunctionCalling: true, supportsVision: true, description: 'Balanced performance and speed', tags: ['balanced', 'vision', 'coding'] },
  { provider: 'anthropic', modelId: 'anthropic/claude-3.5-haiku', displayName: 'Claude 3.5 Haiku', category: 'chat', contextWindow: 200000, isFree: false, supportsStreaming: true, supportsFunctionCalling: true, supportsVision: false, description: 'Fastest Claude model', tags: ['fast', 'affordable'] },
  { provider: 'anthropic', modelId: 'anthropic/claude-3-opus', displayName: 'Claude 3 Opus', category: 'chat', contextWindow: 200000, isFree: false, supportsStreaming: true, supportsFunctionCalling: true, supportsVision: true, description: 'Previous flagship model', tags: ['flagship', 'vision'] },
  { provider: 'anthropic', modelId: 'anthropic/claude-3-sonnet', displayName: 'Claude 3 Sonnet', category: 'chat', contextWindow: 200000, isFree: false, supportsStreaming: true, supportsFunctionCalling: true, supportsVision: true, description: 'Previous generation balanced', tags: ['balanced', 'vision'] },
  { provider: 'anthropic', modelId: 'anthropic/claude-3-haiku', displayName: 'Claude 3 Haiku', category: 'chat', contextWindow: 200000, isFree: false, supportsStreaming: true, supportsFunctionCalling: true, supportsVision: false, description: 'Previous gen fast model', tags: ['fast', 'affordable'] },

  // Meta Llama Models
  { provider: 'meta-llama', modelId: 'meta-llama/llama-3.1-405b-instruct', displayName: 'Llama 3.1 405B', category: 'chat', contextWindow: 131072, isFree: false, supportsStreaming: true, supportsFunctionCalling: true, supportsVision: false, description: 'Largest open-source LLM', tags: ['open-source', 'flagship', 'large'] },
  { provider: 'meta-llama', modelId: 'meta-llama/llama-3.1-70b-instruct', displayName: 'Llama 3.1 70B', category: 'chat', contextWindow: 131072, isFree: false, supportsStreaming: true, supportsFunctionCalling: true, supportsVision: false, description: 'High-capability open model', tags: ['open-source', 'balanced'] },
  { provider: 'meta-llama', modelId: 'meta-llama/llama-3.1-8b-instruct', displayName: 'Llama 3.1 8B', category: 'chat', contextWindow: 131072, isFree: true, supportsStreaming: true, supportsFunctionCalling: false, supportsVision: false, description: 'Efficient small model', tags: ['open-source', 'fast', 'free'] },
  { provider: 'meta-llama', modelId: 'meta-llama/llama-3.2-90b-vision-instruct', displayName: 'Llama 3.2 90B Vision', category: 'vision', contextWindow: 131072, isFree: false, supportsStreaming: true, supportsFunctionCalling: false, supportsVision: true, description: 'Multimodal Llama with vision', tags: ['open-source', 'vision', 'multimodal'] },
  { provider: 'meta-llama', modelId: 'meta-llama/llama-3.2-11b-vision-instruct', displayName: 'Llama 3.2 11B Vision', category: 'vision', contextWindow: 131072, isFree: false, supportsStreaming: true, supportsFunctionCalling: false, supportsVision: true, description: 'Compact multimodal model', tags: ['open-source', 'vision', 'compact'] },
  { provider: 'meta-llama', modelId: 'meta-llama/llama-3.2-3b-instruct', displayName: 'Llama 3.2 3B', category: 'chat', contextWindow: 131072, isFree: true, supportsStreaming: true, supportsFunctionCalling: false, supportsVision: false, description: 'Tiny but capable', tags: ['open-source', 'tiny', 'free'] },
  { provider: 'meta-llama', modelId: 'meta-llama/llama-3.2-1b-instruct', displayName: 'Llama 3.2 1B', category: 'chat', contextWindow: 131072, isFree: true, supportsStreaming: true, supportsFunctionCalling: false, supportsVision: false, description: 'Smallest Llama model', tags: ['open-source', 'tiny', 'free'] },
  { provider: 'meta-llama', modelId: 'meta-llama/llama-3-70b-instruct', displayName: 'Llama 3 70B', category: 'chat', contextWindow: 8192, isFree: false, supportsStreaming: true, supportsFunctionCalling: false, supportsVision: false, description: 'Previous gen large model', tags: ['open-source'] },
  { provider: 'meta-llama', modelId: 'meta-llama/llama-3-8b-instruct', displayName: 'Llama 3 8B', category: 'chat', contextWindow: 8192, isFree: true, supportsStreaming: true, supportsFunctionCalling: false, supportsVision: false, description: 'Previous gen small model', tags: ['open-source', 'free'] },
  { provider: 'meta-llama', modelId: 'meta-llama/llama-guard-3-8b', displayName: 'Llama Guard 3 8B', category: 'chat', contextWindow: 8192, isFree: true, supportsStreaming: true, supportsFunctionCalling: false, supportsVision: false, description: 'Safety classification model', tags: ['open-source', 'safety', 'free'] },

  // Google Models
  { provider: 'google', modelId: 'google/gemini-pro', displayName: 'Gemini Pro', category: 'chat', contextWindow: 32768, isFree: false, supportsStreaming: true, supportsFunctionCalling: true, supportsVision: false, description: 'Google multimodal model', tags: ['multimodal'] },
  { provider: 'google', modelId: 'google/gemini-1.5-pro', displayName: 'Gemini 1.5 Pro', category: 'chat', contextWindow: 1048576, isFree: false, supportsStreaming: true, supportsFunctionCalling: true, supportsVision: true, description: 'Ultra-long context model', tags: ['long-context', 'vision', 'flagship'] },
  { provider: 'google', modelId: 'google/gemini-1.5-flash', displayName: 'Gemini 1.5 Flash', category: 'chat', contextWindow: 1048576, isFree: false, supportsStreaming: true, supportsFunctionCalling: true, supportsVision: true, description: 'Fast long-context model', tags: ['fast', 'long-context', 'vision'] },
  { provider: 'google', modelId: 'google/gemini-2.0-flash-exp', displayName: 'Gemini 2.0 Flash', category: 'chat', contextWindow: 1048576, isFree: false, supportsStreaming: true, supportsFunctionCalling: true, supportsVision: true, description: 'Latest Gemini Flash', tags: ['latest', 'fast', 'vision'] },
  { provider: 'google', modelId: 'google/gemma-2-27b-it', displayName: 'Gemma 2 27B', category: 'chat', contextWindow: 8192, isFree: false, supportsStreaming: true, supportsFunctionCalling: false, supportsVision: false, description: 'Open model from Google', tags: ['open-source'] },
  { provider: 'google', modelId: 'google/gemma-2-9b-it', displayName: 'Gemma 2 9B', category: 'chat', contextWindow: 8192, isFree: true, supportsStreaming: true, supportsFunctionCalling: false, supportsVision: false, description: 'Compact open model', tags: ['open-source', 'free'] },

  // Mistral Models
  { provider: 'mistralai', modelId: 'mistralai/mistral-large', displayName: 'Mistral Large', category: 'chat', contextWindow: 128000, isFree: false, supportsStreaming: true, supportsFunctionCalling: true, supportsVision: false, description: 'Most capable Mistral model', tags: ['flagship', 'function-calling'] },
  { provider: 'mistralai', modelId: 'mistralai/mistral-medium', displayName: 'Mistral Medium', category: 'chat', contextWindow: 32768, isFree: false, supportsStreaming: true, supportsFunctionCalling: true, supportsVision: false, description: 'Balanced Mistral model', tags: ['balanced'] },
  { provider: 'mistralai', modelId: 'mistralai/mistral-small', displayName: 'Mistral Small', category: 'chat', contextWindow: 32768, isFree: false, supportsStreaming: true, supportsFunctionCalling: true, supportsVision: false, description: 'Fast Mistral model', tags: ['fast', 'affordable'] },
  { provider: 'mistralai', modelId: 'mistralai/mixtral-8x22b-instruct', displayName: 'Mixtral 8x22B', category: 'chat', contextWindow: 65536, isFree: false, supportsStreaming: true, supportsFunctionCalling: true, supportsVision: false, description: 'Large MoE model', tags: ['moe', 'large'] },
  { provider: 'mistralai', modelId: 'mistralai/mixtral-8x7b-instruct', displayName: 'Mixtral 8x7B', category: 'chat', contextWindow: 32768, isFree: true, supportsStreaming: true, supportsFunctionCalling: false, supportsVision: false, description: 'Efficient MoE model', tags: ['moe', 'free', 'open-source'] },
  { provider: 'mistralai', modelId: 'mistralai/mistral-7b-instruct', displayName: 'Mistral 7B', category: 'chat', contextWindow: 32768, isFree: true, supportsStreaming: true, supportsFunctionCalling: false, supportsVision: false, description: 'Compact model', tags: ['compact', 'free', 'open-source'] },
  { provider: 'mistralai', modelId: 'mistralai/codestral-mamba', displayName: 'Codestral Mamba', category: 'code', contextWindow: 256000, isFree: false, supportsStreaming: true, supportsFunctionCalling: false, supportsVision: false, description: 'Code-specialized Mamba architecture', tags: ['code', 'mamba'] },
  { provider: 'mistralai', modelId: 'mistralai/pixtral-12b', displayName: 'Pixtral 12B', category: 'vision', contextWindow: 128000, isFree: false, supportsStreaming: true, supportsFunctionCalling: false, supportsVision: true, description: 'Vision model from Mistral', tags: ['vision', 'multimodal'] },
  { provider: 'mistralai', modelId: 'mistralai/mistral-nemo', displayName: 'Mistral Nemo', category: 'chat', contextWindow: 128000, isFree: true, supportsStreaming: true, supportsFunctionCalling: false, supportsVision: false, description: 'Joint with NVIDIA', tags: ['open-source', 'free'] },

  // Cohere Models
  { provider: 'cohere', modelId: 'cohere/command-r-plus', displayName: 'Command R+', category: 'chat', contextWindow: 128000, isFree: false, supportsStreaming: true, supportsFunctionCalling: true, supportsVision: false, description: 'Most capable Cohere model with RAG', tags: ['rag', 'flagship'] },
  { provider: 'cohere', modelId: 'cohere/command-r', displayName: 'Command R', category: 'chat', contextWindow: 128000, isFree: false, supportsStreaming: true, supportsFunctionCalling: true, supportsVision: false, description: 'Efficient model with RAG capabilities', tags: ['rag', 'balanced'] },
  { provider: 'cohere', modelId: 'cohere/command', displayName: 'Command', category: 'chat', contextWindow: 4096, isFree: false, supportsStreaming: true, supportsFunctionCalling: false, supportsVision: false, description: 'Classic command model', tags: ['classic'] },
  { provider: 'cohere', modelId: 'cohere/command-light', displayName: 'Command Light', category: 'chat', contextWindow: 4096, isFree: true, supportsStreaming: true, supportsFunctionCalling: false, supportsVision: false, description: 'Lightweight command model', tags: ['fast', 'free'] },

  // DeepSeek Models
  { provider: 'deepseek', modelId: 'deepseek/deepseek-chat', displayName: 'DeepSeek Chat', category: 'chat', contextWindow: 128000, isFree: false, supportsStreaming: true, supportsFunctionCalling: true, supportsVision: false, description: 'General chat model from DeepSeek', tags: ['affordable'] },
  { provider: 'deepseek', modelId: 'deepseek/deepseek-coder', displayName: 'DeepSeek Coder', category: 'code', contextWindow: 128000, isFree: false, supportsStreaming: true, supportsFunctionCalling: false, supportsVision: false, description: 'Code-specialized model', tags: ['code'] },
  { provider: 'deepseek', modelId: 'deepseek/deepseek-r1', displayName: 'DeepSeek R1', category: 'chat', contextWindow: 128000, isFree: false, supportsStreaming: true, supportsFunctionCalling: false, supportsVision: false, description: 'Reasoning model with chain-of-thought', tags: ['reasoning', 'chain-of-thought'] },
  { provider: 'deepseek', modelId: 'deepseek/deepseek-r1-distill-llama-70b', displayName: 'DeepSeek R1 Llama 70B', category: 'chat', contextWindow: 128000, isFree: false, supportsStreaming: true, supportsFunctionCalling: false, supportsVision: false, description: 'Distilled reasoning model', tags: ['reasoning', 'distilled'] },

  // Qwen Models
  { provider: 'qwen', modelId: 'qwen/qwen-2.5-72b-instruct', displayName: 'Qwen 2.5 72B', category: 'chat', contextWindow: 131072, isFree: false, supportsStreaming: true, supportsFunctionCalling: true, supportsVision: false, description: 'Latest large Qwen model', tags: ['open-source', 'large'] },
  { provider: 'qwen', modelId: 'qwen/qwen-2.5-32b-instruct', displayName: 'Qwen 2.5 32B', category: 'chat', contextWindow: 131072, isFree: false, supportsStreaming: true, supportsFunctionCalling: true, supportsVision: false, description: 'Mid-size Qwen model', tags: ['open-source', 'balanced'] },
  { provider: 'qwen', modelId: 'qwen/qwen-2.5-7b-instruct', displayName: 'Qwen 2.5 7B', category: 'chat', contextWindow: 131072, isFree: true, supportsStreaming: true, supportsFunctionCalling: false, supportsVision: false, description: 'Compact Qwen model', tags: ['open-source', 'compact', 'free'] },
  { provider: 'qwen', modelId: 'qwen/qwen-2.5-coder-32b-instruct', displayName: 'Qwen 2.5 Coder 32B', category: 'code', contextWindow: 131072, isFree: false, supportsStreaming: true, supportsFunctionCalling: false, supportsVision: false, description: 'Code-specialized Qwen', tags: ['code', 'open-source'] },
  { provider: 'qwen', modelId: 'qwen/qwen-2-vl-72b-instruct', displayName: 'Qwen 2 VL 72B', category: 'vision', contextWindow: 32768, isFree: false, supportsStreaming: true, supportsFunctionCalling: false, supportsVision: true, description: 'Vision-language Qwen model', tags: ['vision', 'open-source'] },
  { provider: 'qwen', modelId: 'qwen/qwq-32b-preview', displayName: 'QwQ 32B Preview', category: 'chat', contextWindow: 32768, isFree: false, supportsStreaming: true, supportsFunctionCalling: false, supportsVision: false, description: 'Preview reasoning model', tags: ['reasoning', 'preview'] },

  // Microsoft Models
  { provider: 'microsoft', modelId: 'microsoft/phi-3-medium-128k-instruct', displayName: 'Phi-3 Medium 128K', category: 'chat', contextWindow: 128000, isFree: true, supportsStreaming: true, supportsFunctionCalling: false, supportsVision: false, description: 'Medium-size Phi model', tags: ['open-source', 'free'] },
  { provider: 'microsoft', modelId: 'microsoft/phi-3-mini-128k-instruct', displayName: 'Phi-3 Mini 128K', category: 'chat', contextWindow: 128000, isFree: true, supportsStreaming: true, supportsFunctionCalling: false, supportsVision: false, description: 'Compact but capable', tags: ['open-source', 'tiny', 'free'] },
  { provider: 'microsoft', modelId: 'microsoft/wizardlm-2-8x22b', displayName: 'WizardLM 2 8x22B', category: 'chat', contextWindow: 65536, isFree: false, supportsStreaming: true, supportsFunctionCalling: false, supportsVision: false, description: 'Wizard-tuned MoE model', tags: ['moe', 'instruction-tuned'] },

  // Nous Research Models
  { provider: 'nous', modelId: 'nousresearch/hermes-3-llama-3.1-405b', displayName: 'Hermes 3 405B', category: 'chat', contextWindow: 131072, isFree: false, supportsStreaming: true, supportsFunctionCalling: true, supportsVision: false, description: 'Largest Hermes model', tags: ['open-source', 'flagship'] },
  { provider: 'nous', modelId: 'nousresearch/hermes-3-llama-3.1-70b', displayName: 'Hermes 3 70B', category: 'chat', contextWindow: 131072, isFree: false, supportsStreaming: true, supportsFunctionCalling: true, supportsVision: false, description: 'Large Hermes model', tags: ['open-source'] },
  { provider: 'nous', modelId: 'nousresearch/hermes-2-pro-llama-3-8b', displayName: 'Hermes 2 Pro 8B', category: 'chat', contextWindow: 8192, isFree: true, supportsStreaming: true, supportsFunctionCalling: false, supportsVision: false, description: 'Compact Hermes model', tags: ['open-source', 'free'] },

  // Perplexity Models
  { provider: 'perplexity', modelId: 'perplexity/llama-3.1-sonar-large-128k-online', displayName: 'Sonar Large Online', category: 'chat', contextWindow: 128000, isFree: false, supportsStreaming: true, supportsFunctionCalling: false, supportsVision: false, description: 'Online search-augmented', tags: ['online', 'search'] },
  { provider: 'perplexity', modelId: 'perplexity/llama-3.1-sonar-small-128k-online', displayName: 'Sonar Small Online', category: 'chat', contextWindow: 128000, isFree: false, supportsStreaming: true, supportsFunctionCalling: false, supportsVision: false, description: 'Compact search-augmented', tags: ['online', 'search', 'fast'] },
  { provider: 'perplexity', modelId: 'perplexity/llama-3.1-sonar-huge-128k-online', displayName: 'Sonar Huge Online', category: 'chat', contextWindow: 128000, isFree: false, supportsStreaming: true, supportsFunctionCalling: false, supportsVision: false, description: 'Largest search model', tags: ['online', 'search', 'flagship'] },

  // Databricks / DBRX
  { provider: 'databricks', modelId: 'databricks/dbrx-instruct', displayName: 'DBRX Instruct', category: 'chat', contextWindow: 32768, isFree: false, supportsStreaming: true, supportsFunctionCalling: false, supportsVision: false, description: 'Databricks MoE model', tags: ['moe', 'enterprise'] },

  // Additional Open-Source Models
  { provider: 'meta-llama', modelId: 'meta-llama/llama-2-70b-chat', displayName: 'Llama 2 70B', category: 'chat', contextWindow: 4096, isFree: true, supportsStreaming: true, supportsFunctionCalling: false, supportsVision: false, description: 'Previous gen Llama', tags: ['open-source', 'free', 'legacy'] },
  { provider: 'meta-llama', modelId: 'meta-llama/llama-2-13b-chat', displayName: 'Llama 2 13B', category: 'chat', contextWindow: 4096, isFree: true, supportsStreaming: true, supportsFunctionCalling: false, supportsVision: false, description: 'Previous gen compact Llama', tags: ['open-source', 'free', 'legacy'] },

  // Code Models
  { provider: 'deepseek', modelId: 'deepseek/deepseek-coder-33b-instruct', displayName: 'DeepSeek Coder 33B', category: 'code', contextWindow: 16384, isFree: false, supportsStreaming: true, supportsFunctionCalling: false, supportsVision: false, description: 'Mid-size code model', tags: ['code', 'open-source'] },
  { provider: 'meta-llama', modelId: 'meta-llama/codellama-70b-instruct', displayName: 'Code Llama 70B', category: 'code', contextWindow: 16384, isFree: false, supportsStreaming: true, supportsFunctionCalling: false, supportsVision: false, description: 'Large code-specialized Llama', tags: ['code', 'open-source'] },
  { provider: 'meta-llama', modelId: 'meta-llama/codellama-34b-instruct', displayName: 'Code Llama 34B', category: 'code', contextWindow: 16384, isFree: false, supportsStreaming: true, supportsFunctionCalling: false, supportsVision: false, description: 'Mid-size Code Llama', tags: ['code', 'open-source'] },

  // Yi Models
  { provider: 'yi', modelId: '01-ai/yi-large', displayName: 'Yi Large', category: 'chat', contextWindow: 32768, isFree: false, supportsStreaming: true, supportsFunctionCalling: false, supportsVision: false, description: 'Large bilingual model', tags: ['bilingual', 'chinese'] },
  { provider: 'yi', modelId: '01-ai/yi-34b-chat', displayName: 'Yi 34B Chat', category: 'chat', contextWindow: 4096, isFree: true, supportsStreaming: true, supportsFunctionCalling: false, supportsVision: false, description: 'Bilingual chat model', tags: ['bilingual', 'free'] },

  // Nvidia Models
  { provider: 'nvidia', modelId: 'nvidia/llama-3.1-nemotron-70b-instruct', displayName: 'Nemotron 70B', category: 'chat', contextWindow: 131072, isFree: false, supportsStreaming: true, supportsFunctionCalling: false, supportsVision: false, description: 'NVIDIA fine-tuned Llama', tags: ['nvidia', 'enterprise'] },

  // Additional specialized models
  { provider: 'openai', modelId: 'openai/dall-e-3', displayName: 'DALL-E 3', category: 'image', contextWindow: 0, isFree: false, supportsStreaming: false, supportsFunctionCalling: false, supportsVision: false, description: 'Image generation model', tags: ['image-gen'] },
  { provider: 'openai', modelId: 'openai/text-embedding-3-large', displayName: 'Embedding 3 Large', category: 'embedding', contextWindow: 8191, isFree: false, supportsStreaming: false, supportsFunctionCalling: false, supportsVision: false, description: 'Large embedding model', tags: ['embedding'] },
  { provider: 'openai', modelId: 'openai/text-embedding-3-small', displayName: 'Embedding 3 Small', category: 'embedding', contextWindow: 8191, isFree: false, supportsStreaming: false, supportsFunctionCalling: false, supportsVision: false, description: 'Small embedding model', tags: ['embedding', 'affordable'] },

];


export const DEFAULT_MODEL = 'anthropic/claude-opus-4.6';
export const APP_NAME = 'XERON';
export const APP_DESCRIPTION = 'Your Decentralized Autonomous AI Agent';
export const BASE_CHAIN_ID = 8453;
