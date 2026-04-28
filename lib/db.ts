import { neon } from '@neondatabase/serverless';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { eq, and, desc } from 'drizzle-orm';
import * as schema from './schema';

export type XeronDatabase = NeonHttpDatabase<typeof schema>;

// Dev mode storage
interface DevConversation {
  id: string;
  userId: string;
  title: string;
  model: string;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface DevMessage {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  createdAt: Date;
}

interface DevUser {
  id: string;
  walletAddress: string;
  displayName: string | null;
  avatarUrl: string | null;
  settings: Record<string, unknown> | null;
}

const devStore = {
  users: new Map<string, DevUser>() as Map<string, DevUser>,
  conversations: new Map<string, DevConversation>() as Map<string, DevConversation>,
  messages: new Map<string, DevMessage>() as Map<string, DevMessage>,
};

const DEV_USER_ID = 'dev-user-001';

function createDb(): XeronDatabase | null {
  const url = process.env.DATABASE_URL;
  if (!url || url === '') {
    return null;
  }
  try {
    return drizzle(neon(url), { schema });
  } catch {
    return null;
  }
}

let _db: XeronDatabase | null = null;
let _tried = false;

function getDb(): XeronDatabase | null {
  if (!_tried) {
    _db = createDb();
    _tried = true;
  }
  return _db;
}

const devDb = {
  query: {
    users: {
      findFirst: async (opts?: { where?: any }) => {
        const user = devStore.users.get(DEV_USER_ID);
        return user || null;
      },
      findMany: async () => {
        return Array.from(devStore.users.values());
      },
    },
    conversations: {
      findMany: async (opts?: { where?: any; orderBy?: any }) => {
        let convs = Array.from(devStore.conversations.values()).filter(
          c => c.userId === DEV_USER_ID
        );
        convs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        return convs;
      },
      findFirst: async (opts: { where?: any }) => {
        const all = await devDb.query.conversations.findMany();
        return all[0] || null;
      },
    },
    messages: {
      findMany: async (opts?: { where?: any; orderBy?: any }) => {
        const msgs = Array.from(devStore.messages.values());
        if (opts?.where) {
          return msgs.filter(m => m.conversationId === opts.where?.conversationId);
        }
        return msgs;
      },
    },
    scheduledTasks: {
      findMany: async () => [],
    },
    memories: {
      findMany: async () => [],
    },
  },
  insert: (table: any) => ({
    values: (data: any) => ({
      returning: async () => {
        const id = crypto.randomUUID();
        if (table === schema.conversations) {
          const conv: DevConversation = {
            id,
            userId: DEV_USER_ID,
            title: data.title || 'New Conversation',
            model: data.model || 'llama-3.3-70b-versatile',
            isPinned: data.isPinned ?? false,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          devStore.conversations.set(id, conv);
          return [conv];
        } else if (table === schema.messages) {
          const msg: DevMessage = {
            id,
            conversationId: data.conversationId,
            role: data.role,
            content: data.content,
            createdAt: new Date(),
          };
          devStore.messages.set(id, msg);
          return [msg];
        } else if (table === schema.users) {
          const user: DevUser = {
            id,
            walletAddress: data.walletAddress || '',
            displayName: data.displayName || null,
            avatarUrl: data.avatarUrl || null,
            settings: data.settings || null,
          };
          devStore.users.set(id, user);
          return [user];
        }
        return [{ ...data, id }];
      },
    }),
  }),
  update: (table: any) => ({
    set: (data: any) => ({
      where: (cond: any) => ({
        returning: async () => {
          if (table === schema.conversations) {
            const convs = Array.from(devStore.conversations.values());
            for (const conv of convs) {
              if (conv.userId === DEV_USER_ID) {
                Object.assign(conv, data, { updatedAt: new Date() });
                return [conv];
              }
            }
          }
          return [data];
        },
      }),
    }),
  }),
  delete: (table: any) => ({
    where: (cond: any) => ({
      returning: async () => {
        return [];
      },
    }),
  }),
};

export const db = new Proxy({} as XeronDatabase, {
  get(_target, prop) {
    const instance = getDb();
    if (!instance) {
      return (devDb as any)[prop as string];
    }
    return (instance as unknown as Record<string | symbol, unknown>)[prop as string];
  },
});

export function isDbAvailable(): boolean {
  return true;
}

export { schema };