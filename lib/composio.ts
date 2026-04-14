import { Composio } from '@composio/core';

let composioInstance: Composio | null = null;

export function getComposio(): Composio {
  if (!composioInstance) {
    const apiKey = process.env.COMPOSIO_API_KEY;
    if (!apiKey) {
      throw new Error('COMPOSIO_API_KEY env var is not set. Add it in Vercel dashboard.');
    }
    composioInstance = new Composio({ apiKey });
  }
  return composioInstance;
}

/** List all available toolkits */
export async function listToolkits() {
  const composio = getComposio();
  return await composio.toolkits.get();
}

/** Get a single toolkit by slug */
export async function getToolkit(slug: string) {
  const composio = getComposio();
  return await composio.toolkits.get(slug);
}

/** List tools for a toolkit */
export async function listTools(toolkit?: string) {
  const composio = getComposio();
  if (toolkit) {
    return await composio.tools.get({ toolkits: [toolkit] });
  }
  return await composio.tools.get({});
}

/**
 * Initiate OAuth connection for a user to a toolkit.
 * Returns { id, status, redirectUrl } — redirectUrl is the OAuth URL to open.
 */
export async function initiateConnection(userId: string, toolkitSlug: string) {
  const composio = getComposio();
  // authorize() handles: find/create auth config, then initiate connection
  const result = await composio.toolkits.authorize(userId, toolkitSlug);
  // result is a ConnectionRequest: { id, status, redirectUrl, waitForConnection() }
  return {
    id: result.id,
    status: result.status,
    redirectUrl: result.redirectUrl || null,
  };
}

/** Get connected accounts for a user */
export async function getConnectedAccounts(userId: string) {
  const composio = getComposio();
  return await composio.connectedAccounts.list({ userIds: [userId] });
}

/** Delete a connected account */
export async function deleteConnectedAccount(connectedAccountId: string) {
  const composio = getComposio();
  await composio.connectedAccounts.delete(connectedAccountId);
}

/**
 * Execute a tool action.
 * slug: e.g. 'GITHUB_GET_ISSUES'
 * userId: the user's ID
 * args: the tool's input arguments
 */
export async function executeTool(
  slug: string,
  userId: string,
  args: Record<string, unknown>
) {
  const composio = getComposio();
  return await composio.tools.execute(slug, {
    userId,
    arguments: args,
    dangerouslySkipVersionCheck: true,
  });
}