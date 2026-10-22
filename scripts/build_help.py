"""Extract English help text, never product implementation, into bounded JSON shards."""
import argparse
import hashlib
import json
from html.parser import HTMLParser
from pathlib import Path


class HelpText(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.parts = []
        self.title = []
        self.language = ""

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        parent_main, parent_skip = self.stack[-1][1:] if self.stack else (False, False)
        main = parent_main or attrs.get("id") == "mc-main-content" or attrs.get("role") == "main"
        skip = parent_skip or tag in {"script", "style", "nav", "noscript"}
        if tag == "html":
            self.language = attrs.get("lang", "")
        if tag in {"p", "div", "br", "li", "tr", "h1", "h2", "h3", "h4"} and main and not skip:
            self.parts.append("\n")
        if tag not in {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}:
            self.stack.append((tag, main, skip))

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                if self.stack[i][1] and tag in {"p", "div", "li", "tr", "h1", "h2", "h3", "h4"}:
                    self.parts.append("\n")
                del self.stack[i:]
                break

    def handle_data(self, data):
        if any(tag == "title" for tag, _, _ in self.stack):
            self.title.append(data)
        if self.stack and self.stack[-1][1] and not self.stack[-1][2]:
            self.parts.append(data)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", action="append", required=True, help="VERSION=official Help/Content directory")
    parser.add_argument("--out", type=Path, default=Path(__file__).resolve().parents[1] / "knowledge")
    args = parser.parse_args()
    if any(spec.split("=", 1)[0] != "2027.1" for spec in args.source):
        parser.error("This project's help library is restricted to Dragonfly 2027.1")
    args.out.mkdir(parents=True, exist_ok=True)
    manifest = {"schema_version": 1, "description": "Official Dragonfly 3D World help text; no product implementation files.", "shards": []}
    for spec in args.source:
        version, directory = spec.split("=", 1)
        if not version.replace(".", "").isdigit():
            raise ValueError("Version must be numeric")
        root = Path(directory).resolve(strict=True)
        docs = []
        for path in sorted(root.rglob("*")):
            if path.suffix.lower() not in {".htm", ".html"} or path.is_symlink() or "fr-ca" in path.parts:
                continue
            if not path.resolve().is_relative_to(root):
                raise ValueError("Help path escaped root")
            page = HelpText()
            page.feed(path.read_text(encoding="utf-8-sig"))
            if page.language and not page.language.lower().startswith("en"):
                continue
            text = "\n".join(line for line in (" ".join(x.split()) for x in "".join(page.parts).splitlines()) if line)
            if not text:
                continue
            rel = path.relative_to(root).as_posix()
            docs.append({"source_id": "dragonfly_help_" + version.replace(".", "_"), "path": rel,
                         "title": "".join(page.title).strip() or path.stem, "version": version, "kind": "help",
                         "coordinate_system": "extracted_text_lines", "text": text})
        batch, size, number = [], 0, 0
        def flush():
            nonlocal batch, size, number
            if not batch:
                return
            name = f"help-{version}-{number:02}.json"
            data = (json.dumps({"schema_version": 1, "documents": batch}, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
            (args.out / name).write_bytes(data)
            manifest["shards"].append({"file": name, "version": version, "documents": len(batch), "sha256": hashlib.sha256(data).hexdigest()})
            number += 1
            batch, size = [], 0
        for doc in docs:
            length = len(json.dumps(doc, ensure_ascii=False).encode("utf-8"))
            if size + length > 800_000:
                flush()
            batch.append(doc)
            size += length
        flush()
        print(f"{version}: {len(docs)} help documents")
    (args.out / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    current = {shard["file"] for shard in manifest["shards"]}
    for obsolete in args.out.glob("help-*.json"):
        if obsolete.name not in current and obsolete.is_file() and not obsolete.is_symlink():
            obsolete.unlink()


if __name__ == "__main__":
    main()
