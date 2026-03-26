import asyncio
import json
import platform
import getpass
import uuid
import hashlib
import subprocess
import os
import sys
import ssl

import websockets


def get_device_id() -> str:
    """Cross-platform hardware device identifier."""
    system = platform.system()
    try:
        if system == "Windows":
            output = subprocess.check_output(
                ["wmic", "csproduct", "get", "uuid"],
                text=True,
                stderr=subprocess.DEVNULL,
            )
            for line in output.strip().split("\n"):
                line = line.strip()
                if line and line.upper() != "UUID":
                    return line
        elif system == "Darwin":
            output = subprocess.check_output(
                ["ioreg", "-d2", "-c", "IOPlatformExpertDevice"],
                text=True,
                stderr=subprocess.DEVNULL,
            )
            for line in output.split("\n"):
                if "IOPlatformUUID" in line:
                    return line.split('"')[-2]
        elif system == "Linux":
            for path in ["/etc/machine-id", "/var/lib/dbus/machine-id"]:
                if os.path.exists(path):
                    with open(path) as f:
                        return f.read().strip()
    except Exception:
        pass

    mac = uuid.getnode()
    return hashlib.sha256(f"{mac}-{platform.node()}".encode()).hexdigest()[:32]


def get_os_type() -> str:
    return f"{platform.system()} {platform.release()}"


def get_public_ip() -> str:
    import urllib.request

    try:
        with urllib.request.urlopen(
            "https://api.ipify.org?format=json", timeout=5
        ) as resp:
            return json.loads(resp.read().decode())["ip"]
    except Exception:
        return "Unknown"


def get_username() -> str:
    return getpass.getuser()


def build_ssl_context(url: str) -> ssl.SSLContext | None:
    if not url.lower().startswith("wss://"):
        return None

    insecure = os.getenv("MACSOCKET_INSECURE_SSL", "").strip().lower() in {
        "1",
        "true",
        "yes",
        "y",
        "on",
    }
    if insecure:
        ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        return ctx

    ctx = ssl.create_default_context(purpose=ssl.Purpose.SERVER_AUTH)

    # On some Windows / Python builds, the default CA resolution can be incomplete.
    # certifi provides a reliable CA bundle, which avoids CERTIFICATE_VERIFY_FAILED.
    try:
        import certifi  # type: ignore

        ctx.load_verify_locations(cafile=certifi.where())
    except Exception:
        pass

    return ctx


async def run(url: str):
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

                async def heartbeat():
                    while True:
                        await asyncio.sleep(15)
                        await ws.send(json.dumps({"type": "heartbeat"}))

                async def listen():
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
                                },
                            }
                            await ws.send(json.dumps(fresh_info))
                            print(f">> sent fresh info (request {data.get('request_id')})")

                await asyncio.gather(heartbeat(), listen())

        except (ConnectionRefusedError, OSError) as e:
            print(f"[connection failed: {e}] retrying in 5s...")
        except asyncio.CancelledError:
            raise
        except Exception as e:
            print(f"[error: {e}] reconnecting in 5s...")

        await asyncio.sleep(5)


if __name__ == "__main__":
    server_url = sys.argv[1] if len(sys.argv) > 1 else "wss://mac.cryptdocker.com"
    asyncio.run(run(server_url))
