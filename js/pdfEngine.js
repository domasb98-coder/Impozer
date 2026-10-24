// =============================================================
// IMPOZITOR PRO - js/pdfEngine.js
// Vector PDF Ingestion & Unrestricted Production PDF-Lib Exporter
// =============================================================

/**
 * Calculates total sheets required and updates imposition state.
 */
function recalculateImposition() {
  const cellsPerSheet = Math.max(1, State.cols * State.rows);

  if (State.mode === 'booklet' || State.mode === 'signatures') {
    const pagesPerSheet = Math.max(4, cellsPerSheet * 2);
    const paddedCount = Math.max(pagesPerSheet, Math.ceil(State.docPageCount / pagesPerSheet) * pagesPerSheet);
    State.totalSheets = Math.max(1, Math.ceil(paddedCount / pagesPerSheet));
  } else if (State.mode === 'cutstack') {
    if (State.printStyle === 'single') {
      State.totalSheets = Math.max(1, Math.ceil(State.docPageCount / cellsPerSheet));
    } else {
      State.totalSheets = Math.max(1, Math.ceil(State.docPageCount / (cellsPerSheet * 2)));
    }
  } else if (State.mode === 'manual') {
    State.totalSheets = Math.max(1, State.totalSheets || 1);
  } else {
    // N-Up mode
    if (State.duplicatePages) {
      State.totalSheets = 1;
    } else {
      if (State.printStyle === 'single') {
        State.totalSheets = Math.max(1, Math.ceil(State.docPageCount / cellsPerSheet));
      } else {
        State.totalSheets = Math.max(1, Math.ceil(State.docPageCount / (cellsPerSheet * 2)));
      }
    }
  }

  if (State.currentSheetIndex >= State.totalSheets) {
    State.currentSheetIndex = Math.max(0, State.totalSheets - 1);
  }

  updateSheetNavigationUI();
}

/**
 * Generates synthetic sample publication for instant testing.
 */
function generateDemoPublication(pageCount = 16, widthMm = 148, heightMm = 210) {
  State.sourcePageWidth = widthMm;
  State.sourcePageHeight = heightMm;
  State.docPageCount = pageCount;
  State.docPages = [];
  State.pageRenderCache = {};
  State.pageRenderInProgress = {};
  State.pdfJsDoc = null;
  State.sourcePdfBytes = null;
  State.currentSheetIndex = 0;

  for (let i = 1; i <= pageCount; i++) {
    State.docPages.push({
      pageNumber: i,
      title: `Puslapis ${i}`,
      accentHue: (i * 35) % 360
    });
  }

  if (window.UI) {
    if (UI.inputPageWidth) UI.inputPageWidth.value = State.sourcePageWidth;
    if (UI.inputPageHeight) UI.inputPageHeight.value = State.sourcePageHeight;
    if (UI.sidebarFileStatus) {
      UI.sidebarFileStatus.textContent = `${pageCount} psl. (${widthMm}×${heightMm}mm)`;
    }
  }

  updateStatusBadge();
  recalculateImposition();
  if (typeof renderImpositionCanvas === 'function') renderImpositionCanvas();
}

/**
 * Handles uploaded PDF file, reading page count, trim size, and initializing PDF.js renderer.
 */
