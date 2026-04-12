import { Composio } from '@composio/core';

let composioInstance: Composio | null = null;

export function getComposio(): Composio {
  if (!composioInstance) {
    const apiKey = process.env.COMPOSIO_API_KEY;
    if (!apiKey) {
      throw new Error('COMPOSIO_API_KEY env var is not set');
    }
    composioInstance = new Composio({
      apiKey,
      allowTracking: false,
    });
  }
  return composioInstance;
}

/**
 * List all available toolkits from Composio
 */
export async function listToolkits(category?: string) {
  const composio = getComposio();
  const toolkits = await composio.toolkits.list({
    ...(category ? { category } : {}),
  });
  return toolkits;
}

/**
 * Get details for a specific toolkit
 */
export async function getToolkit(slug: string) {
  const composio = getComposio();
  const toolkit = await composio.toolkits.get(slug);
  return toolkit;
}

/**
 * List tools for a specific toolkit
 */
export async function listTools(toolkit?: string) {
  const composio = getComposio();
  const tools = await composio.tools.list({
    ...(toolkit ? { toolkit } : {}),
  });
  return tools;
}

/**
 * Initiate OAuth connection for a user to a toolkit
 */
export async function initiateConnection(userId: string, toolkit: string, redirectUrl?: string) {
  const composio = getComposio();
  const connectionRequest = await composio.toolkits.authorize({
    user_id: userId,
    toolkit,
  });
  return connectionRequest;
}

/**
 * Get all connected accounts for a user
 */
export async function getConnectedAccounts(userId: string) {
  const composio = getComposio();
  const accounts = await composio.connectedAccounts.list({
    user_id: userId,
  });
  return accounts;
}

/**
 * Delete a connected account
 */
export async function deleteConnectedAccount(connectedAccountId: string) {
  const composio = getComposio();
  await composio.connectedAccounts.delete({
    connectedAccountId,
  });
}

/**
 * Execute a tool action
 */
export async function executeTool(
  toolSlug: string,
  userId: string,
  params: Record<string, unknown>
) {
  const composio = getComposio();
  const result = await composio.tools.execute({
    tool: toolSlug,
    user_id: userId,
    params,
    dangerouslySkipVersionCheck: true,
  });
  return result;
}

/**
 * Search for tools matching a query
 */
export async function searchTools(query: string) {
  const composio = getComposio();
  const results = await composio.tools.list({
    search: query,
  });
  return results;
}

/**
 * Create a session for a user (gives tools + connection management)
 */
export async function createUserSession(userId: string, toolkits?: string[]) {
  const composio = getComposio();
  const session = await composio.create(userId, {
    ...(toolkits ? { toolkits } : {}),
  });
  return session;
}

// Popular toolkit slugs for the UI
export const POPULAR_TOOLKITS = [
  'github', 'slack', 'discord', 'notion', 'gmail', 'google-sheets',
  'google-drive', 'google-calendar', 'twitter', 'instagram', 'facebook',
  'linkedin', 'youtube', 'figma', 'canva', 'trello', 'asana', 'jira',
  'linear', 'clickup', 'monday', 'airtable', 'stripe', 'paypal',
  'hubspot', 'mailchimp', 'salesforce', 'zoom', 'microsoft-teams',
  'dropbox', 'onedrive', 'shopify', 'wordpress', 'medium', 'reddit',
  'twitch', 'spotify', 'telegram', 'whatsapp', 'intercom', 'zendesk',
  'freshdesk', 'pipedrive', 'zoho-crm', 'sendgrid', 'twilio',
  'firebase', 'supabase', 'vercel', 'netlify', 'heroku', 'aws',
  'google-cloud', 'azure', 'cloudflare', 'datadog', 'sentry',
  'pagerduty', 'opsgenie', 'github-actions', 'gitlab', 'bitbucket',
  'docker', 'kubernetes', 'terraform', 'jenkins', 'circleci',
  'zapier', 'make', 'ifttt', 'n8n', 'typeform', 'calendly',
  'loom', 'miro', 'confluence', 'webflow', 'squarespace',
  'wix', 'ghost', 'substack', 'convertkit', 'beehiiv',
  'gumroad', 'lemonsqueezy', 'paddle', 'quickbooks', 'xero',
  'freshbooks', 'wave', 'plaid', 'wise', 'payoneer',
  'snapchat', 'tiktok', 'pinterest', 'tumblr', 'threads',
  'hackernews', 'producthunt', 'devto', 'hashnode',
  'stackoverflow', 'coda', 'smartsheet', 'basecamp',
  'todoist', 'any-do', 'ticktick', 'things', 'evernote',
  'bear', 'obsidian', 'raindrop', 'pocket', 'instapaper',
  'feedly', 'buffer', 'hootsuite', 'later', 'sproutsocial',
  'bitly', 'rebrandly', 'calendarhero', 'acuity', 'doodle',
  'clockify', 'toggl', 'harvest', 'timely', 'rescuetime',
] as const;