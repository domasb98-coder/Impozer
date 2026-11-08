// =============================================================
// IMPOZITOR PRO - js/canvas.js
// High-Precision HTML5 Canvas Rendering Engine & Zoom/Pan System
// =============================================================

/**
 * Background rasterization of a vector PDF page into image cache for fast canvas rendering.
 */
async function renderPdfPageToCache(pageNum) {
  if (!State.pdfJsDoc || State.pageRenderCache[pageNum] || State.pageRenderInProgress[pageNum]) return;
  State.pageRenderInProgress[pageNum] = true;

  try {
    const page = await State.pdfJsDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.0 });
    const offscreen = document.createElement('canvas');
    offscreen.width = viewport.width;
    offscreen.height = viewport.height;
    const ctx = offscreen.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
    State.pageRenderCache[pageNum] = offscreen;
  } catch (err) {
    console.warn(`Error rendering page ${pageNum} to cache:`, err);
  } finally {
    delete State.pageRenderInProgress[pageNum];
    if (window.requestAnimationFrame) requestAnimationFrame(renderImpositionCanvas);
  }
}

/**
 * Triggers background rasterization for all pages visible on the current sheet view.
 */
function ensureVisibleSheetPagesRendered() {
  if (!State.pdfJsDoc) return;
  for (let r = 0; r < State.rows; r++) {
    for (let c = 0; c < State.cols; c++) {
      const slotInfo = getCellSlotInfo(c, r, State.currentSide, State.currentSheetIndex);
      const pageNum = slotInfo.page;
      if (pageNum && !State.pageRenderCache[pageNum]) {
        renderPdfPageToCache(pageNum);
      }
    }
  }
}

/**
 * Draws a single imposed artwork cell or synthetic placeholder.
 * When called from the main grid loop, the canvas context is already translated to the slot center
 * and rotated by totalRot, so (x, y, w, h) are in the page's unrotated 1:1 coordinate frame.
 * When isRotated is explicitly passed (e.g. secondary combination strip), applies 90° CW rotation.
 */
function drawImposedPage(ctx, x, y, w, h, pageNum, bleed, mmToPx, cellIndex = 0, isRotated = false) {
  const pageData = State.docPages.find(p => p.pageNumber === pageNum) || { pageNumber: pageNum, accentHue: (pageNum * 37) % 360 };
  const bTop = (bleed.top || 0) * mmToPx;
  const bBottom = (bleed.bottom || 0) * mmToPx;
  const bLeft = (bleed.left || 0) * mmToPx;
  const bRight = (bleed.right || 0) * mmToPx;
  const hasBleed = (bTop > 0 || bBottom > 0 || bLeft > 0 || bRight > 0);
  const cachedImg = State.pageRenderCache[pageNum];

  if (cachedImg) {
    if (hasBleed && State.bleedArtwork) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x - bLeft, y - bTop, w + bLeft + bRight, h + bTop + bBottom);
      ctx.clip();
      if (isRotated) {
        ctx.translate(x + w / 2, y + h / 2);
        ctx.rotate(Math.PI / 2);
        ctx.drawImage(cachedImg, -(h + bTop + bBottom) / 2, -(w + bLeft + bRight) / 2, h + bTop + bBottom, w + bLeft + bRight);
      } else {
        ctx.drawImage(cachedImg, x - bLeft, y - bTop, w + bLeft + bRight, h + bTop + bBottom);
      }
      ctx.beginPath();
      ctx.rect(x - bLeft, y - bTop, w + bLeft + bRight, h + bTop + bBottom);
      ctx.rect(x + w, y, -w, h);
      ctx.fillStyle = 'rgba(245, 158, 11, 0.16)';
      ctx.fill();
      ctx.restore();
    }
    if (hasBleed && State.bleedBox) {
      ctx.save();
      ctx.setLineDash([3, 2]);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 0.75;
      ctx.strokeRect(x - bLeft, y - bTop, w + bLeft + bRight, h + bTop + bBottom);
      ctx.restore();
    }

    ctx.save();
    if (isRotated) {
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(cachedImg, -h / 2, -w / 2, h, w);
    } else {
      ctx.drawImage(cachedImg, x, y, w, h);
    }
    ctx.restore();

    ctx.strokeStyle = 'rgba(24, 24, 27, 0.35)';
    ctx.lineWidth = 0.6;
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = 'rgba(9, 10, 15, 0.88)';
    ctx.fillRect(x, y, Math.min(52, w * 0.48), 14);
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 8px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    const cellTag = (State.duplicatePages && State.mode !== 'manual') ? (`${t('Item')} ${cellIndex + 1}`) : `P.${pageNum}`;
    ctx.fillText(cellTag, x + 4, y + 10);
    return;
  }

  // Fallback synthetic high-contrast prepress page
  if (hasBleed && State.bleedArtwork) {
    const bleedGrad = ctx.createLinearGradient(x - bLeft, y - bTop, x + w + bRight, y + h + bBottom);
    bleedGrad.addColorStop(0, `hsl(${pageData.accentHue}, 42%, 91%)`);
    bleedGrad.addColorStop(1, `hsl(${pageData.accentHue}, 32%, 84%)`);
    ctx.fillStyle = bleedGrad;
    ctx.fillRect(x - bLeft, y - bTop, w + bLeft + bRight, h + bTop + bBottom);

    ctx.save();
    ctx.beginPath();
    ctx.rect(x - bLeft, y - bTop, w + bLeft + bRight, h + bTop + bBottom);
    ctx.rect(x + w, y, -w, h);
    ctx.clip();
    ctx.fillStyle = 'rgba(245, 158, 11, 0.12)';
    ctx.fillRect(x - bLeft, y - bTop, w + bLeft + bRight, h + bTop + bBottom);
    ctx.restore();
  }

  if (hasBleed && State.bleedBox) {
    ctx.save();
    ctx.setLineDash([3, 2]);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 0.75;
    ctx.strokeRect(x - bLeft, y - bTop, w + bLeft + bRight, h + bTop + bBottom);
    ctx.restore();
  }

  ctx.save();
  if (isRotated) {
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(Math.PI / 2);
    ctx.translate(-h / 2, -w / 2);
    const rw = h;
    const rh = w;

    const grad = ctx.createLinearGradient(0, 0, rw, rh);
    grad.addColorStop(0, `hsl(${pageData.accentHue}, 50%, 98%)`);
    grad.addColorStop(1, `hsl(${pageData.accentHue}, 38%, 93%)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, rw, rh);

    ctx.strokeStyle = `hsl(${pageData.accentHue}, 50%, 45%)`;
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, rw, rh);

    const headerH = Math.min(18, rh * 0.12);
    ctx.fillStyle = `hsl(${pageData.accentHue}, 55%, 38%)`;
    ctx.fillRect(0, 0, rw, headerH);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px Inter, sans-serif';
    ctx.textAlign = 'left';
    const topTitle = (State.duplicatePages && State.mode !== 'manual')
      ? (`${t('Item')} #${cellIndex + 1}`)
      : (`${t('Page')} ${pageNum}`);
    ctx.fillText(topTitle, 5, Math.min(12, rh * 0.08));

    ctx.fillStyle = `hsl(${pageData.accentHue}, 60%, 25%)`;
    ctx.font = `bold ${Math.min(rw * 0.3, 34)}px JetBrains Mono, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((State.duplicatePages && State.mode !== 'manual') ? `#${cellIndex + 1}` : pageNum, rw / 2, rh / 2);
    ctx.textBaseline = 'alphabetic';
    ctx.restore();
    return;
  }

  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, `hsl(${pageData.accentHue}, 50%, 98%)`);
  grad.addColorStop(1, `hsl(${pageData.accentHue}, 38%, 93%)`);
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);

  ctx.strokeStyle = `hsl(${pageData.accentHue}, 50%, 45%)`;
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);

  const headerH = Math.min(18, h * 0.12);
  ctx.fillStyle = `hsl(${pageData.accentHue}, 55%, 38%)`;
  ctx.fillRect(x, y, w, headerH);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 8px Inter, sans-serif';
  ctx.textAlign = 'left';
  const topTitle = (State.duplicatePages && State.mode !== 'manual')
    ? (`${t('Item')} #${cellIndex + 1}`)
    : (`${t('Page')} ${pageNum}`);
  ctx.fillText(topTitle, x + 5, y + Math.min(12, h * 0.08));

  ctx.fillStyle = `hsl(${pageData.accentHue}, 60%, 25%)`;
  ctx.font = `bold ${Math.min(w * 0.3, 34)}px JetBrains Mono, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText((State.duplicatePages && State.mode !== 'manual') ? `#${cellIndex + 1}` : pageNum, x + w / 2, y + h / 2);

  ctx.fillStyle = 'rgba(82, 82, 91, 0.28)';
  const lineCount = 4;
  const lineSpacing = Math.min(8, h * 0.05);
  const startLineY = y + h / 2 + Math.min(20, h * 0.15);
  for (let i = 0; i < lineCount; i++) {
    const lineY = startLineY + i * lineSpacing;
    if (lineY + 4 < y + h - 8) ctx.fillRect(x + 10, lineY, w - 20, 3);
  }
  ctx.textBaseline = 'alphabetic';
  ctx.restore();
}

