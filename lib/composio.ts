import { Composio } from '@composio/core';
import { CriticalConfigError } from './errors';

/**
 * Thin wrapper around the Composio SDK.
 *
 * The SDK's generated TypeScript signatures change frequently — some methods
 * expect unused config objects that are documented as optional but typed as
 * required. To keep the rest of the codebase strict without scattering `as any`
 * across every route, we narrow to a local interface matching the runtime
 * contract we actually rely on.
 */
interface ComposioClient {
  toolkits: {
    get: (slugOrOptions?: unknown, options?: unknown) => Promise<unknown>;
    authorize: (
      userId: string,
      toolkitSlug: string,
      options?: { redirectUrl?: string },
    ) => Promise<{
      id: string;
      status: string;
      redirectUrl?: string | null;
    }>;
  };
  tools: {
    get: (options: unknown) => Promise<unknown>;
    execute: (
      slug: string,
      params: { userId: string; arguments: Record<string, unknown> },
    ) => Promise<unknown>;
  };
  connectedAccounts: {
    list: (params: { userIds: string[] }) => Promise<unknown>;
    get: (id: string) => Promise<unknown>;
    delete: (id: string) => Promise<unknown>;
  };
}

let composioInstance: ComposioClient | null = null;

export function getComposio(): ComposioClient {
  if (!composioInstance) {
    const apiKey = process.env.COMPOSIO_API_KEY;
    if (!apiKey) {
      throw new CriticalConfigError('COMPOSIO_API_KEY env var is not set.');
    }
    composioInstance = new Composio({ apiKey }) as unknown as ComposioClient;
  }
  return composioInstance;
}

export async function listToolkits(): Promise<unknown> {
  return await getComposio().toolkits.get();
}

export async function getToolkit(slug: string): Promise<unknown> {
  return await getComposio().toolkits.get(slug);
}

export async function listTools(toolkit?: string): Promise<unknown> {
  const composio = getComposio();
  if (toolkit) return await composio.tools.get({ toolkits: [toolkit] });
  return await composio.tools.get({});
}

/**
 * Initiates an OAuth connection for the given XERON user.
 * `redirectUrl` is forwarded to the SDK so that after OAuth the user is
 * returned to the page they started from (audit #52).
 */
export async function initiateConnection(
  userId: string,
  toolkitSlug: string,
  redirectUrl?: string,
) {
  const composio = getComposio();
  const result = await composio.toolkits.authorize(
    userId,
    toolkitSlug,
    redirectUrl ? { redirectUrl } : undefined,
  );
  return {
    id: result.id,
    status: result.status,
    redirectUrl: result.redirectUrl ?? null,
  };
}

export async function getConnectedAccounts(userId: string): Promise<unknown> {
  return await getComposio().connectedAccounts.list({ userIds: [userId] });
}

/**
 * Direct fetch by connectedAccountId. Kept for callers that need the raw
 * Composio response (e.g. debugging tooling). Production routes prefer
 * api-guard.findConnectionForUser, which scopes the lookup to the caller's
 * userId via the user-scoped list endpoint and is therefore IDOR-safe.
 */
export async function getConnectedAccount(
  connectedAccountId: string,
): Promise<unknown> {
  return await getComposio().connectedAccounts.get(connectedAccountId);
}

export async function deleteConnectedAccount(connectedAccountId: string) {
  await getComposio().connectedAccounts.delete(connectedAccountId);
}

export async function executeTool(
  slug: string,
  userId: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  return await getComposio().tools.execute(slug, { userId, arguments: args });
}

// Thin alias kept for compat with older imports.
export const checkConnectionStatus = getConnectedAccount;
