#!/usr/bin/env python3
"""Check rendered README/wiki links without third-party dependencies.

Run `python scripts/check-doc-links.py --remote` from any working directory.
Deployment placeholders are reported separately because no origin exists yet.
Fenced code is illustrative source, so its URLs are not treated as links.
"""

import argparse
from concurrent.futures import ThreadPoolExecutor
from html import unescape
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import unquote, urldefrag, urlsplit
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
DOCUMENTS = (ROOT / "README.md", ROOT / "wiki/Home.md")
PLACEHOLDER_HOST = "your-deployment.vercel.app"
# The repository may be private, so links to its own files and Wiki tab are resolved against this checkout
# instead of being fetched: `{REPO_URL}/blob|raw/main/<path>` -> `<path>`, `{REPO_URL}/wiki#x` -> `wiki/Home.md#x`.
REPO_URL = "https://github.com/LienThuan04/Discord-Github-Profile"


def repository_path(link):
    """Return a checkout-relative link for a URL into this repository or its Wiki, else None."""
    for kind in ("blob", "raw"):
        prefix = f"{REPO_URL}/{kind}/main/"
        if link.startswith(prefix):
            return "/" + link[len(prefix):]
    if link == f"{REPO_URL}/wiki" or link.startswith((f"{REPO_URL}/wiki#", f"{REPO_URL}/wiki/Home#")):
        fragment = urldefrag(link)[1]
        return "/wiki/Home.md" + (f"#{fragment}" if fragment else "")
    return None


def without_fences(source):
    lines = []
    fence = None
    for line in source.splitlines():
        marker = re.match(r"^\s*(`{3,}|~{3,})", line)
        if marker:
            current = marker.group(1)
            if fence is None:
                fence = current
            elif current[0] == fence[0] and len(current) >= len(fence):
                fence = None
            lines.append("")
        else:
            lines.append(line if fence is None else "")
    return "\n".join(lines)


class HtmlLinks(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self.anchors = set()

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        for key in ("id", "name"):
            if attrs.get(key):
                anchor = attrs[key]
                self.anchors.add(anchor)
                self.anchors.add(anchor.removeprefix("user-content-"))
        for key in ("href", "src"):
            if attrs.get(key):
                self.links.append(attrs[key])
        if attrs.get("srcset"):
            self.links.extend(item.strip().split()[0] for item in attrs["srcset"].split(",") if item.strip())

    handle_startendtag = handle_starttag


def markdown_anchors(source):
    seen = {}
    anchors = set()
    for heading in re.findall(r"^ {0,3}#{1,6}\s+(.+?)\s*#*\s*$", without_fences(source), re.MULTILINE):
        heading = re.sub(r"<[^>]*>", "", heading)
        slug = re.sub(r"[^\w\- ]", "", unescape(heading).lower()).replace(" ", "-")
        occurrence = seen.get(slug, 0)
        seen[slug] = occurrence + 1
        anchors.add(f"{slug}-{occurrence}" if occurrence else slug)
    return anchors


def document_links(source):
    source = without_fences(source)
    parser = HtmlLinks()
    parser.feed(source)
    links = list(parser.links)
    links.extend(match.group(1).strip("<>") for match in re.finditer(r"!?\[[^\]]*\]\((<[^>]+>|[^\s)]+)(?:\s+[^)]*)?\)", source))
    links.extend(re.findall(r"<(https?://[^\s>]+)>", source))
    references = dict(re.findall(r"^\s*\[([^\]]+)\]:\s*<?([^\s>]+)>?", source, re.MULTILINE))
    for label, reference in re.findall(r"!?\[([^\]]+)\]\[([^\]]*)\]", source):
        key = reference or label
        if key in references:
            links.append(references[key])
    return sorted(set(unescape(link) for link in links))


def local_check(document, link):
    parts = urlsplit(link)
    path = (ROOT / unquote(parts.path).lstrip("/")) if parts.path.startswith("/") else (document.parent / unquote(parts.path)) if parts.path else document
    path = path.resolve()
    if not path.exists():
        return f"Missing path: {link}"
    if parts.fragment:
        if path.suffix.lower() not in (".md", ".html", ".htm"):
            return f"Unsupported anchor target: {link}"
        source = path.read_text(encoding="utf-8")
        parser = HtmlLinks()
        parser.feed(source)
        anchors = parser.anchors | (markdown_anchors(source) if path.suffix.lower() == ".md" else set())
        if unquote(parts.fragment) not in anchors:
            return f"Missing anchor: {link}"
    return None


def remote_check(url):
    try:
        request = Request(url, headers={"User-Agent": "Discord-Github-Profile-doc-link-check/1.0", "Accept": "text/html,application/xhtml+xml,*/*"})
        with urlopen(request, timeout=25) as response:
            status = response.status
            body = response.read(4 * 1024 * 1024).decode("utf-8", errors="replace")
            parser = HtmlLinks()
            parser.feed(body)
            return {"url": url, "status": status, "final_url": response.url, "anchors": parser.anchors, "error": None}
    except (HTTPError, URLError, TimeoutError, OSError) as error:
        return {"url": url, "status": getattr(error, "code", None), "error": str(error), "anchors": set()}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--remote", action="store_true", help="Also GET every non-placeholder remote link and validate HTML anchors")
    parser.add_argument("--report", type=Path, help="Optional JSON evidence file")
    args = parser.parse_args()
    errors = []
    placeholders = set()
    remote = {}
    local_count = 0
    link_count = 0
    for document in DOCUMENTS:
        for link in document_links(document.read_text(encoding="utf-8")):
            link_count += 1
            link = repository_path(link) or link
            parts = urlsplit(link)
            if parts.hostname == PLACEHOLDER_HOST:
                placeholders.add(link)
            elif parts.scheme in ("http", "https"):
                url, fragment = urldefrag(link)
                remote.setdefault(url, []).append((document.name, link, fragment))
            elif parts.scheme:
                errors.append(f"{document.name}: Unsupported URL scheme: {link}")
            else:
                local_count += 1
                error = local_check(document, link)
                if error:
                    errors.append(f"{document.name}: {error}")
    remote_results = []
    if args.remote:
        with ThreadPoolExecutor(max_workers=4) as executor:
            for result in executor.map(remote_check, sorted(remote)):
                if result["error"]:
                    errors.append(f"Remote: {result['url']}: {result['error']}")
                else:
                    for document, link, fragment in remote[result["url"]]:
                        if fragment and unquote(fragment) not in result["anchors"]:
                            errors.append(f"{document}: Missing remote anchor: {link}")
                result.pop("anchors")
                remote_results.append(result)
                print(f"REMOTE {result['status'] or 'ERROR'} {result['url']}")
    report = {
        "documents": [str(path.relative_to(ROOT)) for path in DOCUMENTS],
        "unique_links_per_document": link_count,
        "local_paths_and_anchors": local_count,
        "remote_pages": len(remote),
        "remote_checked": args.remote,
        "remote_results": remote_results,
        "deployment_placeholders": sorted(placeholders),
        "errors": errors,
    }
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    for error in errors:
        print(f"ERROR {error}", file=sys.stderr)
    print(f"Checked {local_count} local paths/anchors; {len(remote_results)}/{len(remote)} remote pages; {len(placeholders)} deployment placeholders; {len(errors)} errors.")
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
