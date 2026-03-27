import os
import ssl


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

    # On some Windows / Python builds, default CA resolution can be incomplete.
    # certifi provides a reliable CA bundle and avoids CERTIFICATE_VERIFY_FAILED.
    try:
        import certifi  # type: ignore

        ctx.load_verify_locations(cafile=certifi.where())
    except Exception:
        pass

    return ctx