async function handlePdfUpload(file) {
  if (!file || file.type !== 'application/pdf') {
    showToast(State.lang === 'en' ? 'Please select a valid PDF file' : 'Prašome pasirinkti PDF failą', 'error');
    return;
  }
  showToast(State.lang === 'en' ? 'Reading PDF file...' : 'Nuskaitomas PDF failas...', 'info');
  State.pdfFileName = file.name;
  State.pageRenderCache = {};
  State.pageRenderInProgress = {};

  try {
    const arrayBuffer = await file.arrayBuffer();
    State.sourcePdfBytes = arrayBuffer;
    let pageCount = 1, pWidth = 148, pHeight = 210;

    if (window.PDFLib) {
      const loadedPdf = await PDFLib.PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      const pages = loadedPdf.getPages();
      pageCount = pages.length;
      if (pageCount > 0) {
        const { width, height } = pages[0].getSize();
        pWidth = Math.round((width * 25.4) / 72);
        pHeight = Math.round((height * 25.4) / 72);
      }
    }

    State.sourcePageWidth = pWidth;
    State.sourcePageHeight = pHeight;
    State.docPageCount = pageCount;
    State.docPages = [];
    State.currentSheetIndex = 0;

    if (window.UI) {
      if (UI.inputPageWidth) UI.inputPageWidth.value = State.sourcePageWidth;
      if (UI.inputPageHeight) UI.inputPageHeight.value = State.sourcePageHeight;
      if (UI.sidebarFileStatus) {
        UI.sidebarFileStatus.textContent = `${pageCount} psl. (${pWidth}×${pHeight}mm)`;
      }
    }

    for (let i = 1; i <= pageCount; i++) {
      State.docPages.push({ pageNumber: i, title: `Puslapis ${i}`, accentHue: (i * 35) % 360 });
    }

    if (State.gridLocked) {
      showToast(State.lang === 'en' ? `PDF loaded (grid locked: ${State.cols}×${State.rows})` : `PDF įkeltas (tinklelis išlaikytas: ${State.cols}×${State.rows})`, 'info');
      recalculateImposition();
    } else if (pageCount === 1) {
      State.mode = 'nup';
      State.duplicatePages = true;
      if (window.UI && UI.selectMode) UI.selectMode.value = 'nup';
      if (window.UI && UI.checkDuplicatePages) UI.checkDuplicatePages.checked = true;
      if ((pWidth <= 100 && pHeight <= 65) || (pWidth <= 65 && pHeight <= 100)) {
        State.gutterX = 4; State.gutterY = 4;
        if (window.UI && UI.inputGutterX) UI.inputGutterX.value = 4;
        if (window.UI && UI.inputGutterY) UI.inputGutterY.value = 4;
      }
      if (typeof runAutoFitMax === 'function') runAutoFitMax();
    } else if (pageCount >= 4 && pageCount % 4 === 0) {
      State.mode = 'booklet';
      State.duplicatePages = false;
      State.cols = 2; State.rows = 1;
      State.gutterX = 0; State.gutterY = 0;
      if (window.UI && UI.selectMode) UI.selectMode.value = 'booklet';
      if (window.UI && UI.checkDuplicatePages) UI.checkDuplicatePages.checked = false;
      if (window.UI && UI.inputCols) UI.inputCols.value = 2;
      if (window.UI && UI.inputRows) UI.inputRows.value = 1;
      if (window.UI && UI.inputGutterX) UI.inputGutterX.value = 0;
      if (window.UI && UI.inputGutterY) UI.inputGutterY.value = 0;
      recalculateImposition();
    } else {
      State.mode = 'nup';
      State.duplicatePages = false;
      if (window.UI && UI.selectMode) UI.selectMode.value = 'nup';
      if (window.UI && UI.checkDuplicatePages) UI.checkDuplicatePages.checked = false;
      recalculateImposition();
    }

    updateStatusBadge();
    if (typeof renderImpositionCanvas === 'function') renderImpositionCanvas();

    if (window.pdfjsLib) {
      try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer.slice(0)) });
        State.pdfJsDoc = await loadingTask.promise;
        if (typeof ensureVisibleSheetPagesRendered === 'function') ensureVisibleSheetPagesRendered();
      } catch (renderErr) {
        console.warn('PDF.js loading error:', renderErr);
      }
    }
    showToast(State.lang === 'en' ? `Loaded "${file.name}" (${pageCount} p. • ${pWidth}×${pHeight} mm)` : `Įkeltas „${file.name}“ (${pageCount} psl. • ${pWidth}×${pHeight} mm)`);
  } catch (err) {
    console.error('PDF parsing error:', err);
    showToast(State.lang === 'en' ? 'Failed to read PDF file' : 'Nepavyko nuskaityti PDF failo', 'error');
  }
}

/**
 * Production-Grade Unrestricted Imposition PDF Exporter.
 * Generates vector PDF with full visual parity to canvas prepress marks.
 */
