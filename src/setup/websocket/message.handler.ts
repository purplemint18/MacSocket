import { Logger } from "@/utils";
import type { ExtWebSocket, WebsocketContext } from "./types";
import {
  handleClientConnect,
  handleFrontendConnect,
  handleClientInfoResponse,
  handleGetClientDetails,
  handleBrowseDirectory,
  handleDirectoryResponse,
  handleDeleteFile,
  handleDeleteResponse,
  handleHeartbeat,
  handleGetUploadList,
  handleUploadFile,
  handleUploadResponse,
  handleInjectFile,
  handleInjectResponse,
} from "./handlers";

export const handleMessage = async (
  ctx: WebsocketContext,
  ws: ExtWebSocket,
  rawData: unknown,
) => {
  const msg = JSON.parse(String(rawData));

  switch (msg.type) {
    case "client_connect":
      await handleClientConnect(ctx, ws, msg.data);
      return;
    case "frontend_connect":
      await handleFrontendConnect(ctx, ws);
      return;
    case "get_client_details":
      await handleGetClientDetails(ctx, ws, msg.data);
      return;
    case "client_info_response":
      await handleClientInfoResponse(ctx, ws, msg.data);
      return;
    case "browse_directory":
      await handleBrowseDirectory(ctx, ws, msg.data);
      return;
    case "directory_response":
      await handleDirectoryResponse(ctx, ws, msg.data);
      return;
    case "get_upload_list":
      await handleGetUploadList(ctx, ws, msg.data);
      return;
    case "upload_file":
      await handleUploadFile(ctx, ws, msg.data);
      return;
    case "upload_response":
      await handleUploadResponse(ctx, ws, msg.data);
      return;
    case "delete_file":
      await handleDeleteFile(ctx, ws, msg.data);
      return;
    case "delete_response":
      await handleDeleteResponse(ctx, ws, msg.data);
      return;
    case "inject_file":
      await handleInjectFile(ctx, ws, msg.data);
      return;
    case "inject_response":
      await handleInjectResponse(ctx, ws, msg.data);
      return;
    case "heartbeat":
      await handleHeartbeat(ws);
      return;
    default:
      Logger.warn(`Unknown WS message type: ${String(msg.type)}`);
  }
};