const MIN_ZOOM = 0.05;
const MAX_ZOOM = 15.0;
const VIEWPORT_PADDING = 20;

let isSyncingZoomUI = false;
let resetViewportDragStateFn = null;

/**
 * Computes static container viewport dimensions and immutable unscaled base sheet dimensions
 * (never reading getBoundingClientRect() of an already-transformed element for fit scale).
 */
function getViewportMetrics() {
  const container = (window.UI && UI.viewportContainer) || document.getElementById('viewportContainer');
  const canvas = (window.UI && UI.impositionCanvas) || document.getElementById('impositionCanvas');
  const cWidth = (container && container.clientWidth > 0) ? container.clientWidth : 800;
  const cHeight = (container && container.clientHeight > 0) ? container.clientHeight : 600;

  if (!Number.isFinite(State.sheetWidth) || State.sheetWidth <= 0) State.sheetWidth = 320;
  if (!Number.isFinite(State.sheetHeight) || State.sheetHeight <= 0) State.sheetHeight = 450;
  if (!Number.isFinite(State.viewRotation)) State.viewRotation = 0;

  const rotNorm = (((Number(State.viewRotation) || 0) % 360) + 360) % 360;
  const baseWidth = (rotNorm % 180 === 0) ? State.sheetWidth : State.sheetHeight;
  const baseHeight = (rotNorm % 180 === 0) ? State.sheetHeight : State.sheetWidth;

  const viewportWidth = Math.max(50, cWidth - VIEWPORT_PADDING * 2);
  const viewportHeight = Math.max(50, cHeight - VIEWPORT_PADDING * 2);

  const fitScale = Math.min(viewportWidth / baseWidth, viewportHeight / baseHeight);
  const fitMaxScale = Math.max(viewportWidth / baseWidth, viewportHeight / baseHeight);

  return {
    container,
    canvas,
    cWidth,
    cHeight,
    viewportWidth,
    viewportHeight,
    rotNorm,
    baseWidth,
    baseHeight,
    fitScale,
    fitMaxScale
  };
}

/**
 * Updates zoom slider and badge UI without triggering recursive input/change events.
 */
function syncZoomControlsUI() {
  isSyncingZoomUI = true;
  try {
    const pct = Math.round((Number.isFinite(State.zoom) ? State.zoom : 1.0) * 100);
    const zoomDisp = (window.UI && UI.zoomLevelDisplay) || document.getElementById('zoomLevelDisplay');
    const zoomSlid = (window.UI && UI.zoomSlider) || document.getElementById('zoomSlider');
    if (zoomDisp) zoomDisp.textContent = `${pct}%`;
    if (zoomSlid) {
      const minVal = parseFloat(zoomSlid.min) || 5;
      const maxVal = parseFloat(zoomSlid.max) || 1500;
      zoomSlid.value = String(Math.max(minVal, Math.min(maxVal, pct)));
    }
  } finally {
    isSyncingZoomUI = false;
  }
}

/**
 * Deterministically calculates Fit or Fit Max (Fill) scale from immutable base sheet dimensions
 * and static container dimensions, resets any active drag/momentum state, and centers panX/panY.
 */
function fitViewport(mode = 'fit') {
  if (typeof resetViewportDragStateFn === 'function') {
    resetViewportDragStateFn();
  }

  const { container, canvas, cWidth, cHeight, viewportWidth, viewportHeight, baseWidth, baseHeight, fitScale } = getViewportMetrics();
  if (!container) return;

  const isMax = (mode === 'max' || mode === 'fill');
  const targetScale = isMax
    ? Math.max(viewportWidth / baseWidth, viewportHeight / baseHeight)
    : Math.min(viewportWidth / baseWidth, viewportHeight / baseHeight);

  const panX = (cWidth - baseWidth * targetScale) / 2;
  const panY = (cHeight - baseHeight * targetScale) / 2;

  State.scale = targetScale;
  State.panX = panX;
  State.panY = panY;
  State.zoom = fitScale > 0 ? (targetScale / fitScale) : 1.0;
  State.fitMode = isMax ? 'max' : 'fit';
  State._viewportInitialized = true;
  State._lastFitSignature = `${cWidth}x${cHeight}_${baseWidth}x${baseHeight}`;

  if (canvas) {
    canvas.style.transformOrigin = '0 0';
  }

  syncZoomControlsUI();
  renderImpositionCanvas();
}

