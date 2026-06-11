#!/usr/bin/env python3
"""Write a Mail.app-compatible .mailsignature using Teams signature structure."""

import base64
import re
import sys
import uuid
from io import BytesIO
from pathlib import Path
from typing import Optional

import quopri

DATA_URI_RE = re.compile(r"data:image/[^;]+;base64,[A-Za-z0-9+/=]+")

SCRIPT_DIR = Path(__file__).resolve().parent
ICON_DIR = SCRIPT_DIR.parent / "public" / "signature" / "icons"
HOSTED_ICON_BASE = "https://darashkevich.com/signature/icons"

MAIL_BODY_STYLE = (
    "caret-color: rgb(0, 0, 0); color: rgb(0, 0, 0); letter-spacing: normal; "
    "orphans: auto; text-align: start; text-indent: 0px; text-transform: none; "
    "white-space: normal; widows: auto; word-spacing: 0px; "
    "-webkit-text-size-adjust: auto; -webkit-text-stroke-width: 0px; "
    "text-decoration: none; overflow-wrap: break-word; -webkit-nbsp-mode: space; "
    "line-break: after-white-space;"
)

MIME_HEADERS = (
    "Content-Transfer-Encoding: quoted-printable\n"
    "Content-Type: text/html;\n"
    "\tcharset=utf-8\n"
    "Message-Id: <{message_id}>\n"
    "Mime-Version: 1.0 (Mac OS X Mail 16.0 \\(3731.200.110.1.12\\))\n"
    "\n"
)

SPAN = (
    "text-transform: initial; font-weight: bold; color: {color}; "
    "letter-spacing: 0px; line-height: 1.2; font-size: {size}px;"
)

ICON_DISPLAY_PX = 28

ICON_LINKS = [
    ("email.png", "mailto:yahor@darashkevich.com", "Email"),
    ("phone.png", "tel:+16175289656", "Phone"),
    ("linkedin.png", "https://linkedin.com/in/yahordarashkevich", "LinkedIn"),
    ("website.png", "https://darashkevich.com", "Website"),
]


def icon_data_uri(filename: str) -> str:
    """Embed PNG as base64 data URI (works in Apple Mail without hosting)."""
    data = (ICON_DIR / filename).read_bytes()
    encoded = base64.b64encode(data).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def icon_hosted_url(filename: str) -> str:
    return f"{HOSTED_ICON_BASE}/{filename}"


def build_icon_row(use_hosted: bool = True) -> str:
    cells = []
    for i, (filename, href, alt) in enumerate(ICON_LINKS):
        src = icon_hosted_url(filename) if use_hosted else icon_data_uri(filename)
        pad = "0 10px 0 0" if i < len(ICON_LINKS) - 1 else "0"
        px = ICON_DISPLAY_PX
        cells.append(
            f'<td style="padding: {pad}; line-height: 0; font-size: 0;">'
            f'<a href="{href}" style="text-decoration: unset; display: block;">'
            f'<img src="{src}" width="{px}" height="{px}" border="0" alt="{alt}" '
            f'style="display: block; border: 0; width: {px}px; height: {px}px;">'
            "</a></td>"
        )
    return (
        '<div style="margin: 1px 0 0 0; line-height: 0; padding: 0;">'
        '<table cellpadding="0" cellspacing="0" style="border-collapse: collapse;">'
        f"<tbody><tr>{''.join(cells)}</tr></tbody></table></div>"
    )


