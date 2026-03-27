import { WebSocket } from "ws";
import { s3Service, uploadService } from "@/services";
import { Logger } from "@/utils";
import type { ExtWebSocket, WebsocketContext } from "../types";
import { basenameFromPath } from "../helpers";

export const handleBrowseDirectory = async (
  ctx: WebsocketContext,
  ws: ExtWebSocket,
  data: { device_id: string; path: string },
) => {
  const { device_id: browseDeviceId, path: browsePath } = data;
  const browseClientWs = ctx.clientSockets.get(browseDeviceId);

  if (browseClientWs && browseClientWs.readyState === WebSocket.OPEN) {
    const requestId = ctx.nextRequestId("dir_");

    const timer = setTimeout(() => {
      ctx.pendingRequests.delete(requestId);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "directory_listing",
            data: {
              path: browsePath,
              entries: [],
              error: "Request timed out",
            },
          }),
        );
      }
      Logger.warn(`Directory request ${requestId} timed out`);
    }, 60000);

    ctx.pendingRequests.set(requestId, {
      frontendWs: ws,
      deviceId: browseDeviceId,
      timer,
    });

    browseClientWs.send(
      JSON.stringify({
        type: "request_directory",
        request_id: requestId,
        path: browsePath,
      }),
    );
    Logger.info(
      `Forwarded directory request to ${browseDeviceId}: ${browsePath} (${requestId})`,
    );
  } else {
    ws.send(
      JSON.stringify({
        type: "directory_listing",
        data: { path: browsePath, entries: [], error: "Client is offline" },
      }),
    );
  }
};

export const handleDirectoryResponse = async (
  ctx: WebsocketContext,
  _ws: ExtWebSocket,
  data: { request_id: string; path: string; entries?: any[]; error?: string },
) => {
  const { request_id: dirReqId, path: dirPath, entries, error: dirError } = data;
  const dirPending = ctx.pendingRequests.get(dirReqId);
  if (!dirPending) return;

  clearTimeout(dirPending.timer);
  ctx.pendingRequests.delete(dirReqId);

  let enrichedEntries = entries || [];
  try {
    const filePaths = enrichedEntries
      .filter((e: { is_dir: boolean }) => !e.is_dir)
      .map((e: { path: string }) => e.path);
    const uploads = await uploadService.getUploadsByDeviceAndPaths(
      dirPending.deviceId,
      filePaths,
    );
    const uploadMap = new Map(uploads.map((u) => [u.url, u.s3Url]));
    enrichedEntries = enrichedEntries.map((e: { is_dir: boolean; path: string }) => {
      if (e.is_dir || !uploadMap.has(e.path)) {
        return { ...e, uploaded: false, s3_url: null };
      }
      const s3Key = uploadMap.get(e.path) as string;
      return {
        ...e,
        uploaded: true,
        s3_url: s3Service.buildS3DownloadPath(
          s3Key,
          basenameFromPath(e.path),
        ),
      };
    });
  } catch (err) {
    Logger.error("Failed to enrich entries with upload status:", err);
  }

  if (dirPending.frontendWs.readyState === WebSocket.OPEN) {
    dirPending.frontendWs.send(
      JSON.stringify({
        type: "directory_listing",
        data: { path: dirPath, entries: enrichedEntries, error: dirError },
      }),
    );
  }
  Logger.info(`Directory listing sent for ${dirPath} (${dirReqId})`);
};

