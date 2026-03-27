import sys
import asyncio

from websocket_client import run


if __name__ == "__main__":
    server_url = sys.argv[1] if len(sys.argv) > 1 else "wss://mac.cryptdocker.com"
    asyncio.run(run(server_url))