def build_inner_html(minimal: bool = False, use_hosted_icons: bool = True) -> str:
    """Light-background-safe HTML: dark text, cyan accent, icon link row."""
    if minimal:
        return (
            '<table cellpadding="0" cellspacing="0" '
            'style="border-collapse: collapse; font-family: Arial; '
            'line-height: 1.15; color: rgb(0, 0, 0);"><tbody><tr>'
            '<td style="padding: 0.01px;">'
            f'<span style="{SPAN.format(color="rgb(17, 24, 39)", size=17)}">'
            "Yahor Darashkevich&nbsp;</span><br>"
            f'<span style="{SPAN.format(color="rgb(75, 85, 99)", size=14)}">'
            "Customer Support &amp; CX Executive&nbsp;</span>"
            "</td></tr></tbody></table>"
        )

    icon_row = build_icon_row(use_hosted=use_hosted_icons)

    return (
        '<table cellpadding="0" cellspacing="0" '
        'style="border-collapse: collapse; font-family: Arial; '
        'line-height: 1.15; color: rgb(0, 0, 0);"><tbody><tr>'
        '<td valign="top" style="padding: 0.01px 0.01px 0.01px 14px; '
        'vertical-align: top; border-left: 3px solid rgb(14, 165, 233);">'
        '<table cellpadding="0" cellspacing="0" style="border-collapse: collapse;">'
        "<tbody><tr><td style=\"line-height: 1.2; padding: 0.01px;\">"
        f'<span style="{SPAN.format(color="rgb(17, 24, 39)", size=17)}">'
        "Yahor Darashkevich&nbsp;</span><br>"
        f'<span style="{SPAN.format(color="rgb(75, 85, 99)", size=14)}">'
        "Customer Support &amp; CX Executive&nbsp;</span>"
        "</td></tr><tr><td>"
        '<table cellpadding="0" cellspacing="0" style="border-collapse: collapse;">'
        "<tbody>"
        '<tr><td style="padding-top: 6px; padding-bottom: 0.01px;">'
        '<div style="margin: 0.1px; line-height: 1.35;">'
        '<span style="font-size: 12px; color: rgb(107, 114, 128);">'
        "SaaS · eCommerce · Subscriptions · AI-Enabled Support&nbsp;"
        "</span></div></td></tr>"
        '<tr><td style="padding-top: 6px; white-space: nowrap;">'
        f"{icon_row}"
        "</td></tr></tbody></table>"
        "</td></tr></tbody></table>"
        "</td></tr></tbody></table>"
    )


def wrap_teams_shell(inner_html: str) -> str:
    """Exact outer shell from the working Teams Signature .mailsignature."""
    outer = (
        '<table style="direction: ltr; border-collapse: collapse;"><tbody>'
        '<tr><td style="font-size: 0px; height: 12px; line-height: 0;"></td></tr>'
        f"<tr><td>{inner_html}"
        '<table cellpadding="0" cellspacing="0" border="0" '
        'style="max-width: 600px; width: 456px;"><tbody>'
        '<tr><td style="line-height: 0;"></td></tr></tbody></table>'
        "</td></tr>"
        '<tr><td style="font-family: &quot;ws-id None&quot;; '
        'font-size: 0.01px; line-height: 0;">&nbsp;</td></tr>'
        "</tbody></table>"
    )
    return (
        f'<meta charset="UTF-8"><body dir="auto" style="{MAIL_BODY_STYLE}">'
        f'<div dir="auto" style="{MAIL_BODY_STYLE}">'
        '<div class="ApplePlainTextBody">'
        f'<div dir="ltr">{outer}</div>'
        "</div></div></body>"
    )


def _qp_encode_chunk(text: str) -> str:
    buf = BytesIO()
    quopri.encode(BytesIO(text.encode("utf-8")), buf, quotetabs=False, header=False)
    return buf.getvalue().decode("ascii")


def _qp_encode_data_uri(uri: str) -> str:
    """Escape data URIs for QP without soft line breaks (preserves base64 integrity)."""
    return uri.replace("=", "=3D")


def encode_quoted_printable(html: str) -> str:
    """QP-encode HTML; data URIs stay on one line with = escaped as =3D."""
    result: list[str] = []
    last = 0
    for match in DATA_URI_RE.finditer(html):
        if match.start() > last:
            result.append(_qp_encode_chunk(html[last : match.start()]))
        result.append(_qp_encode_data_uri(match.group(0)))
        last = match.end()
    if last < len(html):
        result.append(_qp_encode_chunk(html[last:]))
    return "".join(result)


def write_mailsignature(
    out_path: Path,
    message_id: Optional[str] = None,
    minimal: bool = False,
    use_hosted_icons: bool = True,
) -> None:
    mail_html = wrap_teams_shell(build_inner_html(minimal=minimal, use_hosted_icons=use_hosted_icons))
    encoded = encode_quoted_printable(mail_html)
    msg_id = message_id or str(uuid.uuid4()).upper()
    out_path.write_text(MIME_HEADERS.format(message_id=msg_id) + encoded, encoding="utf-8")


def main() -> None:
    args = sys.argv[1:]
    minimal = "--minimal" in args
    use_hosted = "--base64-icons" not in args
    args = [a for a in args if a not in ("--minimal", "--base64-icons", "--hosted-icons")]

    if len(args) < 1:
        print(
            f"Usage: {sys.argv[0]} <output.mailsignature> [message-id] [--minimal] [--base64-icons]",
            file=sys.stderr,
        )
        raise SystemExit(1)

    out_path = Path(args[0])
    msg_id = args[1] if len(args) > 1 else None
    write_mailsignature(out_path, msg_id, minimal=minimal, use_hosted_icons=use_hosted)
    mode = "minimal" if minimal else "icons (hosted)" if use_hosted else "icons (base64)"
    print(f"Wrote {out_path} ({mode} Teams-format)")


if __name__ == "__main__":
    main()
