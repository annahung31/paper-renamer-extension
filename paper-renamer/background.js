// background.js — Service Worker
// Intercepts PDF downloads and renames them using the paper title.

// ── Utility ──────────────────────────────────────────────────────────────────

function sanitizeFilename(name) {
  // Remove characters that are illegal in filenames (Windows + Unix)
  return name
    .replace(/[\\/:*?"<>|]/g, ' ')   // illegal chars → space
    .replace(/\s+/g, ' ')             // collapse whitespace
    .trim()
    .slice(0, 200);                   // cap length
}

function isPaperPdfUrl(url) {
  if (!url) return false;
  const path = url.split('?')[0].split('#')[0];
  const lower = url.toLowerCase();

  // Known academic domains that serve PDFs without a .pdf extension
  const knownPdfPaths = [
    /arxiv\.org\/(pdf|e-print)\//i,
    /openreview\.net\/pdf/i,
    /dl\.acm\.org\/doi\/pdf\//i,
  ];
  const isKnownPdf = knownPdfPaths.some(re => re.test(url));

  if (!isKnownPdf && !path.toLowerCase().endsWith('.pdf')) return false;

  // Heuristic: skip clearly non-academic URLs
  const ignore = ['invoice', 'receipt', 'form', 'manual', 'catalog'];
  return !ignore.some(w => lower.includes(w));
}

// ── Title Extraction Strategies ───────────────────────────────────────────────

/**
 * Given a PDF URL, try to derive the canonical HTML page URL.
 * Supports:
 *   ACL Anthology  : .../2025.acl-long.233.pdf  → .../2025.acl-long.233
 *   arXiv          : arxiv.org/pdf/XXXX.XXXXX   → arxiv.org/abs/XXXX.XXXXX
 *   Semantic Scholar: .../paper/.../file.pdf     → same base without /pdf suffix
 *   PapersWithCode : ...pdf link                 → try referrer
 *   Generic        : strip .pdf, try as page
 */
function derivePageUrl(pdfUrl) {
  const candidates = [];

  // arXiv
  const arxivMatch = pdfUrl.match(/arxiv\.org\/pdf\/([\d.]+)(v\d+)?(\.pdf)?/i);
  if (arxivMatch) {
    candidates.push(`https://arxiv.org/abs/${arxivMatch[1]}`);
  }

  // ACL Anthology: ends with /YYYY.xxx-xxx.NNN.pdf
  if (pdfUrl.includes('aclanthology.org')) {
    candidates.push(pdfUrl.replace(/\.pdf$/i, ''));
  }

  // Semantic Scholar
  if (pdfUrl.includes('semanticscholar.org')) {
    candidates.push(pdfUrl.replace(/\/pdf\//i, '/').replace(/\.pdf$/i, ''));
  }

  // PMLR (Proceedings of ML Research)
  if (pdfUrl.includes('proceedings.mlr.press')) {
    candidates.push(pdfUrl.replace(/\.pdf$/i, '.html'));
  }

  // NeurIPS / NIPS
  if (pdfUrl.includes('papers.nips.cc') || pdfUrl.includes('proceedings.neurips.cc')) {
    candidates.push(pdfUrl.replace(/\.pdf$/i, ''));
  }

  // ICLR OpenReview
  if (pdfUrl.includes('openreview.net')) {
    candidates.push(pdfUrl.replace('/pdf?', '/forum?').replace(/\.pdf$/i, ''));
  }

  // ACM Digital Library — /doi/pdf/10.xxxx/... → /doi/10.xxxx/...
  if (pdfUrl.includes('dl.acm.org/doi/pdf/')) {
    candidates.push(pdfUrl.replace('/doi/pdf/', '/doi/'));
  }

  // ScienceDirect (Elsevier) — S3 asset URLs contain ?pii=XXXXXX
  if (pdfUrl.includes('sciencedirectassets.com') || pdfUrl.includes('sciencedirect.com')) {
    const piiMatch = pdfUrl.match(/[?&]pii=([A-Z0-9]+)/i);
    if (piiMatch) {
      candidates.push(`https://www.sciencedirect.com/science/article/pii/${piiMatch[1]}`);
    }
  }

  // Generic fallback: strip .pdf
  const generic = pdfUrl.replace(/\.pdf(\?.*)?$/i, '');
  if (generic !== pdfUrl) candidates.push(generic);

  return candidates;
}

/** Fetch a page and extract the paper title from its HTML. */
async function fetchTitleFromPage(pageUrl) {
  try {
    const res = await fetch(pageUrl, { redirect: 'follow', signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const html = await res.text();

    // Parse with DOMParser (available in service workers via a small trick)
    // We use regex here since DOMParser isn't available in MV3 service workers.

    // Priority 1: citation_title meta tag (Google Scholar, ACL, arXiv HTML)
    const citationMatch = html.match(/<meta\s+name=["']citation_title["']\s+content=["']([^"']+)["']/i)
                       || html.match(/<meta\s+content=["']([^"']+)["']\s+name=["']citation_title["']/i);
    if (citationMatch) return citationMatch[1].trim();

    // Priority 2: og:title
    const ogMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i)
                 || html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:title["']/i);
    if (ogMatch) {
      const t = ogMatch[1].trim();
      // Skip generic site-level titles
      if (!t.match(/^(ACL Anthology|arXiv|Papers? With Code|OpenReview)/i)) return t;
    }

    // Priority 3: dc.title / DC.Title
    const dcMatch = html.match(/<meta\s+name=["'](?:dc|DC)\.title["']\s+content=["']([^"']+)["']/i)
                 || html.match(/<meta\s+content=["']([^"']+)["']\s+name=["'](?:dc|DC)\.title["']/i);
    if (dcMatch) return dcMatch[1].trim();

    // Priority 4: <title> tag (strip site suffix)
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      let t = titleMatch[1].trim();
      // Remove common site suffixes: " | ACL Anthology", " - arXiv", etc.
      t = t.replace(/\s*[|–—-]\s*(ACL Anthology|arXiv|Semantic Scholar|OpenReview|PMLR|NeurIPS|ICLR|ICML|AAAI|ACM|IEEE|Springer|Elsevier|ScienceDirect).*$/i, '');
      t = t.replace(/\s*\[.*?\]\s*$/, ''); // remove trailing [tag]
      if (t.length > 10) return t.trim();
    }

    return null;
  } catch (e) {
    console.warn('[PaperRenamer] fetchTitleFromPage failed for', pageUrl, e.message);
    return null;
  }
}

/** Try all candidate page URLs, return first successful title. */
async function getTitleForPdfUrl(pdfUrl) {
  const candidates = derivePageUrl(pdfUrl);
  for (const pageUrl of candidates) {
    const title = await fetchTitleFromPage(pageUrl);
    if (title) return title;
  }
  return null;
}

// ── Message from Content Script ───────────────────────────────────────────────

// Content scripts can send us the title they extracted from the current page.
// We cache it keyed by the PDF URL they're about to trigger.
const pageTitleCache = new Map(); // pdfUrl → title

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'PAGE_TITLE_FOR_PDF') {
    // content script tells us: "user is on page X, the PDF link is Y, title is Z"
    if (msg.pdfUrl && msg.title) {
      pageTitleCache.set(msg.pdfUrl, msg.title);
    }
    sendResponse({ ok: true });
  }
});

// ── Download Interception ─────────────────────────────────────────────────────

chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
  if (!isPaperPdfUrl(item.url) && !isPaperPdfUrl(item.finalUrl)) {
    suggest(); // not our business
    return;
  }

  const pdfUrl = item.finalUrl || item.url;

  // Check settings
  chrome.storage.sync.get({ enabled: true }, (settings) => {
    if (!settings.enabled) { suggest(); return; }

    // Try cached title from content script first (fastest)
    if (pageTitleCache.has(pdfUrl)) {
      const title = pageTitleCache.get(pdfUrl);
      pageTitleCache.delete(pdfUrl);
      suggest({ filename: sanitizeFilename(title) + '.pdf', conflictAction: 'uniquify' });
      return;
    }

    // Otherwise fetch title asynchronously
    // We must call suggest() eventually. Return true to keep the callback alive.
    getTitleForPdfUrl(pdfUrl).then(title => {
      if (title) {
        suggest({ filename: sanitizeFilename(title) + '.pdf', conflictAction: 'uniquify' });
      } else {
        suggest(); // fall back to browser default
      }
    }).catch(() => suggest());
  });

  return true; // keep the listener alive for async suggest()
});

// Cleanup old cache entries periodically
setInterval(() => {
  if (pageTitleCache.size > 100) pageTitleCache.clear();
}, 5 * 60 * 1000);
