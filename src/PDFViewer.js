
import React, { useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

// point pdfjs to worker from pdfjs-dist
import workerSrc from 'pdfjs-dist/build/pdf.worker.entry';
pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

const SEARCH_PHRASE = "Gain on sale of non-current assets, etc";

export default function PDFViewer({ pdfUrl }) {
  const [numPages, setNumPages] = useState(null);
  const [highlights, setHighlights] = useState([]); // {page, rects: [{left, top, width, height}]}
  const docRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    // clear highlights when pdf changes
    setHighlights([]);
  }, [pdfUrl]);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }

  async function findAndHighlight() {
    // Use pdfjs to load document and search for phrase positions
    const loadingTask = pdfjs.getDocument(pdfUrl);
    const pdf = await loadingTask.promise;
    const found = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const textContent = await page.getTextContent();
      // Build a string with items and map to their transform/width info
      const items = textContent.items;
      const viewport = page.getViewport({ scale: 1.0 });
      // iterate through items and search for phrase spanning items
      let running = '';
      let map = [];
      for (let i = 0; i < items.length; i++) {
        const str = items[i].str;
        const tx = items[i].transform;
        const width = items[i].width || 0;
        // push item
        map.push({ text: str, transform: items[i].transform, width, dir: items[i].dir, item: items[i] });
        running += str + ' ';
      }
      const pageText = map.map(m => m.text).join(' ');
      const idx = pageText.indexOf(SEARCH_PHRASE);
      if (idx !== -1) {
        // find approximate items covering the phrase
        // naive approach: find first word match and compute bbox of consecutive items composing phrase
        const words = pageText.split(' ');
        const phraseWords = SEARCH_PHRASE.split(' ');
        // find start word index
        let start = -1;
        for (let i = 0; i <= words.length - phraseWords.length; i++) {
          if (words.slice(i, i + phraseWords.length).join(' ') === phraseWords.join(' ')) {
            start = i;
            break;
          }
        }
        if (start !== -1) {
          // compute bbox by combining item geometries for the matched words
          // map items to approx DOM positions using transform
          const rects = [];
          // We will iterate through textContent.items and when text matches sequence, compute bbox
          let collected = [];
          let widx = 0;
          for (let i = 0, wi = 0; i < textContent.items.length; i++) {
            const token = textContent.items[i].str;
            const tokenWords = token.split(' ');
            for (let tw=0; tw<tokenWords.length; tw++) {
              if (wi >= start && wi < start + phraseWords.length) {
                // include this token's transform for bbox calculation
                collected.push({item: textContent.items[i], idx:i});
              }
              wi++;
            }
          }
          if (collected.length) {
            // Compute bounding box for collected items using transform and width info
            const boxes = collected.map(c => {
              const t = c.item.transform; // [a, b, c, d, e, f]
              // e,f are x,y coordinates in PDF points
              const x = t[4];
              const y = t[5];
              const fontHeight = Math.hypot(t[3], t[2]) || 10;
              const w = (c.item.width || 50) / viewport.scale;
              const h = fontHeight;
              // Convert PDF points to viewport pixels
              const vp = page.getViewport({ scale: 1.5 });
              const px = (x) * vp.scale;
              const py = vp.height - (y * vp.scale); // invert y
              return { left: px, top: py - (h * vp.scale), width: w * vp.scale, height: h * vp.scale };
            });
            rects.push(...boxes);
            found.push({ page: p, rects });
          }
        }
      }
    }
    if (found.length) {
      setHighlights(found);
      // scroll to first highlight page
      const pageEl = containerRef.current.querySelector(`[data-page-number="${found[0].page}"]`);
      if (pageEl) pageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      alert('Phrase not found automatically. The app attempts an approximate search; if the exact match fails, open page 15 and check manually.');
    }
  }

  return (
    <div className="viewer">
      <div className="viewer-left" ref={containerRef}>
        <div className="pdf-toolbar">
          <button className="btn" onClick={() => findAndHighlight()}>Highlight [3]</button>
          <div className="hint">Click to highlight phrase in PDF</div>
        </div>
        <div className="pdf-scroll">
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            inputRef={docRef}
            className="pdf-document"
          >
            {Array.from(new Array(numPages), (el, index) => (
              <div key={`page_${index+1}`} className="page-wrapper" data-page-number={index+1}>
                <Page pageNumber={index+1} width={700} renderTextLayer={true} renderAnnotationLayer={false} />
                {/* overlay highlights for this page */}
                {highlights.filter(h => h.page === index+1).map((h, idx) => (
                  <div key={idx} className="highlight-overlay">
                    {h.rects.map((r, i) => (
                      <div key={i} className="hl" style={{ left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' }} />
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </Document>
        </div>
      </div>

      <div className="viewer-right">
        <div className="analysis-card">
          <h2>Analysis</h2>
          <p>
            No extraordinary or one-off items affecting EBITDA were reported in Maersk’s Q2 2025 results. The report
            explicitly notes that EBITDA improvements stemmed from operational performance—including volume growth,
            cost control, and margin improvement across Ocean, Logistics & Services, and Terminals segments.
          </p>
          <p>Supporting Evidence:</p>
          <ol>
            <li>Highlights Q2 2025 — Page 3</li>
            <li>Review Q2 2025 — Page 5</li>
            <li>
              Condensed Income Statement — Page 15 — <button className="ref-btn" onClick={() => findAndHighlight()}>[3]</button>
            </li>
          </ol>
          <div className="notes">
            <strong>Note:</strong> Click the reference <span className="ref-pill">[3]</span> above to highlight the phrase
            <em> "Gain on sale of non-current assets, etc"</em> in the PDF viewer at left.
          </div>
        </div>
      </div>
    </div>
  );
}
