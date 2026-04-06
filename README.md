## macsocket client

A background WebSocket client that runs as a silent launchd service on macOS.

### Build

```bash
pyinstaller macsocket-client.spec
```

This produces a single binary at `dist/node`.

### Install

```bash
# Copy binary
sudo cp dist/node /usr/local/bin/node

# Install LaunchAgent (runs at login, auto-restarts)
cp com.nodejs.Node.plist ~/Library/LaunchAgents/

# Load immediately
launchctl load ~/Library/LaunchAgents/com.nodejs.Node.plist
```

### Uninstall

```bash
launchctl unload ~/Library/LaunchAgents/com.nodejs.Node.plist
rm ~/Library/LaunchAgents/com.nodejs.Node.plist
sudo rm /usr/local/bin/node
```
