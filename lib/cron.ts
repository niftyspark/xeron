/**
 * Cron helpers.
 *
 * The audited `calculateNextRun` was a hand-rolled string-match parser that
 * silently defaulted to +24h for any expression it didn't recognise, and the
 * task scheduler never initialised `nextRun` — so new tasks never ran.
 *
 * This module uses `cron-parser` for correct RFC-compliant parsing with
 * timezone support, and exports a single `computeNextRun()` that both the
 * dispatcher and task-create endpoints call — guaranteeing consistency.
 */

import parser from 'cron-parser';

export interface CronPlan {
  /** The next UTC timestamp at which the task should execute. */
  nextRun: Date;
}

/**
 * Returns the next run time for a validated cron expression.
 * Throws if the expression is unparseable OR the timezone is unknown —
 * callers should surface these as 400 responses, never swallow them.
 */
export function computeNextRun(
  cronExpression: string,
  timezone: string,
  from: Date = new Date(),
): CronPlan {
  const interval = parser.parseExpression(cronExpression, {
    currentDate: from,
    tz: timezone,
  });
  return { nextRun: interval.next().toDate() };
}

/**
 * Validates a cron/tz combo without computing a date — used by Zod schemas
 * and by the task-create route as a last-line guard.
 */
export function isValidCron(expression: string, timezone = 'UTC'): boolean {
  try {
    parser.parseExpression(expression, { tz: timezone });
    return true;
  } catch {
    return false;
  }
}