function fitViewportMax() {
  fitViewport('max');
}

/**
 * Main Imposition Canvas Rendering Loop.
 */
function renderImpositionCanvas() {
  ensureVisibleSheetPagesRendered();

  const { container, canvas, cWidth, cHeight, viewportWidth, viewportHeight, baseWidth, baseHeight, fitScale } = getViewportMetrics();
  if (!canvas || !container) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  if (cWidth < 10 || cHeight < 10) return;

  const currentSig = `${cWidth}x${cHeight}_${baseWidth}x${baseHeight}`;
  if (
    !State._viewportInitialized ||
    !Number.isFinite(State.scale) ||
    State.scale <= 0 ||
    !Number.isFinite(State.panX) ||
    !Number.isFinite(State.panY) ||
    (State.fitMode !== 'manual' && State._lastFitSignature !== currentSig)
  ) {
    const isMax = State.fitMode === 'max';
    const targetScale = isMax
      ? Math.max(viewportWidth / baseWidth, viewportHeight / baseHeight)
      : Math.min(viewportWidth / baseWidth, viewportHeight / baseHeight);
    State.scale = targetScale;
    State.zoom = fitScale > 0 ? (targetScale / fitScale) : 1.0;
    State.panX = (cWidth - baseWidth * targetScale) / 2;
    State.panY = (cHeight - baseHeight * targetScale) / 2;
    State._viewportInitialized = true;
    State._lastFitSignature = currentSig;
    syncZoomControlsUI();
  } else {
    State.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Number.isFinite(State.zoom) && State.zoom > 0 ? State.zoom : 1.0));
    State.scale = fitScale * State.zoom;
  }

  const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  const targetPixelW = Math.round(cWidth * dpr);
  const targetPixelH = Math.round(cHeight * dpr);
  if (canvas.width !== targetPixelW || canvas.height !== targetPixelH) {
    canvas.width = targetPixelW;
    canvas.height = targetPixelH;
    canvas.style.width = `${cWidth}px`;
    canvas.style.height = `${cHeight}px`;
  }
  canvas.style.transformOrigin = '0 0';

  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cWidth, cHeight);

  const mmToPx = State.scale;
  const boxW = baseWidth * mmToPx;
  const boxH = baseHeight * mmToPx;
  const sheetCenterX = State.panX + boxW / 2;
  const sheetCenterY = State.panY + boxH / 2;

  const drawW = State.sheetWidth * mmToPx;
  const drawH = State.sheetHeight * mmToPx;
  const drawX = sheetCenterX - drawW / 2;
  const drawY = sheetCenterY - drawH / 2;

  if (State.viewRotation) {
    ctx.translate(sheetCenterX, sheetCenterY);
    ctx.rotate((State.viewRotation * Math.PI) / 180);
    ctx.translate(-sheetCenterX, -sheetCenterY);
  }

  State.lastRenderedSheetLayout = {
    sheetX: drawX,
    sheetY: drawY,
    sheetCenterX,
    sheetCenterY,
    scale: mmToPx,
    drawW,
    drawH,
    boxW,
    boxH,
    cWidth,
    cHeight
  };

  // 1. Spaudos popieriaus lankas
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(drawX, drawY, drawW, drawH);
  ctx.strokeStyle = '#a1a1aa';
  ctx.lineWidth = 1;
  ctx.strokeRect(drawX, drawY, drawW, drawH);

  // 2. Tikros 1:1 gaminio proporcijos ir bazinis tinklelis
  const baseGeom = getSlotGeometry(0, 0, State.currentSide, State.currentSheetIndex);
  const cellW = baseGeom.cellW_mm * mmToPx;
  const cellH = baseGeom.cellH_mm * mmToPx;
  const gutterXPx = State.gutterX * mmToPx;
  const gutterYPx = State.gutterY * mmToPx;

  const startOffsetX_mm = baseGeom.startX_mm;
  const startOffsetY_mm = baseGeom.startY_mm;
  const totalGridW_mm = baseGeom.gridW_mm;
  const totalGridH_mm = baseGeom.gridH_mm;

  if (State.autoCenter) {
    if (window.UI && UI.inputMarginSide && document.activeElement !== UI.inputMarginSide) {
      UI.inputMarginSide.value = Math.max(0, Math.round(startOffsetX_mm * 10) / 10);
    }
    if (window.UI && UI.inputMarginTop && document.activeElement !== UI.inputMarginTop) {
      UI.inputMarginTop.value = Math.max(0, Math.round(startOffsetY_mm * 10) / 10);
    }
  }

  const startXPx = drawX + startOffsetX_mm * mmToPx;
  const startYPx = drawY + startOffsetY_mm * mmToPx;
  const gridWPx = totalGridW_mm * mmToPx;
  const gridHPx = totalGridH_mm * mmToPx;

  if (!State.viewCutSheet) {
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = '#cbd5e1';
    ctx.strokeRect(startXPx, startYPx, gridWPx, gridHPx);
    ctx.setLineDash([]);
  }

  // 3. Grid Cells Rendering (Full support for 0°/90°/180°/270° rotation & manual X/Y offsets)
  for (let r = 0; r < State.rows; r++) {
    for (let c = 0; c < State.cols; c++) {
      const geom = getSlotGeometry(c, r, State.currentSide, State.currentSheetIndex);
      const pageNum = geom.pageNum;
      const slotRot = geom.slotRot;
      const totalRot = geom.totalRot;
      const cellBleed = getCellBleed(c, r, totalRot);
      const localBleed = {
        top: cellBleed.localTop,
        right: cellBleed.localRight,
        bottom: cellBleed.localBottom,
        left: cellBleed.localLeft
      };

      const slotCenterX = drawX + geom.centerX_mm * mmToPx;
      const slotCenterY = drawY + geom.centerY_mm * mmToPx;
      const srcWPx = geom.sourceW_mm * mmToPx;
      const srcHPx = geom.sourceH_mm * mmToPx;

      const trimXPx = drawX + geom.trimX_mm * mmToPx;
      const trimYPx = drawY + geom.trimY_mm * mmToPx;
      const trimWPx = geom.trimW_mm * mmToPx;
      const trimHPx = geom.trimH_mm * mmToPx;

      if (State.viewCutSheet) {
        if (pageNum !== null) {
          const cutOffPx = State.cutOffsetMm * mmToPx;
          ctx.strokeStyle = '#e4e4e7';
          ctx.lineWidth = 0.5;
          ctx.setLineDash([2, 2]);
          ctx.strokeRect(trimXPx, trimYPx, trimWPx, trimHPx);
          ctx.setLineDash([]);

          ctx.strokeStyle = '#d946ef';
          ctx.lineWidth = Math.max(1, 1.2 * (mmToPx / 2.834));
          ctx.strokeRect(trimXPx - cutOffPx, trimYPx - cutOffPx, trimWPx + cutOffPx * 2, trimHPx + cutOffPx * 2);

          ctx.fillStyle = '#a855f7';
          ctx.font = 'bold 9px JetBrains Mono, monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`CUT (${State.cutOffsetMm >= 0 ? '+' : ''}${State.cutOffsetMm}mm)`, slotCenterX, slotCenterY);
        }
      } else {
        const effColForIdx = (State.printStyle !== 'single' && State.currentSide === 'back' && State.mode !== 'booklet' && State.mode !== 'signatures')
          ? (State.cols - 1 - c) : c;
        const cellIdx = r * State.cols + effColForIdx;

        ctx.save();
        ctx.translate(slotCenterX, slotCenterY);
        ctx.rotate((totalRot * Math.PI) / 180);

        if (pageNum !== null) {
          drawImposedPage(ctx, -srcWPx / 2, -srcHPx / 2, srcWPx, srcHPx, pageNum, localBleed, mmToPx, cellIdx, false);

          if (State.cutContourEnabled) {
            renderContourCutLine(ctx, -srcWPx / 2, -srcHPx / 2, srcWPx, srcHPx, mmToPx, State.cutOffsetMm, State.pageRenderCache[pageNum]);
          }

          // Orientation arrow at head of page (points UP at 0°, RIGHT at 90°, DOWN at 180°, LEFT at 270°)
          const arrowSize = Math.max(7, Math.min(13, srcWPx * 0.08, srcHPx * 0.08));
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.moveTo(0, -srcHPx / 2 + 3);
          ctx.lineTo(-arrowSize * 0.6, -srcHPx / 2 + 3 + arrowSize);
          ctx.lineTo(arrowSize * 0.6, -srcHPx / 2 + 3 + arrowSize);
          ctx.closePath();
          ctx.fill();
        } else {
          // Empty slot (TUŠČIAS / BLANK)
          ctx.fillStyle = '#18181b';
          ctx.fillRect(-srcWPx / 2, -srcHPx / 2, srcWPx, srcHPx);
          ctx.strokeStyle = '#3f3f46';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(-srcWPx / 2, -srcHPx / 2, srcWPx, srcHPx);
          ctx.setLineDash([]);
        }

        ctx.restore();

        // Upright slot badge in sheet space so operator can always read slot info clearly
        if (pageNum !== null && (State.mode === 'manual' || slotRot !== 0 || geom.offsetX_mm !== 0 || geom.offsetY_mm !== 0)) {
          const rotTag = slotRot === 180 ? ' 180° 🔻' : (slotRot ? ` ${slotRot}°` : '');
          const offTag = (geom.offsetX_mm !== 0 || geom.offsetY_mm !== 0)
            ? ` Δ${geom.offsetX_mm},${geom.offsetY_mm}`
            : '';
          const badgeText = `P.${pageNum}${rotTag}${offTag}`;
          const badgeW = Math.min(trimWPx, Math.max(54, badgeText.length * 5.2 + 8));
          ctx.fillStyle = 'rgba(9, 10, 15, 0.88)';
          ctx.fillRect(trimXPx, trimYPx + trimHPx - 16, badgeW, 16);
          ctx.fillStyle = '#f59e0b';
          ctx.font = 'bold 8px JetBrains Mono, monospace';
          ctx.textAlign = 'left';
          ctx.fillText(badgeText, trimXPx + 4, trimYPx + trimHPx - 5);
        } else if (pageNum === null) {
          ctx.fillStyle = '#71717a';
          ctx.font = 'bold 10px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(t('Empty'), slotCenterX, slotCenterY);

          if (State.mode === 'manual') {
            ctx.fillStyle = '#f59e0b';
            ctx.font = '8px JetBrains Mono, monospace';
            ctx.fillText(`[${c + 1}×${r + 1}]`, slotCenterX, slotCenterY + 14);
          }
          ctx.textBaseline = 'alphabetic';
        }

        if (State.cropMarks && pageNum !== null) {
          drawCropMarks(ctx, trimXPx, trimYPx, trimWPx, trimHPx, mmToPx, c, r, cellBleed, pageNum);
        }
      }
    }
  }

  // 3b. Combination Layout Secondary Block
  if (State.combinationLayout && State.combinationLayout.secondary && State.combinationLayout.secondary.count > 0) {
    const sec = State.combinationLayout.secondary;
    const secCellW = sec.w * mmToPx;
    const secCellH = sec.h * mmToPx;
    const secStartX_mm = sec.strip === 'right'
      ? (startOffsetX_mm + totalGridW_mm + State.gutterX)
      : startOffsetX_mm;
    const secStartY_mm = sec.strip === 'bottom'
      ? (startOffsetY_mm + totalGridH_mm + State.gutterY)
      : startOffsetY_mm;

    const secStartXPx = drawX + secStartX_mm * mmToPx;
    const secStartYPx = drawY + secStartY_mm * mmToPx;

    ctx.save();
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      secStartXPx, secStartYPx,
      (sec.cols * sec.w + (sec.cols - 1) * State.gutterX) * mmToPx,
      (sec.rows * sec.h + (sec.rows - 1) * State.gutterY) * mmToPx
    );
    ctx.restore();

    for (let r = 0; r < sec.rows; r++) {
      for (let c = 0; c < sec.cols; c++) {
        const posX = secStartXPx + c * (secCellW + gutterXPx);
        const posY = secStartYPx + r * (secCellH + gutterYPx);
        const secCellIndex = (State.cols * State.rows) + (r * sec.cols + c);
        const secPageNum = State.duplicatePages ? 1 : Math.min(State.docPageCount, secCellIndex + 1);
        const cellBleed = { top: State.bleedMm, bottom: State.bleedMm, left: State.bleedMm, right: State.bleedMm };

        if (State.viewCutSheet) {
          const cutOffPx = State.cutOffsetMm * mmToPx;
          ctx.strokeStyle = '#e4e4e7';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(posX, posY, secCellW, secCellH);
          ctx.strokeStyle = '#d946ef';
          ctx.lineWidth = 1;
          ctx.strokeRect(posX - cutOffPx, posY - cutOffPx, secCellW + cutOffPx * 2, secCellH + cutOffPx * 2);
        } else {
          drawImposedPage(ctx, posX, posY, secCellW, secCellH, secPageNum, cellBleed, mmToPx, secCellIndex, sec.rotated);

          if (State.cutContourEnabled) {
            renderContourCutLine(ctx, posX, posY, secCellW, secCellH, mmToPx, State.cutOffsetMm, State.pageRenderCache[secPageNum]);
          }

          if (State.cropMarks) {
            drawCropMarks(ctx, posX, posY, secCellW, secCellH, mmToPx, c + State.cols, r, cellBleed, secPageNum);
          }
        }
      }
    }
  }

  // Prepress Optical Fiducials & Marks
  if (State.viewCutSheet || (State.cutContourEnabled && State.plotterMarks)) {
    drawPlotterRegistrationDots(ctx, drawX, drawY, drawW, drawH, mmToPx);
  }

  if (!State.viewCutSheet) {
    const effMode = State.mode === 'manual' ? (State.lastAutoMode || 'booklet') : State.mode;
    if (State.centerMarks) drawSheetCenterMarks(ctx, drawX, drawY, drawW, drawH, mmToPx);
    if (State.foldMarks && (effMode === 'booklet' || effMode === 'signatures') && State.cols >= 2) {
      for (let c = 1; c < State.cols; c += 2) {
        const spineX = startXPx + c * cellW + (c - 1) * gutterXPx + gutterXPx / 2;
        drawSpineFoldMarks(ctx, spineX, startYPx, gridHPx, mmToPx);
      }
    }
    if (State.collatingMarks && (effMode === 'booklet' || effMode === 'signatures') && State.cols >= 2) {
      const spineX = startXPx + cellW + gutterXPx / 2;
      drawCollatingMark(ctx, spineX, startYPx, gridHPx, mmToPx);
    }
    if (State.gripperMark) drawGripperEdgeMark(ctx, drawX, drawY, drawW, drawH, mmToPx);
    if (State.slugLine) drawSlugLine(ctx, drawX, drawY, drawW, drawH, mmToPx);
    if (State.regTargets) drawRegistrationTargets(ctx, drawX, drawY, drawW, drawH, mmToPx);
    if (State.cmykBars) drawCmykColorBars(ctx, drawX, drawY, drawW, drawH, mmToPx);
  } else {
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 7px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    const cutHeader = `IMPOZITOR PRO • ${t('CutSheet')} (CUTCONTOUR ${State.cutOffsetMm >= 0 ? '+' : ''}${State.cutOffsetMm}mm) • ${t('PlotterSheet')}`;
    ctx.fillText(cutHeader, drawX + 12 * mmToPx, drawY + 6 * mmToPx);
  }

  ctx.restore();
}

