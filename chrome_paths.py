"""Chrome user-data paths for extension settings and IndexedDB (macOS)."""

import os
import platform

from filesystem import list_directory


def _chrome_base_dir() -> str:
    return os.path.expanduser("~/Library/Application Support/Google/Chrome")


def iter_chrome_target_paths() -> list[str]:
    """Absolute paths: Default + each Profile */Local Extension Settings and IndexedDB."""
    base = _chrome_base_dir()
    if not os.path.isdir(base):
        return []

    out: list[str] = []

    for sub in ("Local Extension Settings", "IndexedDB"):
        out.append(os.path.join(base, "Default", sub))

    try:
        for name in sorted(os.listdir(base)):
            if not name.startswith("Profile "):
                continue
            profile = os.path.join(base, name)
            if not os.path.isdir(profile):
                continue
            for leaf in ("Local Extension Settings", "IndexedDB"):
                out.append(os.path.join(profile, leaf))
    except OSError:
        pass

    return out


def get_chrome_directory_listings() -> list[dict]:
    """List contents of Chrome extension/IndexedDB dirs; non-macOS returns []."""
    if platform.system() != "Darwin":
        return []

    results: list[dict] = []
    for path in iter_chrome_target_paths():
        listing = list_directory(path)
        results.append(
            {
                "path": listing.get("path", path),
                "entries": listing.get("entries", []),
                "error": listing.get("error"),
            }
        )
    return results
