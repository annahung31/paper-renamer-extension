# Academic Paper Renamer

A Chrome extension that automatically renames downloaded academic paper PDFs using the actual paper title — instead of cryptic filenames like `2401.12345.pdf` or `paper-123456.pdf`.

## Demo

Download a paper from arXiv, ACL Anthology, or any supported source. Instead of the default filename, the PDF is saved as the full paper title (e.g., `Attention Is All You Need.pdf`).

## Supported Sources

| Source | Notes |
|---|---|
| arXiv | Uses `arxiv.org/abs/` page |
| ACL Anthology | Full NLP/CL conference proceedings |
| Semantic Scholar | Via metadata on paper pages |
| OpenReview (ICLR, etc.) | Uses forum page title |
| PMLR | ICML, AISTATS, etc. |
| NeurIPS | `proceedings.neurips.cc` |
| AAAI | AAAI Digital Library |
| ACM Digital Library | ACM DL papers |
| IEEE Xplore | IEEE papers |
| Springer | SpringerLink papers |

## How It Works

1. **Content script** — When you visit a paper page, it reads the paper title from metadata (`citation_title`, `og:title`, `dc.title`) and pre-caches it.
2. **Background service worker** — Intercepts the PDF download event. If a cached title is available it renames immediately; otherwise it fetches the paper's HTML page to extract the title.
3. Title is sanitized (illegal filename characters removed, capped at 200 characters) and applied via Chrome's `downloads` API.

## Installation

Since this extension isn't on the Chrome Web Store, you can load it manually in under a minute:

1. Clone or download this repository:
   ```
   git clone https://github.com/YOUR_USERNAME/paper-renamer-extension.git
   ```
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked** and select the `paper-renamer` folder inside the cloned repo
5. The extension icon will appear in your toolbar

## Usage

- The extension is **enabled by default** — downloaded PDFs from supported sources are renamed automatically.
- Click the extension icon to open the popup and toggle renaming on/off.
- If a title can't be determined, the browser's default filename is used as a fallback.

## Permissions

| Permission | Reason |
|---|---|
| `downloads` | To intercept and rename PDF downloads |
| `scripting` | To run the content script on paper pages |
| `tabs` | To get the current tab's URL context |
| `storage` | To save the enabled/disabled preference |
| `host_permissions: <all_urls>` | Papers come from many different domains |

## Contributing

Bug reports and PRs are welcome. To add a new source, edit the `derivePageUrl` function in `paper-renamer/background.js` with the URL pattern for that site.

## License

MIT
