import { NextRequest, NextResponse } from 'next/server';

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

    // TODO: Query due scheduled tasks and execute them
    // This would:
    // 1. Find all active tasks where nextRun <= NOW
    // 2. For each task, call the AI API with the task prompt
    // 3. Log results to task_logs
    // 4. Update lastRun and nextRun
    
    return NextResponse.json({ 
      success: true, 
      message: 'Cron executed',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Cron error:', err);
    return NextResponse.json({ error: 'Cron execution failed' }, { status: 500 });
  }
}
