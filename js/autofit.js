// =============================================================
// IMPOZITOR PRO - js/autofit.js
// Prepress Optimization & Sheet Capacity Algorithms
// =============================================================

/**
 * Standard Auto-Fit: evaluates 0° vs 90° uniform orientation
 * to maximize single-sheet capacity based on fencepost geometry.
 */
function runAutoFit(e) {
  if (e && typeof e.preventDefault === 'function') {
    e.preventDefault();
    e.stopPropagation();
  }

  if (State.gridLocked) {
    showToast(
      State.lang === 'en'
        ? 'Grid is locked! Click "Locked" to unlock first.'
        : 'Tinklelis yra užfiksuotas! Paspauskite „Užfiksuota“, jei norite atrakinti.',
      'info'
    );
    return;
  }

  // Auto-Fit switches booklet/signatures to N-Up
  if (State.mode === 'booklet' || State.mode === 'signatures') {
    State.mode = 'nup';
    if (window.UI && UI.selectMode) UI.selectMode.value = 'nup';
  }

  State.combinationLayout = null;

  // Retrieve exact physical dimensions
  const sheetW = (window.UI && UI.inputSheetWidth && parseFloat(UI.inputSheetWidth.value) > 0)
    ? parseFloat(UI.inputSheetWidth.value)
    : (State.sheetWidth || 320);
  const sheetH = (window.UI && UI.inputSheetHeight && parseFloat(UI.inputSheetHeight.value) > 0)
    ? parseFloat(UI.inputSheetHeight.value)
    : (State.sheetHeight || 450);

  const naturalW = (window.UI && UI.inputPageWidth && parseFloat(UI.inputPageWidth.value) > 0)
    ? parseFloat(UI.inputPageWidth.value)
    : (State.sourcePageWidth || 148);
  const naturalH = (window.UI && UI.inputPageHeight && parseFloat(UI.inputPageHeight.value) > 0)
    ? parseFloat(UI.inputPageHeight.value)
    : (State.sourcePageHeight || 210);

  const marginLeft = Math.max(0, State.marginSide || 0);
  const marginRight = marginLeft;
  const marginTop = Math.max(0, State.marginTop || 0);
  const marginBottom = marginTop;
  const availableW = Math.max(10, sheetW - marginLeft - marginRight);
  const availableH = Math.max(10, sheetH - marginTop - marginBottom);

  const gutX = Math.max(0, State.gutterX || 0);
  const gutY = Math.max(0, State.gutterY || 0);

  // Step-and-repeat fencepost calculation (+0.01 floating point tolerance)
  // Orientation A: 0° (Normal: naturalW along W, naturalH along H)
  const colsA = Math.max(1, Math.floor((availableW + gutX + 0.01) / (naturalW + gutX)));
  const rowsA = Math.max(1, Math.floor((availableH + gutY + 0.01) / (naturalH + gutY)));
  const yieldA = colsA * rowsA;

  // Orientation B: 90° (Rotated: naturalH along W, naturalW along H)
  const colsB = Math.max(1, Math.floor((availableW + gutX + 0.01) / (naturalH + gutX)));
  const rowsB = Math.max(1, Math.floor((availableH + gutY + 0.01) / (naturalW + gutY)));
  const yieldB = colsB * rowsB;

  // Choose whichever gives the higher cols * rows (tie defaults to 0°)
  const rotate = yieldB > yieldA;
  const bestCols = rotate ? colsB : colsA;
  const bestRows = rotate ? rowsB : rowsA;
  const bestYield = bestCols * bestRows;

  // Update layout result variables
  State.cols = bestCols;
  State.rows = bestRows;
  State.pageRotation = rotate ? 90 : 0;
  State.pageRotated = rotate;
  State.cropMarksMode = 'minimal';
  State.autoCenter = true;

  if (State.docPageCount === 1) {
    State.duplicatePages = true;
    if (window.UI && UI.checkDuplicatePages) UI.checkDuplicatePages.checked = true;
  }

  // Sync layout inputs
  if (window.UI) {
    if (UI.inputCols) UI.inputCols.value = bestCols;
    if (UI.inputRows) UI.inputRows.value = bestRows;
    if (UI.checkAutoCenter) UI.checkAutoCenter.checked = true;
  }

  const sheetArea = sheetW * sheetH;
  const totalItemArea = bestYield * (naturalW * naturalH);
  const coveragePct = sheetArea > 0 ? Math.min(100, Math.round((totalItemArea / sheetArea) * 100)) : 0;

  const isLt = State.lang !== 'en';
  const toastMsg = isLt
    ? `Auto-Fit: ${bestCols}×${bestRows} (${bestYield} vnt.) • ${coveragePct}% lanko padengimas (${rotate ? '90°' : '0°'})`
    : `Auto-Fit: ${bestCols}×${bestRows} (${bestYield} up) • ${coveragePct}% sheet coverage (${rotate ? '90°' : '0°'})`;

  showToast(toastMsg, 'success');

  if (typeof updateStatusBadge === 'function') updateStatusBadge();
  if (typeof recalculateImposition === 'function') recalculateImposition();
  if (typeof renderImpositionCanvas === 'function') renderImpositionCanvas();
}

