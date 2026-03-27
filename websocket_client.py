import asyncio
import json

import websockets

from filesystem import list_directory
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

                await asyncio.gather(heartbeat(), listen())

        except (ConnectionRefusedError, OSError) as e:
            print(f"[connection failed: {e}] retrying in 5s...")
        except asyncio.CancelledError:
            raise
        except Exception as e:
            print(f"[error: {e}] reconnecting in 5s...")

        await asyncio.sleep(5)
