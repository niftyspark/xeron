import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { eq, lte, and } from 'drizzle-orm';
import { computeNextRun } from '@/lib/cron';
import { safeEquals } from '@/lib/encryption';
import { XERON_SYSTEM_PROMPT } from '@/lib/character';
import { getProviderConfig, mapModelForProvider, type AIProvider } from '@/lib/ai';

/**
 * System prompt for scheduled-task executions. Built once at module load.
 * Layers the Xeron persona with task-specific guidance so cron jobs produce
 * concrete, structured output instead of free-form chat.
 */
const CRON_SYSTEM_PROMPT = `${XERON_SYSTEM_PROMPT}

## Scheduled task execution context
You are now executing an automated scheduled task on the user's behalf, not chatting with them directly. Be concise and accurate. Complete the task and return a clear, structured result. Avoid filler commentary.`;

/**
 * Vercel Cron dispatcher.
 *
 * Hardening (audit #8):
 *   - Fails CLOSED when CRON_SECRET is unset (no more "Bearer undefined"
 *     bypass).
 *   - Removes the dev-mode no-auth branch — dev must set CRON_SECRET too.
 *   - Constant-time comparison via encryption.safeEquals.
 *
 * Correctness (audit #27):
 *   - Uses cron-parser via lib/cron.computeNextRun for all scheduling.
 */
export async function GET(req: NextRequest) {
  // AUTH --------------------------------------------------------------------
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: 'Cron dispatcher is not configured.' },
      { status: 503 },
    );
  }
  const authHeader = req.headers.get('authorization') ?? '';
  const expectedHeader = `Bearer ${expected}`;
  if (!safeEquals(authHeader, expectedHeader)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Use Groq for scheduled tasks
  const provider: AIProvider = 'groq';
  const { apiUrl, apiKey } = getProviderConfig(provider);
  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI API key not configured.' },
      { status: 503 },
    );
  }

  const now = new Date();

  // DISPATCH ----------------------------------------------------------------
  const dueTasks = await db.query.scheduledTasks.findMany({
    where: and(
      eq(schema.scheduledTasks.isActive, true),
      lte(schema.scheduledTasks.nextRun, now),
    ),
  });

  const results: {
    taskId: string;
    name: string;
    status: string;
    error?: string;
  }[] = [];

  for (const task of dueTasks) {
    const startTime = Date.now();
    try {
      const model = mapModelForProvider(task.model || 'anthropic/claude-opus-4.6', provider);
      const aiResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: CRON_SYSTEM_PROMPT },
            { role: 'user', content: task.prompt },
          ],
          temperature: 0.7,
          stream: false,
        }),
      });

      const durationMs = Date.now() - startTime;

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        throw new Error(`AI API error ${aiResponse.status}: ${errText.slice(0, 500)}`);
      }

      const aiData = (await aiResponse.json()) as {
        choices?: { message?: { content?: string } }[];
        usage?: { total_tokens?: number };
      };
      const resultContent = aiData.choices?.[0]?.message?.content || 'No response';
      const tokensUsed = aiData.usage?.total_tokens ?? null;

      await db.insert(schema.taskLogs).values({
        taskId: task.id,
        status: 'success',
        result: resultContent,
        tokensUsed,
        durationMs,
      });

      // Advance the schedule. cron-parser handles DST + timezones correctly.
      const { nextRun } = computeNextRun(
        task.cronExpression,
        task.timezone ?? 'UTC',
        now,
      );
      await db
        .update(schema.scheduledTasks)
        .set({
          lastRun: now,
          nextRun,
          runCount: (task.runCount || 0) + 1,
          lastResult: { status: 'success', preview: resultContent.slice(0, 200) },
        })
        .where(eq(schema.scheduledTasks.id, task.id));

      results.push({ taskId: task.id, name: task.name, status: 'success' });
    } catch (err) {
      const durationMs = Date.now() - startTime;
      const message = err instanceof Error ? err.message : 'Unknown error';

      await db.insert(schema.taskLogs).values({
        taskId: task.id,
        status: 'error',
        error: message,
        durationMs,
      });

      // Even on failure we must advance nextRun, else the task will be
      // re-selected on every tick.
      try {
        const { nextRun } = computeNextRun(
          task.cronExpression,
          task.timezone ?? 'UTC',
          now,
        );
        await db
          .update(schema.scheduledTasks)
          .set({
            lastRun: now,
            nextRun,
            lastResult: { status: 'error', error: message },
          })
          .where(eq(schema.scheduledTasks.id, task.id));
      } catch (schedErr) {
        // Cron itself is now invalid — disable the task so it stops blocking
        // the dispatcher.
        console.error(`[cron] disabling task ${task.id} — invalid cron`, schedErr);
        await db
          .update(schema.scheduledTasks)
          .set({
            isActive: false,
            lastRun: now,
            lastResult: { status: 'error', error: 'Invalid cron expression' },
          })
          .where(eq(schema.scheduledTasks.id, task.id));
      }

      results.push({ taskId: task.id, name: task.name, status: 'error', error: message });
    }
  }

  return NextResponse.json({
    success: true,
    timestamp: now.toISOString(),
    tasksProcessed: dueTasks.length,
    results,
  });
}
