import { Composio } from '@composio/core';

let composioInstance: Composio | null = null;

export function getComposio(): Composio {
  if (!composioInstance) {
    const apiKey = process.env.COMPOSIO_API_KEY;
    if (!apiKey) {
      throw new Error('COMPOSIO_API_KEY env var is not set');
    }
    composioInstance = new Composio({ apiKey });
  }
  return composioInstance;
}

/** List all available toolkits */
export async function listToolkits() {
  const composio = getComposio();
  // toolkits.get() with no args returns list
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

/** Initiate OAuth connection */
export async function initiateConnection(userId: string, toolkitSlug: string) {
  const composio = getComposio();
  // toolkits.authorize(userId, toolkitSlug) handles auth config creation
  return await composio.toolkits.authorize(userId, toolkitSlug);
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

/** Execute a tool action */
export async function executeTool(
  toolSlug: string,
  userId: string,
  params: Record<string, unknown>
) {
  const composio = getComposio();
  return await composio.tools.execute({
    tool: toolSlug,
    user_id: userId,
    params,
  });
}