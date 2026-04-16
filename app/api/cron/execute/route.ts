import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { eq, lte, and } from 'drizzle-orm';
import { ensureTables } from '@/lib/ensure-tables';

const API_URL = 'https://ai.api.4everland.org/api/v1/chat/completions';

function calculateNextRun(cronExpression: string, from: Date): Date {
  const next = new Date(from);
  const expr = cronExpression.trim().toLowerCase();

  // Simple pattern matching for common cron intervals
  if (expr.includes('* * * * *') || expr === '*/1 * * * *') {
    // Every minute
    next.setMinutes(next.getMinutes() + 1);
  } else if (expr.startsWith('*/5')) {
    next.setMinutes(next.getMinutes() + 5);
  } else if (expr.startsWith('*/10')) {
    next.setMinutes(next.getMinutes() + 10);
  } else if (expr.startsWith('*/15')) {
    next.setMinutes(next.getMinutes() + 15);
  } else if (expr.startsWith('*/30')) {
    next.setMinutes(next.getMinutes() + 30);
  } else if (expr.startsWith('0 * * * *') || expr === 'hourly') {
    // Hourly
    next.setHours(next.getHours() + 1);
  } else if (expr.startsWith('0 */2')) {
    next.setHours(next.getHours() + 2);
  } else if (expr.startsWith('0 */4')) {
    next.setHours(next.getHours() + 4);
  } else if (expr.startsWith('0 */6')) {
    next.setHours(next.getHours() + 6);
  } else if (expr.startsWith('0 */12')) {
    next.setHours(next.getHours() + 12);
  } else if (expr.startsWith('0 0 * * *') || expr === 'daily') {
    // Daily
    next.setDate(next.getDate() + 1);
  } else if (expr.startsWith('0 0 * * 0') || expr === 'weekly') {
    // Weekly
    next.setDate(next.getDate() + 7);
  } else if (expr.startsWith('0 0 1 * *') || expr === 'monthly') {
    // Monthly
    next.setMonth(next.getMonth() + 1);
  } else {
    // Default: run again in 24 hours for unrecognized patterns
    next.setHours(next.getHours() + 24);
  }

  return next;
}

// Vercel Cron handler for scheduled tasks
// Configure in vercel.json: { "crons": [{ "path": "/api/cron/execute", "schedule": "*/5 * * * *" }] }
export async function GET(req: NextRequest) {
  try {
    // Verify this is called from Vercel Cron
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // In development, allow without auth
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const apiKey = process.env.FOUR_EVER_LAND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI API key not configured' }, { status: 500 });
    }

    await ensureTables();
    const now = new Date();

    // Find all active tasks where nextRun <= now
    const dueTasks = await db.query.scheduledTasks.findMany({
      where: and(
        eq(schema.scheduledTasks.isActive, true),
        lte(schema.scheduledTasks.nextRun, now),
      ),
    });

    const results: { taskId: string; name: string; status: string; error?: string }[] = [];

    for (const task of dueTasks) {
      const startTime = Date.now();
      try {
        // Call the 4everland AI API with the task's prompt
        const aiResponse = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: task.model || 'anthropic/claude-opus-4.6',
            messages: [
              {
                role: 'system',
                content: 'You are XERON, an autonomous AI agent executing a scheduled task. Complete the task concisely and accurately.',
              },
              {
                role: 'user',
                content: task.prompt,
              },
            ],
            temperature: 0.7,
            stream: false,
          }),
        });

        const durationMs = Date.now() - startTime;

        if (!aiResponse.ok) {
          const errText = await aiResponse.text();
          throw new Error(`AI API error ${aiResponse.status}: ${errText}`);
        }

        const aiData = await aiResponse.json();
        const resultContent = aiData.choices?.[0]?.message?.content || 'No response';
        const tokensUsed = aiData.usage?.total_tokens || null;

        // Save result to taskLogs
        await db.insert(schema.taskLogs).values({
          taskId: task.id,
          status: 'success',
          result: resultContent,
          tokensUsed,
          durationMs,
        });

        // Update the task: lastRun, nextRun, runCount
        const nextRun = calculateNextRun(task.cronExpression, now);
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
      } catch (err: any) {
        const durationMs = Date.now() - startTime;

        // Log the error but continue with other tasks
        await db.insert(schema.taskLogs).values({
          taskId: task.id,
          status: 'error',
          error: err.message || 'Unknown error',
          durationMs,
        });

        // Still update lastRun and nextRun so we don't retry immediately
        const nextRun = calculateNextRun(task.cronExpression, now);
        await db
          .update(schema.scheduledTasks)
          .set({
            lastRun: now,
            nextRun,
            lastResult: { status: 'error', error: err.message },
          })
          .where(eq(schema.scheduledTasks.id, task.id));

        results.push({ taskId: task.id, name: task.name, status: 'error', error: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Cron executed',
      timestamp: now.toISOString(),
      tasksProcessed: dueTasks.length,
      results,
    });
  } catch (err: any) {
    console.error('Cron error:', err);
    return NextResponse.json({ error: 'Cron execution failed', details: err.message }, { status: 500 });
  }
}
