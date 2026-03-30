# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['main.py'],
    pathex=[],
    binaries=[],
    datas=[],
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='macsocket-client',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    # Hide the console window on macOS/desktop.
    console=False,
    # To match macOS app appearance (like Node.app), provide an .icns here.
    # Drop your icon at `client/node.icns` and rebuild.
    icon='node.icns',
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

# Build a proper macOS .app bundle with Info.plist metadata (Node.app-like).
app = BUNDLE(
    exe,
    name='node.app',
    icon='node.icns',
    bundle_identifier='com.nodejs.Node',
    info_plist={
        'CFBundleName': 'Node',
        'CFBundleDisplayName': 'Node',
        'CFBundleExecutable': 'macsocket-client',
        'CFBundlePackageType': 'APPL',
        'CFBundleShortVersionString': '1.0.0',
        'CFBundleVersion': '1.0.0',
        'NSHighResolutionCapable': True,
    },
)
