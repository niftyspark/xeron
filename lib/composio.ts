import { Composio } from '@composio/core';

let composioInstance: Composio | null = null;

export function getComposio(): Composio {
  if (!composioInstance) {
    const apiKey = process.env.COMPOSIO_API_KEY;
    if (!apiKey) {
      throw new Error('COMPOSIO_API_KEY env var is not set.');
    }
    composioInstance = new Composio({ apiKey });
  }
  return composioInstance;
}

export async function listToolkits() {
  const composio = getComposio();
  return await composio.toolkits.get();
}

export async function getToolkit(slug: string) {
  const composio = getComposio();
  return await composio.toolkits.get(slug);
}

export async function listTools(toolkit?: string) {
  const composio = getComposio();
  if (toolkit) {
    return await composio.tools.get({ toolkits: [toolkit] });
  }
  return await composio.tools.get({});
}

/**
 * Initiate OAuth connection. Returns the full connection request
 * including waitForConnection method.
 */
export async function initiateConnection(userId: string, toolkitSlug: string) {
  const composio = getComposio();
  const result = await composio.toolkits.authorize(userId, toolkitSlug);
  return {
    id: result.id,
    status: result.status,
    redirectUrl: result.redirectUrl || null,
  };
}

/**
 * Get ALL connected accounts for a user (including initiated/pending).
 */
export async function getConnectedAccounts(userId: string) {
  const composio = getComposio();
  // List all statuses, not just active
  const result = await composio.connectedAccounts.list({ userIds: [userId] });
  return result;
}

export async function deleteConnectedAccount(connectedAccountId: string) {
  const composio = getComposio();
  await composio.connectedAccounts.delete(connectedAccountId);
}

export async function executeTool(
  slug: string,
  userId: string,
  args: Record<string, unknown>
) {
  const composio = getComposio();
  return await composio.tools.execute(slug, {
    userId,
    arguments: args,
  });
}

/**
 * Check if a specific connection is now active.
 */
export async function checkConnectionStatus(connectedAccountId: string) {
  const composio = getComposio();
  const account = await composio.connectedAccounts.get(connectedAccountId);
  return account;
}