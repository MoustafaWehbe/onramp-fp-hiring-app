import type { Response } from "express";
import {
  subscribeRealtime,
  type RealtimeEvent,
  type RealtimeMessage,
} from "@starter-kit/shared/realtime";

/**
 * Server-Sent Events rather than WebSockets — see the ADR note in
 * docs/realtime.md. In short: every event here travels server -> client only,
 * auth is an HttpOnly cookie that EventSource sends without extra handshake
 * code, and SSE needs no dependency Express does not already have.
 *
 * This registry only knows about connections held by *this* process. Events
 * arrive from the shared Redis bus, so a fit score completed by the workers
 * process still reaches a recruiter connected here.
 */

/** Proxies and load balancers drop idle streams; a comment line keeps them. */
const HEARTBEAT_MS = 25_000;

/**
 * A handful of tabs is normal; hundreds means a reconnect loop leaking
 * sockets. The oldest stream is dropped rather than refusing the newest, so a
 * client that reconnects before the server noticed the old socket died still
 * ends up connected.
 */
const MAX_CONNECTIONS_PER_USER = 8;

interface Connection {
  id: number;
  userId: string;
  res: Response;
}

const connections = new Map<number, Connection>();
const connectionsByUser = new Map<string, Set<number>>();

let nextConnectionId = 1;
let unsubscribe: (() => void) | null = null;

function write(res: Response, chunk: string): void {
  try {
    res.write(chunk);
  } catch {
    // A client that vanished mid-write is cleaned up by its own close handler.
  }
}

function send(connection: Connection, event: RealtimeEvent): void {
  write(
    connection.res,
    `event: ${event.name}\ndata: ${JSON.stringify(event.payload)}\n\n`,
  );
}

function deliver(message: RealtimeMessage): void {
  for (const userId of message.userIds) {
    const ids = connectionsByUser.get(userId);

    if (!ids) {
      continue;
    }

    for (const id of ids) {
      const connection = connections.get(id);

      if (connection) {
        send(connection, message.event);
      }
    }
  }
}

/**
 * Started lazily on the first connection so test runs and one-off scripts
 * never open a Redis subscriber they do not use.
 */
function ensureSubscribed(): void {
  if (!unsubscribe) {
    unsubscribe = subscribeRealtime(deliver);
  }
}

export function registerRealtimeClient(
  userId: string,
  res: Response,
): () => void {
  ensureSubscribed();

  const id = nextConnectionId++;
  const connection: Connection = { id, userId, res };

  connections.set(id, connection);
  let userConnections = connectionsByUser.get(userId);

  if (!userConnections) {
    userConnections = new Set();
    connectionsByUser.set(userId, userConnections);
  }
  userConnections.add(id);

  // Sets iterate in insertion order, so the first entry is the oldest stream.
  while (userConnections.size > MAX_CONNECTIONS_PER_USER) {
    const oldestId = userConnections.values().next().value as number;
    const oldest = connections.get(oldestId);
    userConnections.delete(oldestId);
    connections.delete(oldestId);

    try {
      oldest?.res.end();
    } catch {
      // Already gone.
    }
  }

  const heartbeat = setInterval(() => {
    write(res, `: keepalive\n\n`);
  }, HEARTBEAT_MS);
  // Never hold the process open just to keep a stream warm.
  heartbeat.unref?.();

  return () => {
    clearInterval(heartbeat);
    connections.delete(id);
    const remaining = connectionsByUser.get(userId);

    if (remaining) {
      remaining.delete(id);

      if (remaining.size === 0) {
        connectionsByUser.delete(userId);
      }
    }
  };
}

/** Test and shutdown helper — drops every stream this process is holding. */
export function closeRealtimeClients(): void {
  for (const connection of connections.values()) {
    try {
      connection.res.end();
    } catch {
      // Already gone.
    }
  }
  connections.clear();
  connectionsByUser.clear();
  unsubscribe?.();
  unsubscribe = null;
}

export function realtimeConnectionCount(userId?: string): number {
  return userId
    ? (connectionsByUser.get(userId)?.size ?? 0)
    : connections.size;
}