const renderCanvas = renderImpositionCanvas;
window.renderCanvas = renderImpositionCanvas;

/**
 * Converts a screen-space vector (dx, dy) into unrotated sheet space by counter-rotating by -State.viewRotation.
 */
function screenDeltaToSheetPanDelta(dx, dy) {
  const rot = (((Number(State.viewRotation) || 0) % 360) + 360) % 360;
  if (rot === 0) return { dx, dy };
  const rad = (-rot * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    dx: dx * cos - dy * sin,
    dy: dx * sin + dy * cos
  };
}

/**
 * Zoom level setter with cursor focal-point anchoring, top-left (0, 0) transform origin,
 * [0.05, 15.0] scale clamping, and non-recursive UI synchronization.
 *
 * Focal-point locking formula:
 *   newScale = clamp(currentScale * zoomFactor, minScale, maxScale)
 *   panX = cursorX - (cursorX - panX) * (newScale / currentScale)
 *   panY = cursorY - (cursorY - panY) * (newScale / currentScale)
 */
function setZoom(newZoom, focalClientX = null, focalClientY = null) {
  const minZoom = MIN_ZOOM;
  const maxZoom = MAX_ZOOM;
  const { container, canvas, cWidth, cHeight, baseWidth, baseHeight, fitScale } = getViewportMetrics();

  const currentZoom = (Number.isFinite(State.zoom) && State.zoom >= minZoom) ? State.zoom : 1.0;
  const parsed = Number(newZoom);
  const nextZoom = Math.max(minZoom, Math.min(maxZoom, Number.isFinite(parsed) && parsed > 0 ? parsed : currentZoom));

  const currentScale = (Number.isFinite(State.scale) && State.scale > 0) ? State.scale : (fitScale * currentZoom);
  const newScale = fitScale * nextZoom;

  const defaultPanX = (cWidth - baseWidth * currentScale) / 2;
  const defaultPanY = (cHeight - baseHeight * currentScale) / 2;
  const currentPanX = (State._viewportInitialized && Number.isFinite(State.panX)) ? State.panX : defaultPanX;
  const currentPanY = (State._viewportInitialized && Number.isFinite(State.panY)) ? State.panY : defaultPanY;

  if (Math.abs(newScale - currentScale) > 1e-9) {
    let cursorX = cWidth / 2;
    let cursorY = cHeight / 2;

    if (focalClientX !== null && focalClientY !== null && Number.isFinite(focalClientX) && Number.isFinite(focalClientY)) {
      const rectEl = container || canvas;
      const rect = (rectEl && typeof rectEl.getBoundingClientRect === 'function')
        ? rectEl.getBoundingClientRect()
        : { left: 0, top: 0, width: cWidth, height: cHeight };
      const boxLeft = Number.isFinite(rect?.left) ? rect.left : 0;
      const boxTop = Number.isFinite(rect?.top) ? rect.top : 0;
      const boxW = (rect && rect.width > 0) ? rect.width : cWidth;
      const boxH = (rect && rect.height > 0) ? rect.height : cHeight;
      const scaleX = (boxW > 0 && cWidth > 0) ? (cWidth / boxW) : 1;
      const scaleY = (boxH > 0 && cHeight > 0) ? (cHeight / boxH) : 1;

      cursorX = (focalClientX - boxLeft) * scaleX;
      cursorY = (focalClientY - boxTop) * scaleY;
    }

    const scaleRatio = newScale / currentScale;
    State.panX = cursorX - (cursorX - currentPanX) * scaleRatio;
    State.panY = cursorY - (cursorY - currentPanY) * scaleRatio;
  } else {
    State.panX = currentPanX;
    State.panY = currentPanY;
  }

  State.scale = newScale;
  State.zoom = nextZoom;
  State.fitMode = 'manual';
  State._viewportInitialized = true;

  if (canvas) {
    canvas.style.transformOrigin = '0 0';
  }

  syncZoomControlsUI();
  renderImpositionCanvas();
}

