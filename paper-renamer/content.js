// content.js — runs on every page
// Finds PDF links, extracts the page title, and pre-caches it in the background
// so the download handler can rename instantly without an extra fetch.

(function () {
  'use strict';

  function getPageTitle() {
    // Try citation_title first (most accurate for paper pages)
    const citMeta = document.querySelector('meta[name="citation_title"]');
    if (citMeta?.content?.trim()) return citMeta.content.trim();

    // og:title
    const ogMeta = document.querySelector('meta[property="og:title"]');
    if (ogMeta?.content?.trim()) {
      const t = ogMeta.content.trim();
      if (!t.match(/^(ACL Anthology|arXiv|Papers? With Code|OpenReview)/i)) return t;
    }

    // dc.title
    const dcMeta = document.querySelector('meta[name="dc.title"], meta[name="DC.title"]');
    if (dcMeta?.content?.trim()) return dcMeta.content.trim();

    // <title> tag — strip site suffix
    const rawTitle = document.title?.trim();
    if (rawTitle) {
      let t = rawTitle.replace(
        /\s*[|–—-]\s*(ACL Anthology|arXiv|Semantic Scholar|OpenReview|PMLR|NeurIPS|ICLR|ICML|AAAI|ACM|IEEE|Springer|Elsevier).*$/i, ''
      ).replace(/\s*\[.*?\]\s*$/, '').trim();
      if (t.length > 10) return t;
    }

    return null;
  }

  /** Return true if this href looks like an academic PDF link. */
  function isPdfLink(href) {
    if (!href) return false;
    const path = href.split('?')[0].split('#')[0];
    return path.toLowerCase().endsWith('.pdf');
  }

  /** Resolve a (possibly relative) href to absolute URL. */
  function toAbsolute(href) {
    try { return new URL(href, location.href).href; } catch { return null; }
  }

  function registerPdfLinks() {
    const title = getPageTitle();
    if (!title) return;

    const links = document.querySelectorAll('a[href]');
    links.forEach(link => {
      if (!isPdfLink(link.getAttribute('href'))) return;
      const absUrl = toAbsolute(link.getAttribute('href'));
      if (!absUrl) return;

      link.addEventListener('click', () => {
        chrome.runtime.sendMessage({
          type: 'PAGE_TITLE_FOR_PDF',
          pdfUrl: absUrl,
          title: title
        });
      }, { once: false });
    });
  }

  // Run on initial load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', registerPdfLinks);
  } else {
    registerPdfLinks();
  }

  // Re-run if the page content changes dynamically (SPAs)
  const observer = new MutationObserver(() => registerPdfLinks());
  observer.observe(document.body, { childList: true, subtree: true });

  // Also handle the case where the user is directly on a PDF page
  // (some sites serve PDF inline; the download button triggers the rename)
  if (isPdfLink(location.pathname)) {
    const title = getPageTitle();
    if (title) {
      chrome.runtime.sendMessage({
        type: 'PAGE_TITLE_FOR_PDF',
        pdfUrl: location.href,
        title: title
      });
    }
  }
})();
