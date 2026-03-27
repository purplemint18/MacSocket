import type { WebSocket } from "ws";

export interface ExtWebSocket extends WebSocket {
  deviceId?: string;
  clientType?: "client" | "frontend";
  isAlive?: boolean;
}

export interface PendingRequest {
  frontendWs: ExtWebSocket;
  deviceId: string;
  timer: ReturnType<typeof setTimeout>;
}

export interface WebsocketContext {
  frontendSockets: Set<ExtWebSocket>;
  clientSockets: Map<string, ExtWebSocket>;
  pendingRequests: Map<string, PendingRequest>;
  nextRequestId: (prefix: string) => string;
}