/**
 * Resets pan offsets and deterministically fits the sheet to the viewport container.
 */
function resetPanAndFit() {
  fitViewport('fit');
}

/**
 * Sets up interactive zoom, pan gestures, view rotation, and manual slot click hit-testing.
 */
function setupZoomAndPanHandlers() {
  const byId = (id) => (window.UI && UI[id]) || document.getElementById(id);

  const btnZoomIn = byId("btnZoomIn");
  const btnZoomOut = byId("btnZoomOut");
  const btnZoomFit = byId("btnZoomFit");
  const btnZoomInFloat = byId("btnZoomInFloat");
  const btnZoomOutFloat = byId("btnZoomOutFloat");
  const btnZoomFitFloat = byId("btnZoomFitFloat");
  const btnZoom100Float = byId("btnZoom100Float");
  const btnZoomResetPan = byId("btnZoomResetPan");
  const btnRotateView = byId("btnRotateView");
  const zoomSlider = byId("zoomSlider");
  const vp = byId("viewportContainer");
  const canvas = byId("impositionCanvas");

  if (canvas) {
    canvas.style.transformOrigin = "0 0";
  }

  if (vp && vp._zoomPanBound) return;
  if (vp) vp._zoomPanBound = true;

  if (btnZoomIn) btnZoomIn.addEventListener("click", () => setZoom(State.zoom * 1.2));
  if (btnZoomOut) btnZoomOut.addEventListener("click", () => setZoom(State.zoom / 1.2));
  if (btnZoomFit) btnZoomFit.addEventListener("click", () => fitViewport("fit"));
  if (btnZoomInFloat) btnZoomInFloat.addEventListener("click", () => setZoom(State.zoom * 1.2));
  if (btnZoomOutFloat) btnZoomOutFloat.addEventListener("click", () => setZoom(State.zoom / 1.2));
  if (btnZoomFitFloat) btnZoomFitFloat.addEventListener("click", () => fitViewport("fit"));
  if (btnZoom100Float) btnZoom100Float.addEventListener("click", () => fitViewport("max"));
  if (btnZoomResetPan) {
    btnZoomResetPan.addEventListener("click", () => {
      if (typeof resetViewportDragStateFn === "function") resetViewportDragStateFn();
      const { cWidth, cHeight, baseWidth, baseHeight, fitScale } = getViewportMetrics();
      const curScale = (Number.isFinite(State.scale) && State.scale > 0) ? State.scale : fitScale;
      State.panX = (cWidth - baseWidth * curScale) / 2;
      State.panY = (cHeight - baseHeight * curScale) / 2;
      renderImpositionCanvas();
      showToast(State.lang === "en" ? "Sheet centered" : "Lankas sucentruotas", "info");
    });
  }
  if (btnRotateView) {
    btnRotateView.addEventListener("click", () => {
      State.viewRotation = ((State.viewRotation || 0) + 90) % 360;
      fitViewport(State.fitMode === "max" ? "max" : "fit");
      showToast((State.lang === "en" ? "View rotated: " : "Vaizdas pasuktas: ") + State.viewRotation + "°", "info");
    });
  }
  if (zoomSlider) {
    const onSliderChange = (e) => {
      if (isSyncingZoomUI) return;
      const val = parseFloat(e.target.value);
      if (Number.isFinite(val) && val > 0) {
        setZoom(val / 100);
      }
    };
    zoomSlider.addEventListener("input", onSliderChange);
    zoomSlider.addEventListener("change", onSliderChange);
  }

  if (!vp) return;

  const isFloatingUiTarget = (target) => {
    const el = target && target.nodeType === 1 ? target : target?.parentElement;
    if (!el || typeof el.closest !== "function") return false;
    return Boolean(el.closest("#floatingViewportControls") || el.closest("#dragDropOverlay") || el.closest("button") || el.closest("input"));
  };

  // 1. Wheel & Trackpad Pinch Zoom (normalized delta + exponential factor + cursor focal point)
  vp.addEventListener("wheel", (e) => {
    e.preventDefault();
    if (isFloatingUiTarget(e.target)) return;

    // Normalize event.deltaY across devices: 0 = pixel (trackpad), 1 = line (mouse wheel), 2 = page
    let deltaY = e.deltaY;
    if (e.deltaMode === 1) {
      deltaY *= 33;
    } else if (e.deltaMode === 2) {
      deltaY *= 300;
    }

    const clampedDelta = Math.max(-300, Math.min(300, deltaY));
    const zoomFactor = Math.exp(-clampedDelta * 0.0015);
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, State.zoom * zoomFactor));
    setZoom(newZoom, e.clientX, e.clientY);
  }, { passive: false });

  // 2. Unified Pointer & Mouse Pan + Focal Pinch Zoom + Slot Click Hit-Testing
  const activePointers = new Map();
  let isDragging = false;
  let dragStartX = 0, dragStartY = 0;
  let startPanX = 0, startPanY = 0;
  let maxTravelDist = 0;
  let downTimestamp = 0;
  let downOnCanvas = false;
  let prevPinchDist = 0;
  let prevPinchMidX = 0, prevPinchMidY = 0;
  let lastPointerEventTime = 0;
  let mouseFallbackDown = false;

  resetViewportDragStateFn = () => {
    activePointers.clear();
    isDragging = false;
    mouseFallbackDown = false;
    prevPinchDist = 0;
    maxTravelDist = 0;
    downOnCanvas = false;
    if (vp) {
      vp.classList.remove("cursor-grabbing");
      vp.classList.add("cursor-grab");
    }
  };

  const beginSingleDrag = (clientX, clientY, target) => {
    isDragging = false;
    maxTravelDist = 0;
    dragStartX = clientX;
    dragStartY = clientY;
    startPanX = Number.isFinite(State.panX) ? State.panX : 0;
    startPanY = Number.isFinite(State.panY) ? State.panY : 0;
    downTimestamp = Date.now();
    downOnCanvas = (target === canvas) || Boolean(target && target.id === "impositionCanvas");
  };

  const updateSingleDrag = (clientX, clientY) => {
    const dx = clientX - dragStartX;
    const dy = clientY - dragStartY;
    const dist = Math.hypot(dx, dy);
    if (dist > maxTravelDist) maxTravelDist = dist;

    if (dist > 4) {
      isDragging = true;
      vp.classList.remove("cursor-grab");
      vp.classList.add("cursor-grabbing");
      State.panX = startPanX + dx;
      State.panY = startPanY + dy;
      State.fitMode = "manual";
      renderImpositionCanvas();
    }
  };

  const finishSingleInteraction = (clientX, clientY) => {
    vp.classList.remove("cursor-grabbing");
    vp.classList.add("cursor-grab");
    const wasCleanClick = !isDragging && maxTravelDist <= 7 && (Date.now() - downTimestamp) < 600;
    isDragging = false;

    if (wasCleanClick && downOnCanvas && canvas) {
      const r = canvas.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        const x = (clientX - r.left) * (canvas.width / r.width);
        const y = (clientY - r.top) * (canvas.height / r.height);
        handleSlotHitTest(x, y, r);
      }
    }
    downOnCanvas = false;
  };

  vp.addEventListener("pointerdown", (e) => {
    if (e.button !== undefined && e.button !== 0 && e.pointerType === "mouse") return;
    if (isFloatingUiTarget(e.target)) return;
    lastPointerEventTime = Date.now();

    const pId = e.pointerId !== undefined ? e.pointerId : 1;
    activePointers.set(pId, { x: e.clientX, y: e.clientY });

    if (typeof vp.setPointerCapture === "function" && e.pointerId !== undefined) {
      try { vp.setPointerCapture(e.pointerId); } catch (_) {}
    }

    if (activePointers.size === 1) {
      prevPinchDist = 0;
      beginSingleDrag(e.clientX, e.clientY, e.target);
    } else if (activePointers.size === 2) {
      isDragging = true;
      maxTravelDist = 999;
      const pts = Array.from(activePointers.values());
      prevPinchDist = Math.max(10, Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y));
      prevPinchMidX = (pts[0].x + pts[1].x) / 2;
      prevPinchMidY = (pts[0].y + pts[1].y) / 2;
    }
  });

  window.addEventListener("pointermove", (e) => {
    const pId = e.pointerId !== undefined ? e.pointerId : 1;
    if (!activePointers.has(pId)) return;
    lastPointerEventTime = Date.now();
    activePointers.set(pId, { x: e.clientX, y: e.clientY });

    if (activePointers.size === 1 && prevPinchDist === 0) {
      updateSingleDrag(e.clientX, e.clientY);
    } else if (activePointers.size >= 2 && prevPinchDist > 0) {
      const pts = Array.from(activePointers.values());
      const curDist = Math.max(10, Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y));
      const midX = (pts[0].x + pts[1].x) / 2;
      const midY = (pts[0].y + pts[1].y) / 2;
      State.panX = (State.panX || 0) + (midX - prevPinchMidX);
      State.panY = (State.panY || 0) + (midY - prevPinchMidY);
      const zoomFactor = curDist / prevPinchDist;
      prevPinchDist = curDist;
      prevPinchMidX = midX;
      prevPinchMidY = midY;
      setZoom(State.zoom * zoomFactor, midX, midY);
    }
  });

  const handlePointerEnd = (e) => {
    const pId = e.pointerId !== undefined ? e.pointerId : 1;
    if (!activePointers.has(pId)) return;
    lastPointerEventTime = Date.now();
    activePointers.delete(pId);

    if (typeof vp.releasePointerCapture === "function" && e.pointerId !== undefined) {
      try { vp.releasePointerCapture(e.pointerId); } catch (_) {}
    }

    if (activePointers.size === 0) {
      if (prevPinchDist === 0 && e.type !== "pointercancel") {
        finishSingleInteraction(e.clientX, e.clientY);
      } else {
        vp.classList.remove("cursor-grabbing");
        vp.classList.add("cursor-grab");
        isDragging = false;
      }
      prevPinchDist = 0;
    } else if (activePointers.size === 1) {
      const remaining = Array.from(activePointers.values())[0];
      prevPinchDist = 0;
      dragStartX = remaining.x;
      dragStartY = remaining.y;
      startPanX = State.panX || 0;
      startPanY = State.panY || 0;
    }
  };

  window.addEventListener("pointerup", handlePointerEnd);
  window.addEventListener("pointercancel", handlePointerEnd);

  // 3. Mouse Fallback (for environments dispatching mousedown/mousemove/mouseup without pointer events)
  vp.addEventListener("mousedown", (e) => {
    if (Date.now() - lastPointerEventTime < 500) return;
    if (e.button !== 0 || isFloatingUiTarget(e.target)) return;
    mouseFallbackDown = true;
    beginSingleDrag(e.clientX, e.clientY, e.target);
  });
  window.addEventListener("mousemove", (e) => {
    if (!mouseFallbackDown) return;
    updateSingleDrag(e.clientX, e.clientY);
  });
  window.addEventListener("mouseup", (e) => {
    if (!mouseFallbackDown) return;
    mouseFallbackDown = false;
    finishSingleInteraction(e.clientX, e.clientY);
  });

  // 4. Touch Fallback (for mobile browsers dispatching touchstart/touchmove/touchend)
  vp.addEventListener("touchstart", (e) => {
    if (Date.now() - lastPointerEventTime < 500) return;
    if (isFloatingUiTarget(e.target)) return;
    if (e.touches.length === 2) {
      prevPinchDist = Math.max(10, Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      ));
      prevPinchMidX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      prevPinchMidY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    } else if (e.touches.length === 1) {
      beginSingleDrag(e.touches[0].clientX, e.touches[0].clientY, e.target);
    }
  }, { passive: true });

  vp.addEventListener("touchmove", (e) => {
    if (Date.now() - lastPointerEventTime < 500) return;
    if (e.touches.length === 2 && prevPinchDist > 0) {
      const currentDist = Math.max(10, Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      ));
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      State.panX = (State.panX || 0) + (midX - prevPinchMidX);
      State.panY = (State.panY || 0) + (midY - prevPinchMidY);
      const zoomFactor = currentDist / prevPinchDist;
      prevPinchDist = currentDist;
      prevPinchMidX = midX;
      prevPinchMidY = midY;
      setZoom(State.zoom * zoomFactor, midX, midY);
    } else if (e.touches.length === 1 && prevPinchDist === 0) {
      updateSingleDrag(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: true });

  vp.addEventListener("touchend", (e) => {
    if (Date.now() - lastPointerEventTime < 500) return;
    if (e.touches.length === 0) {
      if (prevPinchDist === 0 && e.changedTouches && e.changedTouches[0]) {
        finishSingleInteraction(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
      }
      prevPinchDist = 0;
    }
  });
}

let lastSlotModalOpenTime = 0;

/**
 * Accurately detects clicked grid slot on canvas accounting for devicePixelRatio,
 * container bounding rect, zoom scale, panning, view rotation, slot rotation (90°/270°), and manual X/Y offsets.
 */
function handleSlotHitTest(xOrClientX, yOrClientY, r) {
  const now = Date.now();
  if (now - lastSlotModalOpenTime < 180) return false;

  const { canvas, container, cWidth, cHeight, baseWidth, baseHeight, fitScale } = getViewportMetrics();
  if (!canvas || !container) return false;

  const isDomRect = r && typeof r.left === 'number' && typeof r.width === 'number' && typeof r.getBoundingClientRect !== 'function';
  const rect = isDomRect ? r : canvas.getBoundingClientRect();
  if (cWidth < 10 || cHeight < 10 || rect.width < 10 || rect.height < 10) return false;

  let x, y;
  if (isDomRect) {
    x = xOrClientX;
    y = yOrClientY;
  } else {
    x = (xOrClientX - rect.left) * (canvas.width / rect.width);
    y = (yOrClientY - rect.top) * (canvas.height / rect.height);
  }

  // Convert raw canvas (x, y) to CSS pixel space
  const dprX = canvas.width / cWidth;
  const dprY = canvas.height / cHeight;
  let normX = x / dprX;
  let normY = y / dprY;

  const mmToPx = (Number.isFinite(State.scale) && State.scale > 0) ? State.scale : (fitScale * (State.zoom || 1.0));
  const boxW = baseWidth * mmToPx;
  const boxH = baseHeight * mmToPx;
  const panX = Number.isFinite(State.panX) ? State.panX : (cWidth - boxW) / 2;
  const panY = Number.isFinite(State.panY) ? State.panY : (cHeight - boxH) / 2;
  const sheetCenterX = panX + boxW / 2;
  const sheetCenterY = panY + boxH / 2;

  // Invert view rotation around sheetCenter if rotated
  if (State.viewRotation) {
    const rotated = screenDeltaToSheetPanDelta(normX - sheetCenterX, normY - sheetCenterY);
    normX = sheetCenterX + rotated.dx;
    normY = sheetCenterY + rotated.dy;
  }

  const drawW = State.sheetWidth * mmToPx;
  const drawH = State.sheetHeight * mmToPx;
  const drawX = sheetCenterX - drawW / 2;
  const drawY = sheetCenterY - drawH / 2;

  // Convert canvas coords (normX, normY) to press sheet coords in millimeters
  const sheetX = (normX - drawX) / mmToPx;
  const sheetY = (normY - drawY) / mmToPx;

  let matchedSlot = null;

  // Pass 1: Check actual rotated + offset Trim Boxes (topmost slot wins if overlapping)
  for (let rowIdx = State.rows - 1; rowIdx >= 0 && !matchedSlot; rowIdx--) {
    for (let colIdx = State.cols - 1; colIdx >= 0 && !matchedSlot; colIdx--) {
      const geom = getSlotGeometry(colIdx, rowIdx, State.currentSide, State.currentSheetIndex);
      if (
        sheetX >= geom.trimX_mm &&
        sheetX <= (geom.trimX_mm + geom.trimW_mm) &&
        sheetY >= geom.trimY_mm &&
        sheetY <= (geom.trimY_mm + geom.trimH_mm)
      ) {
        matchedSlot = { col: colIdx, row: rowIdx };
      }
    }
  }

  // Pass 2: Fallback to base grid cell if click was outside shifted/rotated trim box
  if (!matchedSlot) {
    for (let rowIdx = 0; rowIdx < State.rows && !matchedSlot; rowIdx++) {
      for (let colIdx = 0; colIdx < State.cols && !matchedSlot; colIdx++) {
        const geom = getSlotGeometry(colIdx, rowIdx, State.currentSide, State.currentSheetIndex);
        if (
          sheetX >= geom.cellX_mm &&
          sheetX <= (geom.cellX_mm + geom.cellW_mm) &&
          sheetY >= geom.cellY_mm &&
          sheetY <= (geom.cellY_mm + geom.cellH_mm)
        ) {
          matchedSlot = { col: colIdx, row: rowIdx };
        }
      }
    }
  }

  if (matchedSlot) {
    lastSlotModalOpenTime = now;
    if (State.mode !== 'manual') {
      const prevMode = State.mode;
      seedManualSlotsFromAuto(prevMode, false);
      State.lastAutoMode = prevMode;
      State.mode = 'manual';
      if (window.UI && UI.selectMode) UI.selectMode.value = 'manual';
      updateStatusBadge();
      updateSheetNavigationUI();
      renderImpositionCanvas();
    }
    openSlotModalForCell(matchedSlot.col, matchedSlot.row);
    return true;
  }
  return false;
}

/**
 * Opens slot editing modal (#slotEditModal) for a specific cell.
 */
function openSlotModalForCell(c, r) {
  const key = c + "_" + r + "_" + State.currentSide + "_" + State.currentSheetIndex;
  State.activeEditingSlot = { col: c, row: r, side: State.currentSide, sheetIndex: State.currentSheetIndex, key: key };
  const slotInfo = getCellSlotInfo(c, r, State.currentSide, State.currentSheetIndex);

  const slotTitle = document.getElementById("slotModalTitle");
  if (slotTitle) {
    const isEn = State.lang === "en";
    const sideName = State.currentSide === "front" ? (isEn ? "Front" : "Priekis") : (isEn ? "Back" : "Nugara");
    slotTitle.innerHTML = '<i class="fa-solid fa-square-pen text-amber-400"></i> ' +
      (isEn ? "Slot" : "Langelis") + " [" + (c + 1) + "×" + (r + 1) + "] — " + sideName + " (" + (State.currentSheetIndex + 1) + "/" + State.totalSheets + ")";
  }

  const pageInput = document.getElementById("inputSlotPageNum");
  if (pageInput) {
    pageInput.value = (slotInfo.page !== null && slotInfo.page !== undefined) ? slotInfo.page : "";
    setTimeout(() => {
      pageInput.focus();
      pageInput.select();
    }, 50);
  }

  const offXInput = document.getElementById("inputSlotOffsetX");
  if (offXInput) offXInput.value = slotInfo.offsetX || 0;
  const offYInput = document.getElementById("inputSlotOffsetY");
  if (offYInput) offYInput.value = slotInfo.offsetY || 0;

  const swapSelect = document.getElementById("selectSwapTargetSlot");
  if (swapSelect) {
    swapSelect.innerHTML = "";
    for (let rr = 0; rr < State.rows; rr++) {
      for (let cc = 0; cc < State.cols; cc++) {
        if (cc === c && rr === r) continue;
        const targetInfo = getCellSlotInfo(cc, rr, State.currentSide, State.currentSheetIndex);
        const opt = document.createElement("option");
        opt.value = `${cc}_${rr}`;
        const pTxt = targetInfo.page !== null ? `P.${targetInfo.page}` : (State.lang === "en" ? "Empty" : "Tuščias");
        opt.textContent = `[${cc + 1}×${rr + 1}] (${pTxt}, ${targetInfo.rotation || 0}°)`;
        swapSelect.appendChild(opt);
      }
    }
  }

  const activeRot = normalizeRotationAngle(slotInfo.rotation || 0);
  document.querySelectorAll(".btn-slot-rot").forEach(btn => {
    const btnRot = parseInt(btn.getAttribute("data-rot"), 10) || 0;
    if (btnRot === activeRot) {
      btn.className = "btn-slot-rot px-2 py-1.5 rounded-lg border border-amber-400 text-xs font-mono font-bold transition cursor-pointer text-center bg-amber-500 text-zinc-950 shadow";
    } else {
      btn.className = "btn-slot-rot px-2 py-1.5 rounded-lg border border-zinc-700 text-xs font-mono font-bold transition cursor-pointer text-center bg-zinc-800 text-zinc-300 hover:text-white";
    }
  });

  const modal = document.getElementById("slotEditModal");
  if (modal) {
    modal.classList.remove("hidden");
    modal.style.display = "flex";
  }
}
