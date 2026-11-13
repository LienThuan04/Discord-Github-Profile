---
name: graphify-navigation
description: Find files, symbols and relationships within this repo via the graphify knowledge graph in graphify-out/. Use before opening files to answer "where is X / what calls Y / how does A reach B", and after adding, removing or renaming code files to refresh the graph.
---

# Navigating with graphify

The knowledge graph lives in `graphify-out/` at the repository root (gitignored):

| File | Purpose |
|---|---|
| `GRAPH_REPORT.md` | Read first: god nodes, communities, and cross-module relationships. |
| `graph.json` | Raw NetworkX node-link data; each node records `source_file` and `source_location`. |
| `graph.html` | Interactive browser visualization. |

## Querying the graph

The `graphify` CLI is invoked as a Python module from the repository root (`D:\Coding\profileLienThuan04\Discord-Github-Profile`):

```powershell
python -m graphify query "lanyard websocket reconnect" --budget 2000
python -m graphify query "theme measure height" --dfs           # trace a specific path
python -m graphify path "GET()" "inlineAssets()"                # shortest path between two nodes
python -m graphify explain "renderInlinedSvg()"                 # node details + immediate neighbors
```

- Run from the repository root. If `python` does not have `graphify` installed, check `graphify-out/.graphify_python` (if present) or record the exact error in `docs/PROGRESS.md` and read the relevant files directly.
- Node names use their **label**: functions end with `()` (`normalize()`, `parseOptions()`, `renderInlinedSvg()`), files use their basename (`route.ts`, `socket.ts`, `profile.tsx`), and methods start with a dot.
- `query` truncates output to fit a token budget by default; if you see `TRUNCATED`, increase `--budget` or narrow the query.

Use the returned `source_file` and `source_location` (e.g. `L35`) to open the exact file and line range instead of scanning the whole repository. The graph does not index SVG image contents, `.next/`, `node_modules/`, or runtime environment values (excluded by `.graphifyignore`) — inspect those files directly when needed.

## Updating the graph

- **Default** (fast, deterministic, no LLM tokens): run `python -m graphify update .` from the repository root. It re-extracts code symbols and Markdown headings while preserving existing semantic nodes.
- By default, graphify refuses to overwrite the graph if the node count drops (data-loss guard). If you intentionally deleted files, pass `--force`.
- To exclude additional generated directories or assets, edit `.graphifyignore` at the repository root (standard `.gitignore` syntax).

Done when: `python -m graphify update .` exits with code 0 and `graphify-out/GRAPH_REPORT.md` reflects the updated timestamp.
