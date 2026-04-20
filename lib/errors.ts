/**
 * Strongly-typed error taxonomy for the XERON platform.
 *
 * Motivation: the audit found routes leaking raw upstream error messages
 * (Composio, Neon, Google) straight to the client. These classes let route
 * handlers distinguish "fail fast at boot" errors from expected runtime
 * conditions, and `toResponse()` produces a sanitized NextResponse.
 */

import { NextResponse } from 'next/server';

/**
 * Thrown at module-load time when a required env var is missing or malformed.
 * Crashes the serverless cold-start instead of silently falling back to
 * insecure defaults (see lib/auth.ts rewrite).
 */
export class CriticalConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CriticalConfigError';
  }
}

/**
 * Client-safe HTTP error. Routes throw these; the api-guard wrapper catches
 * and serializes. `internalMessage` is server-logged only.
 */
export class HttpError extends Error {
  public readonly status: number;
  public readonly clientMessage: string;

  constructor(status: number, clientMessage: string, internalMessage?: string) {
    super(internalMessage ?? clientMessage);
    this.name = 'HttpError';
    this.status = status;
    this.clientMessage = clientMessage;
  }

  toResponse(): NextResponse {
    return NextResponse.json({ error: this.clientMessage }, { status: this.status });
  }
}

// Common shortcuts — use these in routes instead of constructing HttpError manually.
export const unauthorized = (msg = 'Authentication required.') => new HttpError(401, msg);
export const forbidden = (msg = 'Access denied.') => new HttpError(403, msg);
export const notFound = (msg = 'Resource not found.') => new HttpError(404, msg);
export const badRequest = (msg = 'Invalid request.') => new HttpError(400, msg);
export const serviceUnavailable = (msg = 'Service temporarily unavailable.') =>
  new HttpError(503, msg);
