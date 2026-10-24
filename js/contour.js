// =============================================================
// IMPOZITOR PRO - js/contour.js
// Plotter Die-Cut & Alpha Contour Tracing Engine (CutContour)
// =============================================================

const contourCache = new WeakMap();

/**
 * Traces the alpha boundary of a raster image using the Marching Squares algorithm.
 * Returns normalized polygon vertices (x: 0..1, y: 0..1) or null if image is opaque / missing.
 */
function traceAlphaContour(imageElement, sampleWidth = 160) {
  if (!imageElement) return null;
  if (contourCache.has(imageElement)) return contourCache.get(imageElement);

  const natW = imageElement.naturalWidth || imageElement.width || 100;
  const natH = imageElement.naturalHeight || imageElement.height || 100;
  if (natW <= 0 || natH <= 0) return null;

  const scale = Math.min(1, sampleWidth / natW);
  const w = Math.max(10, Math.round(natW * scale));
  const h = Math.max(10, Math.round(natH * scale));

  const offCanvas = document.createElement('canvas');
  offCanvas.width = w;
  offCanvas.height = h;
  const oCtx = offCanvas.getContext('2d', { willReadFrequently: true });
  oCtx.drawImage(imageElement, 0, 0, w, h);

  const imgData = oCtx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // Check if image has genuine alpha transparency
  let hasTransparency = false;
  for (let i = 3; i < data.length; i += 16) {
    if (data[i] < 240) {
      hasTransparency = true;
      break;
    }
  }
  if (!hasTransparency) {
    contourCache.set(imageElement, null);
    return null;
  }

  const threshold = 25;
  const isSolid = (x, y) => {
    if (x < 0 || x >= w || y < 0 || y >= h) return false;
    return data[(y * w + x) * 4 + 3] > threshold;
  };

  // Find first solid boundary pixel
  let startX = -1, startY = -1;
  for (let y = 0; y < h && startX === -1; y++) {
    for (let x = 0; x < w; x++) {
      if (isSolid(x, y)) {
        startX = x;
        startY = y;
        break;
      }
    }
  }
  if (startX === -1) {
    contourCache.set(imageElement, null);
    return null;
  }

  // Marching Squares contour following
  const points = [];
  let cx = startX, cy = startY;
  let prevDir = 0;
  const maxSteps = w * h;
  let steps = 0;
  const dirs = [{ dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 0, dy: -1 }];

  do {
    points.push({ x: cx / w, y: cy / h });
    const tl = isSolid(cx - 1, cy - 1);
    const tr = isSolid(cx, cy - 1);
    const bl = isSolid(cx - 1, cy);
    const br = isSolid(cx, cy);

    const caseIdx = (tl ? 8 : 0) | (tr ? 4 : 0) | (br ? 2 : 0) | (bl ? 1 : 0);
    let nextDir = prevDir;

    switch (caseIdx) {
      case 1: case 5: case 13: nextDir = 3; break;
      case 2: case 3: case 7: nextDir = 0; break;
      case 4: case 12: case 14: nextDir = 1; break;
      case 8: case 10: case 11: nextDir = 2; break;
      case 6: nextDir = (prevDir === 3) ? 2 : 0; break;
      case 9: nextDir = (prevDir === 0) ? 3 : 1; break;
      default:
        nextDir = (prevDir + 1) % 4;
        break;
    }

    cx += dirs[nextDir].dx;
    cy += dirs[nextDir].dy;
    prevDir = nextDir;
    steps++;
  } while ((cx !== startX || cy !== startY) && steps < maxSteps && points.length < 500);

  // Douglas-Peucker / stride point reduction
  const simplified = [];
  const stride = Math.max(1, Math.floor(points.length / 80));
  for (let i = 0; i < points.length; i += stride) {
    simplified.push(points[i]);
  }

  contourCache.set(imageElement, simplified);
  return simplified;
}

/**
 * Calculates mitered normal offset polygon for the contour cut line.
 */
function calculateOffsetContour(normPoints, targetW, targetH, offsetPx) {
  if (!normPoints || normPoints.length < 3) return null;

  const pts = normPoints.map(p => ({ x: p.x * targetW, y: p.y * targetH }));
  const n = pts.length;
  const offsetPts = [];

  for (let i = 0; i < n; i++) {
    const prev = pts[(i - 1 + n) % n];
    const curr = pts[i];
    const next = pts[(i + 1) % n];

    const dx1 = curr.x - prev.x, dy1 = curr.y - prev.y;
    const len1 = Math.hypot(dx1, dy1) || 1;
    const dx2 = next.x - curr.x, dy2 = next.y - curr.y;
    const len2 = Math.hypot(dx2, dy2) || 1;

    const n1x = -dy1 / len1, n1y = dx1 / len1;
    const n2x = -dy2 / len2, n2y = dx2 / len2;

    let bx = n1x + n2x, by = n1y + n2y;
    const blen = Math.hypot(bx, by) || 1;
    bx /= blen;
    by /= blen;

    const dot = Math.max(0.2, n1x * bx + n1y * by);
    const miterDist = Math.min(offsetPx * 2.5, offsetPx / dot);

    offsetPts.push({
      x: curr.x + bx * miterDist,
      y: curr.y + by * miterDist
    });
  }

  return offsetPts;
}

