import { clientService } from "@/services";
import type { ExtWebSocket } from "../types";

export const handleHeartbeat = async (ws: ExtWebSocket) => {
  ws.isAlive = true;
  if (ws.deviceId) {
    await clientService.updateLastSeen(ws.deviceId);
  }
};