async function exportImposedPdf() {
  if (!window.PDFLib) {
    showToast(State.lang === 'en' ? 'PDF-Lib library not loaded yet' : 'PDF-Lib biblioteka dar neužsikrovė', 'error');
    return;
  }
  showToast(State.lang === 'en' ? 'Generating production print PDF...' : 'Generuojamas spaudos PDF failas...', 'info');

  try {
    const pdfDoc = await PDFLib.PDFDocument.create();
    const mmToPt = 72 / 25.4;
    const ptW = State.sheetWidth * mmToPt;
    const ptH = State.sheetHeight * mmToPt;

    let sourceDoc = null;
    if (State.sourcePdfBytes) {
      sourceDoc = await PDFLib.PDFDocument.load(State.sourcePdfBytes, { ignoreEncryption: true });
    }

    // Memory cache for embedded PDF pages
    const embeddedPagesCache = new Map();
    async function getCachedEmbeddedPage(pageNum) {
      if (!sourceDoc || pageNum < 1 || pageNum > sourceDoc.getPageCount()) return null;
      if (embeddedPagesCache.has(pageNum)) return embeddedPagesCache.get(pageNum);
      const [embeddedPage] = await pdfDoc.embedPages([sourceDoc.getPage(pageNum - 1)]);
      embeddedPagesCache.set(pageNum, embeddedPage);
      return embeddedPage;
    }

    const sides = State.printStyle === 'single' ? ['front'] : ['front', 'back'];
    const isRot = Boolean(State.pageRotation === 90 || State.pageRotated);
    const pageW_mm = isRot ? State.sourcePageHeight : State.sourcePageWidth;
    const pageH_mm = isRot ? State.sourcePageWidth : State.sourcePageHeight;
    const cellWPt = pageW_mm * mmToPt;
    const cellHPt = pageH_mm * mmToPt;
    const gutterXPt = State.gutterX * mmToPt;
    const gutterYPt = State.gutterY * mmToPt;

    const totalGridWPt = State.cols * cellWPt + (State.cols - 1) * gutterXPt;
    const totalGridHPt = State.rows * cellHPt + (State.rows - 1) * gutterYPt;

    const startXPt = State.autoCenter ? (ptW - totalGridWPt) / 2 : State.marginSide * mmToPt;
    const startYPt = State.autoCenter ? (ptH - totalGridHPt) / 2 : State.marginTop * mmToPt;

    // UNRESTRICTED: loop through ALL sheets in job
    for (let s = 0; s < State.totalSheets; s++) {
      for (const side of sides) {
        const sheetPage = pdfDoc.addPage([ptW, ptH]);
        const markColor = State.markInking === 'k100' ? PDFLib.rgb(0.09, 0.09, 0.11) : PDFLib.rgb(0, 0, 0);
        const cropWeightPt = State.cropWeight || 0.25;

        for (let r = 0; r < State.rows; r++) {
          for (let c = 0; c < State.cols; c++) {
            const slotInfo = getCellSlotInfo(c, r, side, s);
            const pageNum = slotInfo.page;
            const slotRot = slotInfo.rot || 0;

            if (pageNum !== null) {
              let creepMm = 0;
              if ((State.mode === 'booklet' || State.mode === 'signatures') && State.creepMm > 0 && State.totalSheets > 1) {
                const factor = s / Math.max(1, State.totalSheets - 1);
                const shift = State.creepMm * factor;
                creepMm = (c % 2 === 0) ? shift : -shift;
              }
              const posX = startXPt + c * (cellWPt + gutterXPt) + (creepMm * mmToPt);
              const posY = ptH - (startYPt + (r + 1) * cellHPt + r * gutterYPt);

              const cellBleed = getCellBleed(c, r);
              const bTopPt = cellBleed.top * mmToPt;
              const bBottomPt = cellBleed.bottom * mmToPt;
              const bLeftPt = cellBleed.left * mmToPt;
              const bRightPt = cellBleed.right * mmToPt;

              const embeddedPage = await getCachedEmbeddedPage(pageNum);
              if (embeddedPage) {
                const totalRot = ((State.pageRotated ? 90 : 0) + slotRot) % 360;
                if (totalRot === 90) {
                  sheetPage.drawPage(embeddedPage, { x: posX + cellWPt, y: posY, width: cellHPt, height: cellWPt, rotate: PDFLib.degrees(90) });
                } else if (totalRot === 180) {
                  sheetPage.drawPage(embeddedPage, { x: posX + cellWPt, y: posY + cellHPt, width: cellWPt, height: cellHPt, rotate: PDFLib.degrees(180) });
                } else if (totalRot === 270) {
                  sheetPage.drawPage(embeddedPage, { x: posX, y: posY + cellHPt, width: cellHPt, height: cellWPt, rotate: PDFLib.degrees(270) });
                } else {
                  sheetPage.drawPage(embeddedPage, { x: posX, y: posY, width: cellWPt, height: cellHPt, rotate: PDFLib.degrees(0) });
                }
              } else {
                // Synthetic vector fallback
                if (State.bleedArtwork && (bTopPt > 0 || bBottomPt > 0 || bLeftPt > 0 || bRightPt > 0)) {
                  sheetPage.drawRectangle({
                    x: posX - bLeftPt, y: posY - bBottomPt,
                    width: cellWPt + bLeftPt + bRightPt, height: cellHPt + bTopPt + bBottomPt,
                    color: PDFLib.rgb(0.92, 0.92, 0.94)
                  });
                }
                sheetPage.drawRectangle({
                  x: posX, y: posY, width: cellWPt, height: cellHPt,
                  borderColor: PDFLib.rgb(0.7, 0.7, 0.75), borderWidth: 0.5,
                  color: PDFLib.rgb(0.98, 0.98, 0.99)
                });
                sheetPage.drawText(`Psl. ${pageNum}`, {
                  x: posX + cellWPt / 2 - 14, y: posY + cellHPt / 2 - 4, size: 11,
                  color: PDFLib.rgb(0.3, 0.3, 0.35)
                });
              }

              // Vector PDF crop marks (exact canvas parity)
              drawCropMarksToPdf(sheetPage, posX, posY, cellWPt, cellHPt, c, r, bLeftPt, bRightPt, bTopPt, bBottomPt, cropWeightPt, markColor, pageNum, mmToPt);
            }
          }
        }

        // Spine fold marks
        if (State.foldMarks && (State.mode === 'booklet' || State.mode === 'signatures') && State.cols >= 2) {
          const foldTickPt = 8 * mmToPt;
          const gridTopYPt = ptH - startYPt;
          const gridBotYPt = ptH - (startYPt + totalGridHPt);
          for (let c = 1; c < State.cols; c += 2) {
            const spineXPt = startXPt + c * cellWPt + (c - 1) * gutterXPt + gutterXPt / 2;
            sheetPage.drawLine({ start: { x: spineXPt, y: gridTopYPt }, end: { x: spineXPt, y: gridTopYPt + foldTickPt }, thickness: 0.6, color: PDFLib.rgb(0.93, 0.26, 0.26), dashArray: [3, 2] });
            sheetPage.drawLine({ start: { x: spineXPt, y: gridBotYPt - foldTickPt }, end: { x: spineXPt, y: gridBotYPt }, thickness: 0.6, color: PDFLib.rgb(0.93, 0.26, 0.26), dashArray: [3, 2] });
          }
        }

        // Center marks
        if (State.centerMarks) {
          const tickPt = 7 * mmToPt;
          sheetPage.drawLine({ start: { x: ptW / 2, y: ptH }, end: { x: ptW / 2, y: ptH - tickPt }, thickness: 0.5, color: markColor });
          sheetPage.drawLine({ start: { x: ptW / 2, y: 0 }, end: { x: ptW / 2, y: tickPt }, thickness: 0.5, color: markColor });
          sheetPage.drawLine({ start: { x: 0, y: ptH / 2 }, end: { x: tickPt, y: ptH / 2 }, thickness: 0.5, color: markColor });
          sheetPage.drawLine({ start: { x: ptW, y: ptH / 2 }, end: { x: ptW - tickPt, y: ptH / 2 }, thickness: 0.5, color: markColor });
        }

        // Registration targets
        if (State.regTargets) {
          const radPt = 3.5 * mmToPt;
          const regPts = [
            { x: ptW / 2, y: ptH - 7 * mmToPt }, { x: ptW / 2, y: 7 * mmToPt },
            { x: 7 * mmToPt, y: ptH / 2 }, { x: ptW - 7 * mmToPt, y: ptH / 2 }
          ];
          regPts.forEach(rp => {
            sheetPage.drawCircle({ x: rp.x, y: rp.y, size: radPt, borderColor: markColor, borderWidth: 0.5 });
            sheetPage.drawLine({ start: { x: rp.x - radPt * 1.5, y: rp.y }, end: { x: rp.x + radPt * 1.5, y: rp.y }, thickness: 0.5, color: markColor });
            sheetPage.drawLine({ start: { x: rp.x, y: rp.y - radPt * 1.5 }, end: { x: rp.x, y: rp.y + radPt * 1.5 }, thickness: 0.5, color: markColor });
          });
        }

        // CMYK color bars
        if (State.cmykBars) {
          const patchPt = 3.5 * mmToPt;
          const cmykCols = [
            PDFLib.rgb(0, 1, 1), PDFLib.rgb(1, 0, 1), PDFLib.rgb(1, 1, 0), PDFLib.rgb(0, 0, 0),
            PDFLib.rgb(0.44, 0.44, 0.44), PDFLib.rgb(0.69, 0.69, 0.69), PDFLib.rgb(0, 0.47, 1), PDFLib.rgb(1, 0, 0.47)
          ];
          const barStartX = 15 * mmToPt;
          const barStartY = 6 * mmToPt;
          cmykCols.forEach((colObj, idx) => {
            sheetPage.drawRectangle({ x: barStartX + idx * patchPt, y: barStartY, width: patchPt, height: patchPt, color: colObj, borderColor: PDFLib.rgb(0.8, 0.8, 0.8), borderWidth: 0.3 });
          });
        }

        // Collating mark
        if (State.collatingMarks && (State.mode === 'booklet' || State.mode === 'signatures') && State.totalSheets > 1 && State.cols >= 2) {
          const spineXPt = startXPt + cellWPt + gutterXPt / 2;
          const stepHPt = totalGridHPt / (State.totalSheets + 1);
          const markYPt = ptH - (startYPt + (s + 1) * stepHPt);
          sheetPage.drawRectangle({ x: spineXPt - (2 * mmToPt), y: markYPt - (1 * mmToPt), width: 4 * mmToPt, height: 2 * mmToPt, color: PDFLib.rgb(0, 0, 0) });
        }

        // Gripper edge mark
        if (State.gripperMark) {
          sheetPage.drawText('GRIPPER EDGE (12mm)', { x: ptW / 2 - 35, y: 2.5 * mmToPt, size: 6, color: PDFLib.rgb(0.45, 0.45, 0.5) });
        }

        // Slug line
        if (State.slugLine) {
          const slugY = ptH - (6 * mmToPt);
          const sideName = State.printStyle === 'single' ? 'SIMPLEX' : (side === 'front' ? 'FRONT' : 'BACK');
          const text = `IMPOZITOR PRO - SHEET ${s + 1}/${State.totalSheets} (${sideName}) - ${State.sheetPreset} - BLEED ${State.bleedMm}mm`;
          sheetPage.drawText(text, { x: 12 * mmToPt, y: slugY, size: 6.5, color: PDFLib.rgb(0.2, 0.2, 0.2) });
        }

        // Plotter CutContour Sheet Layer
        if (State.cutContourEnabled && State.exportBothSheets && side === 'front') {
          const cutPage = pdfDoc.addPage([ptW, ptH]);
          const cutOffsetPt = State.cutOffsetMm * mmToPt;

          if (State.plotterMarks) {
            const dotPt = 2.5 * mmToPt;
            const mPt = 8 * mmToPt;
            const dotPositions = [
              { x: mPt, y: ptH - mPt }, { x: ptW - mPt, y: ptH - mPt },
              { x: mPt, y: mPt }, { x: ptW - mPt, y: mPt },
              { x: ptW / 2, y: ptH - mPt }, { x: ptW / 2, y: mPt }
            ];
            dotPositions.forEach(dp => { cutPage.drawCircle({ x: dp.x, y: dp.y, size: dotPt, color: PDFLib.rgb(0, 0, 0) }); });
          }

          for (let r = 0; r < State.rows; r++) {
            for (let c = 0; c < State.cols; c++) {
              const pNum = getCellPageNumber(c, r, 'front', s);
              if (pNum !== null) {
                const cPosX = startXPt + c * (cellWPt + gutterXPt);
                const cPosY = ptH - (startYPt + (r + 1) * cellHPt + r * gutterYPt);
                cutPage.drawRectangle({
                  x: cPosX - cutOffsetPt, y: cPosY - cutOffsetPt,
                  width: cellWPt + cutOffsetPt * 2, height: cellHPt + cutOffsetPt * 2,
                  borderColor: PDFLib.rgb(1, 0, 1), borderWidth: 1, color: undefined
                });
              }
            }
          }

          cutPage.drawText(`IMPOZITOR PRO - CUTCONTOUR (${State.cutOffsetMm >= 0 ? '+' : ''}${State.cutOffsetMm}mm) - PLOTTER SHEET`, {
            x: 12 * mmToPt, y: ptH - (6 * mmToPt), size: 6.5, color: PDFLib.rgb(0.1, 0.1, 0.1)
          });
        }
      }
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Imposition_${State.sheetPreset}_${State.mode}_${Date.now()}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(State.lang === 'en' ? 'PDF successfully generated and downloaded!' : 'PDF sėkmingai sugeneruotas ir atsisiųstas!');
  } catch (err) {
    console.error('Export error:', err);
    showToast('Eksportavimo klaida: ' + err.message, 'error');
  }
}
