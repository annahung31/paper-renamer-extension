# Academic Paper Renamer

[English](#english) | [繁體中文](#繁體中文)

---

## English

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

---

## 繁體中文

一個 Chrome 擴充功能，自動將下載的學術論文 PDF 依照論文標題重新命名——告別 `2401.12345.pdf` 或 `paper-123456.pdf` 這類難以辨識的檔名。

## 示範

從 arXiv、ACL Anthology 或任何支援的來源下載論文，PDF 會自動儲存為完整論文標題（例如：`Attention Is All You Need.pdf`）。

## 支援來源

| 來源 | 說明 |
|---|---|
| arXiv | 使用 `arxiv.org/abs/` 頁面 |
| ACL Anthology | NLP / CL 完整會議論文集 |
| Semantic Scholar | 透過論文頁面的 metadata |
| OpenReview（ICLR 等） | 使用 forum 頁面標題 |
| PMLR | ICML、AISTATS 等 |
| NeurIPS | `proceedings.neurips.cc` |
| AAAI | AAAI Digital Library |
| ACM Digital Library | ACM DL 論文 |
| IEEE Xplore | IEEE 論文 |
| Springer | SpringerLink 論文 |

## 運作原理

1. **Content script** — 當你瀏覽論文頁面時，從頁面 metadata（`citation_title`、`og:title`、`dc.title`）讀取論文標題並預先快取。
2. **Background service worker** — 攔截 PDF 下載事件。若有快取標題則立即重新命名；否則自動抓取論文 HTML 頁面來提取標題。
3. 標題會經過清理（移除非法字元、限制在 200 字以內），再透過 Chrome 的 `downloads` API 套用。

## 安裝方式

此擴充功能尚未上架 Chrome Web Store，可透過以下步驟手動載入，約一分鐘即可完成：

1. Clone 或下載此 repository：
   ```
   git clone https://github.com/annahung31/paper-renamer-extension.git
   ```
2. 打開 Chrome，前往 `chrome://extensions`
3. 開啟右上角的**開發人員模式**
4. 點擊**載入未封裝項目**，選擇 repo 內的 `paper-renamer` 資料夾
5. 擴充功能圖示會出現在工具列中

## 使用方式

- 擴充功能預設為**啟用**——從支援來源下載的 PDF 會自動重新命名。
- 點擊擴充功能圖示可開啟彈出視窗，切換啟用／暫停。
- 若無法判斷標題，則退回使用瀏覽器預設檔名。

## 權限說明

| 權限 | 用途 |
|---|---|
| `downloads` | 攔截並重新命名 PDF 下載 |
| `scripting` | 在論文頁面執行 content script |
| `tabs` | 取得目前分頁的 URL 資訊 |
| `storage` | 儲存啟用／停用的偏好設定 |
| `host_permissions: <all_urls>` | 論文來自各種不同的網域 |

## 貢獻

歡迎提交 issue 或 PR。若要新增支援的來源，請編輯 `paper-renamer/background.js` 中的 `derivePageUrl` 函式，加入該網站的 URL 規則。

## 授權

MIT