/**
 * Advanced Combination Cut Auto-Fit Max: evaluates uniform and split-direction
 * combinations (e.g. primary grid + perpendicular remainder strip) to achieve absolute maximum yield.
 */
function runAutoFitMax(e) {
  if (e && typeof e.preventDefault === 'function') {
    e.preventDefault();
    e.stopPropagation();
  }

  if (State.gridLocked) {
    showToast(
      State.lang === 'en'
        ? 'Grid is locked! Click "Locked" to unlock first.'
        : 'Tinklelis yra užfiksuotas! Paspauskite „Užfiksuota“, jei norite atrakinti.',
      'info'
    );
    return;
  }

  if (State.mode === 'booklet' || State.mode === 'signatures') {
    State.mode = 'nup';
    if (window.UI && UI.selectMode) UI.selectMode.value = 'nup';
  }

  const sheetW = (window.UI && UI.inputSheetWidth && parseFloat(UI.inputSheetWidth.value) > 0)
    ? parseFloat(UI.inputSheetWidth.value)
    : (State.sheetWidth || 320);
  const sheetH = (window.UI && UI.inputSheetHeight && parseFloat(UI.inputSheetHeight.value) > 0)
    ? parseFloat(UI.inputSheetHeight.value)
    : (State.sheetHeight || 450);

  const naturalW = (window.UI && UI.inputPageWidth && parseFloat(UI.inputPageWidth.value) > 0)
    ? parseFloat(UI.inputPageWidth.value)
    : (State.sourcePageWidth || 148);
  const naturalH = (window.UI && UI.inputPageHeight && parseFloat(UI.inputPageHeight.value) > 0)
    ? parseFloat(UI.inputPageHeight.value)
    : (State.sourcePageHeight || 210);

  const marginLeft = Math.max(0, State.marginSide || 0);
  const marginRight = marginLeft;
  const marginTop = Math.max(0, State.marginTop || 0);
  const marginBottom = marginTop;
  const availableW = Math.max(10, sheetW - marginLeft - marginRight);
  const availableH = Math.max(10, sheetH - marginTop - marginBottom);

  const gutX = Math.max(0, State.gutterX || 0);
  const gutY = Math.max(0, State.gutterY || 0);

  let bestCandidate = null;

  function evaluateCandidate(primRotated, c1, r1, stripPos) {
    const w1 = primRotated ? naturalH : naturalW;
    const h1 = primRotated ? naturalW : naturalH;

    const block1W = c1 * w1 + (c1 - 1) * gutX;
    const block1H = r1 * h1 + (r1 - 1) * gutY;

    if (block1W > availableW + 0.01 || block1H > availableH + 0.01) return;

    const count1 = c1 * r1;

    const secRotated = !primRotated;
    const w2 = secRotated ? naturalH : naturalW;
    const h2 = secRotated ? naturalW : naturalH;

    let c2 = 0, r2 = 0;
    if (stripPos === 'right') {
      const remW = availableW - block1W - gutX;
      if (remW + gutX + 0.01 >= w2) {
        c2 = Math.floor((remW + gutX + 0.01) / (w2 + gutX));
        r2 = Math.floor((availableH + gutY + 0.01) / (h2 + gutY));
      }
    } else if (stripPos === 'bottom') {
      const remH = availableH - block1H - gutY;
      if (remH + gutY + 0.01 >= h2) {
        c2 = Math.floor((availableW + gutX + 0.01) / (w2 + gutX));
        r2 = Math.floor((remH + gutY + 0.01) / (h2 + gutY));
      }
    }

    const count2 = (c2 > 0 && r2 > 0) ? (c2 * r2) : 0;
    const totalYield = count1 + count2;

    const totalItemArea = totalYield * (naturalW * naturalH);
    const sheetArea = sheetW * sheetH;
    const coveragePct = sheetArea > 0 ? Math.min(100, Math.round((totalItemArea / sheetArea) * 100)) : 0;

    const candidate = {
      totalYield,
      coveragePct,
      primary: {
        cols: c1,
        rows: r1,
        w: w1,
        h: h1,
        rotated: primRotated,
        count: count1
      },
      secondary: count2 > 0 ? {
        cols: c2,
        rows: r2,
        w: w2,
        h: h2,
        rotated: secRotated,
        count: count2,
        strip: stripPos
      } : null
    };

    if (!bestCandidate || candidate.totalYield > bestCandidate.totalYield || 
       (candidate.totalYield === bestCandidate.totalYield && candidate.coveragePct > bestCandidate.coveragePct)) {
      bestCandidate = candidate;
    }
  }

  // Bounds for primary 0°
  const maxC_0 = Math.max(1, Math.floor((availableW + gutX + 0.01) / (naturalW + gutX)));
  const maxR_0 = Math.max(1, Math.floor((availableH + gutY + 0.01) / (naturalH + gutY)));

  // Bounds for primary 90°
  const maxC_90 = Math.max(1, Math.floor((availableW + gutX + 0.01) / (naturalH + gutX)));
  const maxR_90 = Math.max(1, Math.floor((availableH + gutY + 0.01) / (naturalH + gutY)));

  // Uniform candidates
  evaluateCandidate(false, maxC_0, maxR_0, 'none');
  evaluateCandidate(true, maxC_90, maxR_90, 'none');

  // Remainder combinations
  for (let c = 1; c <= maxC_0; c++) {
    for (let r = 1; r <= maxR_0; r++) {
      evaluateCandidate(false, c, r, 'right');
      evaluateCandidate(false, c, r, 'bottom');
    }
  }
  for (let c = 1; c <= maxC_90; c++) {
    for (let r = 1; r <= maxR_90; r++) {
      evaluateCandidate(true, c, r, 'right');
      evaluateCandidate(true, c, r, 'bottom');
    }
  }

  if (!bestCandidate) return;

  // Apply best candidate
  State.cols = bestCandidate.primary.cols;
  State.rows = bestCandidate.primary.rows;
  State.pageRotation = bestCandidate.primary.rotated ? 90 : 0;
  State.pageRotated = bestCandidate.primary.rotated;
  State.cropMarksMode = 'minimal';
  State.combinationLayout = bestCandidate;
  State.autoCenter = true;

  if (State.docPageCount === 1) {
    State.duplicatePages = true;
    if (window.UI && UI.checkDuplicatePages) UI.checkDuplicatePages.checked = true;
  }

  if (window.UI) {
    if (UI.inputCols) UI.inputCols.value = bestCandidate.primary.cols;
    if (UI.inputRows) UI.inputRows.value = bestCandidate.primary.rows;
    if (UI.checkAutoCenter) UI.checkAutoCenter.checked = true;
  }

  const isLt = State.lang !== 'en';
  let toastMsg = '';
  if (bestCandidate.secondary && bestCandidate.secondary.count > 0) {
    const primOrientEn = bestCandidate.primary.rotated ? 'vert' : 'horiz';
    const secOrientEn = bestCandidate.secondary.rotated ? 'vert' : 'horiz';
    const primOrientLt = bestCandidate.primary.rotated ? 'stat.' : 'guls.';
    const secOrientLt = bestCandidate.secondary.rotated ? 'stat.' : 'guls.';

    toastMsg = isLt
      ? `Max Area: ${bestCandidate.totalYield} vnt. (${bestCandidate.primary.count} ${primOrientLt} + ${bestCandidate.secondary.count} ${secOrientLt}) - ${bestCandidate.coveragePct}% padengimas`
      : `Max Area: ${bestCandidate.totalYield} pcs (${bestCandidate.primary.count} ${primOrientEn} + ${bestCandidate.secondary.count} ${secOrientEn}) - ${bestCandidate.coveragePct}% coverage`;
  } else {
    toastMsg = isLt
      ? `Max Area: ${bestCandidate.totalYield} vnt. (${bestCandidate.primary.cols}×${bestCandidate.primary.rows}) - ${bestCandidate.coveragePct}% padengimas`
      : `Max Area: ${bestCandidate.totalYield} pcs (${bestCandidate.primary.cols}×${bestCandidate.primary.rows}) - ${bestCandidate.coveragePct}% coverage`;
  }

  showToast(toastMsg, 'success');

  if (typeof updateStatusBadge === 'function') updateStatusBadge();
  if (typeof recalculateImposition === 'function') recalculateImposition();
  if (typeof renderImpositionCanvas === 'function') renderImpositionCanvas();
}

// Function Aliases for flexible call sites
const autoFit = runAutoFit;
const calculateOptimalFit = runAutoFit;
const autoFitStandard = runAutoFit;
const autoFitMax = runAutoFitMax;
const autoFitSheet = runAutoFit;
const executeAutoFitMax = runAutoFitMax;
