import json
import os
import platform
import subprocess
from datetime import datetime

_APPLESCRIPT_LIST_DIR = r"""
set q to character id 34

on esc(txt)
    set b to character id 92
    set dq to character id 34
    set o to ""
    repeat with i from 1 to count of txt
        set c to character i of txt
        if c = b then
            set o to o & b & b
        else if c = dq then
            set o to o & b & dq
        else
            set o to o & c
        end if
    end repeat
    return o
end esc

on pad2(n)
    if n < 10 then return "0" & (n as text)
    return n as text
end pad2

on isoDate(d)
    return (year of d as text) & "-" & my pad2(month of d as integer) & "-" & my pad2(day of d) & "T" & my pad2(hours of d) & ":" & my pad2(minutes of d) & ":" & my pad2(seconds of d)
end isoDate

set dirPath to "DIRPATH_PLACEHOLDER"

try
    tell application "Finder"
        set targetFolder to (POSIX file dirPath) as alias
        set folderItems to every item of targetFolder
    end tell

    if dirPath ends with "/" then
        set sep to ""
    else
        set sep to "/"
    end if

    set entryList to {}
    repeat with i from 1 to count of folderItems
        try
            tell application "Finder"
                set anItem to item i of folderItems
                set itemName to name of anItem
                set eName to my esc(itemName)
                set ePath to my esc(dirPath & sep & itemName)
                set eIsDir to (class of anItem is folder)
                set eSize to "null"
                if not eIsDir then
                    try
                        set eSize to (size of anItem) as text
                    end try
                end if
                set eMod to "null"
                try
                    set eMod to q & my isoDate(modification date of anItem) & q
                end try
            end tell
            set end of entryList to "{" & q & "name" & q & ":" & q & eName & q & "," & q & "path" & q & ":" & q & ePath & q & "," & q & "is_dir" & q & ":" & eIsDir & "," & q & "size" & q & ":" & eSize & "," & q & "modified" & q & ":" & eMod & "}"
        end try
    end repeat

    set saveDel to AppleScript's text item delimiters
    set AppleScript's text item delimiters to ","
    set joined to entryList as text
    set AppleScript's text item delimiters to saveDel

    return "{" & q & "path" & q & ":" & q & my esc(dirPath) & q & "," & q & "entries" & q & ":[" & joined & "]}"
on error errMsg
    return "{" & q & "path" & q & ":" & q & my esc(dirPath) & q & "," & q & "entries" & q & ":[]," & q & "error" & q & ":" & q & my esc(errMsg) & q & "}"
end try
"""


def _list_directory_applescript(dir_path: str) -> dict:
    """List directory contents via Finder AppleScript (macOS)."""
    safe_path = dir_path.replace("\\", "\\\\").replace('"', '\\"')
    script = _APPLESCRIPT_LIST_DIR.replace("DIRPATH_PLACEHOLDER", safe_path)
    try:
        output = subprocess.check_output(
            ["osascript", "-e", script],
            text=True,
            stderr=subprocess.PIPE,
            timeout=30,
        )
        return json.loads(output.strip())
    except Exception as e:
        print(f"[applescript fallback] {e}")
        return _list_directory_os(dir_path)


def _list_directory_os(dir_path: str) -> dict:
    """List directory contents using the os module (non-macOS fallback)."""
    entries = []
    try:
        for name in os.listdir(dir_path):
            full_path = os.path.join(dir_path, name)
            entry = {
                "name": name,
                "path": full_path,
                "is_dir": False,
                "size": None,
                "modified": None,
            }
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


def list_directory(dir_path: str) -> dict:
    """List files and folders in a directory with metadata."""
    if platform.system() == "Darwin":
        return _list_directory_applescript(dir_path)
    return _list_directory_os(dir_path)