/**
 * Renders the vector CutContour stroke on canvas in 100% Spot Magenta (#ec4899).
 */
function renderContourCutLine(ctx, posX, posY, cellW, cellH, mmToPx, offsetMm, cachedImg) {
  const offsetPx = offsetMm * mmToPx;
  const isShape = State.contourMode !== 'box';
  const normContour = (isShape && cachedImg) ? traceAlphaContour(cachedImg) : null;
  const offsetPolygon = normContour ? calculateOffsetContour(normContour, cellW, cellH, offsetPx) : null;

  ctx.save();
  ctx.strokeStyle = '#ec4899'; // 100% Spot Magenta (CutContour)
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 2]); // Distinct 1pt dashed stroke

  ctx.beginPath();
  if (offsetPolygon && offsetPolygon.length >= 3) {
    ctx.moveTo(posX + offsetPolygon[0].x, posY + offsetPolygon[0].y);
    for (let i = 1; i < offsetPolygon.length; i++) {
      ctx.lineTo(posX + offsetPolygon[i].x, posY + offsetPolygon[i].y);
    }
    ctx.closePath();
  } else {
    // Fallback: offset bounding box
    ctx.rect(posX - offsetPx, posY - offsetPx, cellW + offsetPx * 2, cellH + offsetPx * 2);
  }
  ctx.stroke();
  ctx.restore();
}

/**
 * Generates and loads an interactive demo die-cut sticker into the workspace.
 */
function loadDemoSticker() {
  const stCanvas = document.createElement('canvas');
  stCanvas.width = 400;
  stCanvas.height = 400;
  const sCtx = stCanvas.getContext('2d');
  sCtx.clearRect(0, 0, 400, 400);

  // Outer circular sticker with alpha background
  sCtx.beginPath();
  sCtx.arc(200, 200, 150, 0, Math.PI * 2);
  sCtx.fillStyle = '#f59e0b';
  sCtx.fill();
  sCtx.lineWidth = 10;
  sCtx.strokeStyle = '#18181b';
  sCtx.stroke();

  // Sticker typography
  sCtx.fillStyle = '#18181b';
  sCtx.font = 'bold 42px Inter, sans-serif';
  sCtx.textAlign = 'center';
  sCtx.textBaseline = 'middle';
  sCtx.fillText('STICKER', 200, 200);

  // Update State for sticker step-and-repeat
  State.sourcePageWidth = 50;
  State.sourcePageHeight = 50;
  State.docPageCount = 1;
  State.mode = 'nup';
  State.duplicatePages = true;
  State.cols = 5;
  State.rows = 7;
  State.gutterX = 5;
  State.gutterY = 5;
  State.cutContourEnabled = true;
  State.contourMode = 'shape';
  State.cutOffsetMm = 2;
  State.pageRenderCache = { 1: stCanvas };

  // Sync UI controls
  if (window.UI) {
    if (UI.inputPageWidth) UI.inputPageWidth.value = 50;
    if (UI.inputPageHeight) UI.inputPageHeight.value = 50;
    if (UI.selectMode) UI.selectMode.value = 'nup';
    if (UI.checkDuplicatePages) UI.checkDuplicatePages.checked = true;
    if (UI.inputCols) UI.inputCols.value = 5;
    if (UI.inputRows) UI.inputRows.value = 7;
    if (UI.inputGutterX) UI.inputGutterX.value = 5;
    if (UI.inputGutterY) UI.inputGutterY.value = 5;
    if (UI.checkCutContourEnabled) UI.checkCutContourEnabled.checked = true;
    if (UI.selectContourMode) UI.selectContourMode.value = 'shape';
    if (UI.inputCutOffset) UI.inputCutOffset.value = 2;
    if (UI.cutOffsetLabel) UI.cutOffsetLabel.textContent = '+2.0 mm';
  }

  if (typeof updateStatusBadge === 'function') updateStatusBadge();
  if (typeof recalculateImposition === 'function') recalculateImposition();
  if (typeof renderImpositionCanvas === 'function') renderImpositionCanvas();

  showToast(State.lang === 'en' ? 'Loaded demo sticker with CutContour contour!' : 'Užkrautas demonstracinis lipdukas su CutContour kontūru!');
}
