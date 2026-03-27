import getpass
import hashlib
import json
import os
import platform
import shutil
import subprocess
import uuid


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
