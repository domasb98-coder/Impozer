// =============================================================
// IMPOZITOR PRO - js/canvas.js
// High-Precision HTML5 Canvas Rendering Engine & Zoom/Pan System
// =============================================================

/**
 * Calculates page number for a given cell position based on active imposition mode.
 */
function getCellPageNumber(col, row, side, sheetIndex) {
  if (State.mode === 'manual' && State.manualSlots) {
    const key = `${col}_${row}_${side}_${sheetIndex}`;
    if (State.manualSlots[key] !== undefined) {
      const slot = State.manualSlots[key];
      return (typeof slot === 'object' && slot !== null) ? slot.page : slot;
    }
  }

  const cellsPerSheet = State.cols * State.rows;
  const sIndex = sheetIndex;

  if (State.mode === 'booklet' || State.mode === 'signatures') {
    const effColBooklet = (State.printStyle === 'workandturn' && side === 'back')
      ? (State.cols - 1 - col)
      : col;
    const pagesPerSheet = Math.max(4, cellsPerSheet * 2);
    const paddedCount = Math.max(pagesPerSheet, Math.ceil(State.docPageCount / pagesPerSheet) * pagesPerSheet);
    const pairIndex = row * Math.max(1, Math.floor(State.cols / 2)) + Math.floor(effColBooklet / 2);
    const isRightPageOfSpread = (effColBooklet % 2) === 1;
    const spreadOffset = (sIndex * Math.max(1, Math.floor(cellsPerSheet / 2)) + pairIndex) * 2;

    if (side === 'front') {
      const left = paddedCount - spreadOffset;
      const right = 1 + spreadOffset;
      const p = isRightPageOfSpread ? right : left;
      return (p >= 1 && p <= State.docPageCount) ? p : null;
    } else {
      const left = 2 + spreadOffset;
      const right = paddedCount - 1 - spreadOffset;
      const p = isRightPageOfSpread ? right : left;
      return (p >= 1 && p <= State.docPageCount) ? p : null;
    }
  }

  // Work-and-turn & duplex back-side mirroring
  const effCol = (State.printStyle !== 'single' && side === 'back')
    ? (State.cols - 1 - col)
    : col;

  if (State.mode === 'cutstack') {
    const cellIndex = row * State.cols + effCol;
    let pNum = (State.printStyle === 'single')
      ? 1 + sIndex + (cellIndex * State.totalSheets)
      : 1 + (sIndex * 2) + (side === 'front' ? 0 : 1) + (cellIndex * State.totalSheets * 2);
    return pNum <= State.docPageCount ? pNum : null;
  }

  if (State.duplicatePages) {
    let pNum = (State.printStyle === 'single' || State.printStyle === 'workandturn')
      ? sIndex + 1
      : (sIndex * 2) + (side === 'front' ? 1 : 2);
    if (pNum > State.docPageCount && State.docPageCount === 1) pNum = 1;
    return pNum <= State.docPageCount ? pNum : null;
  } else {
    const cellIndex = row * State.cols + effCol;
    let pNum = (State.printStyle === 'single')
      ? 1 + (sIndex * cellsPerSheet) + cellIndex
      : (sIndex * cellsPerSheet + cellIndex) * 2 + (side === 'front' ? 1 : 2);
    return pNum <= State.docPageCount ? pNum : null;
  }
}

/**
 * Calculates saddle-stitch paper creep compensation per sheet.
 */
function getCellCreepOffsetMm(col) {
  if ((State.mode !== 'booklet' && State.mode !== 'signatures') || State.creepMm <= 0 || State.totalSheets <= 1) {
    return 0;
  }
  const factor = State.currentSheetIndex / Math.max(1, State.totalSheets - 1);
  const shift = State.creepMm * factor;
  return (col % 2 === 0) ? shift : -shift;
}

/**
 * Calculates individual cell bleed boundaries respecting gutters and spine folds.
 */
function getCellBleed(col, row) {
  let top = State.bleedAsymmetric ? State.bleedTop : State.bleedMm;
  let bottom = State.bleedAsymmetric ? State.bleedBottom : State.bleedMm;
  let left = State.bleedAsymmetric ? State.bleedLeft : State.bleedMm;
  let right = State.bleedAsymmetric ? State.bleedRight : State.bleedMm;

  if ((State.mode === 'booklet' || State.mode === 'signatures') && State.cols >= 2 && State.bookletZeroSpineBleed) {
    if (col % 2 === 0) right = 0;
    if (col % 2 === 1) left = 0;
  }

  if (State.clipBleedToGutter) {
    const maxHalfX = State.gutterX > 0 ? State.gutterX / 2 : Infinity;
    const maxHalfY = State.gutterY > 0 ? State.gutterY / 2 : Infinity;
    if (col > 0) left = Math.min(left, maxHalfX);
    if (col < State.cols - 1) right = Math.min(right, maxHalfX);
    if (row > 0) top = Math.min(top, maxHalfY);
    if (row < State.rows - 1) bottom = Math.min(bottom, maxHalfY);
  }

  return { top, bottom, left, right };
}

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
 */
function drawImposedPage(ctx, x, y, w, h, pageNum, bleed, mmToPx, cellIndex = 0, isRotated = undefined) {
  const pageData = State.docPages.find(p => p.pageNumber === pageNum) || { pageNumber: pageNum, accentHue: (pageNum * 37) % 360 };
  const bTop = bleed.top * mmToPx;
  const bBottom = bleed.bottom * mmToPx;
  const bLeft = bleed.left * mmToPx;
  const bRight = bleed.right * mmToPx;
  const hasBleed = (bTop > 0 || bBottom > 0 || bLeft > 0 || bRight > 0);
  const cachedImg = State.pageRenderCache[pageNum];
  const pageRot = isRotated !== undefined ? isRotated : State.pageRotated;

  if (cachedImg) {
    if (hasBleed && State.bleedArtwork) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x - bLeft, y - bTop, w + bLeft + bRight, h + bTop + bBottom);
      ctx.clip();
      if (pageRot) {
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
    if (pageRot) {
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
    const cellTag = State.duplicatePages ? (`${t('Item')} ${cellIndex + 1}`) : `P.${pageNum}`;
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
  const topTitle = State.duplicatePages 
    ? (`${t('Item')} #${cellIndex + 1}`) 
    : (`${t('Page')} ${pageNum}`);
  ctx.fillText(topTitle, x + 5, y + Math.min(12, h * 0.08));

  ctx.fillStyle = `hsl(${pageData.accentHue}, 60%, 25%)`;
  ctx.font = `bold ${Math.min(w * 0.3, 34)}px JetBrains Mono, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(State.duplicatePages ? `#${cellIndex + 1}` : pageNum, x + w / 2, y + h / 2);

  ctx.fillStyle = 'rgba(82, 82, 91, 0.28)';
  const lineCount = 4;
  const lineSpacing = Math.min(8, h * 0.05);
  const startLineY = y + h / 2 + Math.min(20, h * 0.15);
  for (let i = 0; i < lineCount; i++) {
    const lineY = startLineY + i * lineSpacing;
    if (lineY + 4 < y + h - 8) ctx.fillRect(x + 10, lineY, w - 20, 3);
  }
  ctx.textBaseline = 'alphabetic';
}

/**
 * Main Imposition Canvas Rendering Loop.
 */
function renderImpositionCanvas() {
  ensureVisibleSheetPagesRendered();

  const canvas = window.UI ? UI.impositionCanvas : document.getElementById('impositionCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const container = window.UI ? UI.viewportContainer : document.getElementById('viewportContainer');
  if (!container) return;

  const cWidth = container.clientWidth;
  const cHeight = container.clientHeight;
  if (cWidth < 10 || cHeight < 10) return;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = cWidth * dpr;
  canvas.height = cHeight * dpr;
  canvas.style.width = `${cWidth}px`;
  canvas.style.height = `${cHeight}px`;

  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, cWidth, cHeight);

  if (State.viewRotation) {
    ctx.translate(cWidth / 2, cHeight / 2);
    ctx.rotate((State.viewRotation * Math.PI) / 180);
    ctx.translate(-cWidth / 2, -cHeight / 2);
  }

  const marginPx = 14;
  const availW = Math.max(50, cWidth - marginPx * 2);
  const availH = Math.max(50, cHeight - marginPx * 2);
  const sheetAspect = State.sheetWidth / State.sheetHeight;

  let drawW, drawH;
  if (availW / availH > sheetAspect) {
    drawH = availH * State.zoom;
    drawW = drawH * sheetAspect;
  } else {
    drawW = availW * State.zoom;
    drawH = drawW / sheetAspect;
  }

  const drawX = (cWidth - drawW) / 2 + State.panX;
  const drawY = (cHeight - drawH) / 2 + State.panY;
  const mmToPx = drawW / State.sheetWidth;

  // 1. Spaudos popieriaus lankas
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(drawX, drawY, drawW, drawH);
  ctx.strokeStyle = '#a1a1aa';
  ctx.lineWidth = 1;
  ctx.strokeRect(drawX, drawY, drawW, drawH);

  // 2. Tikros 1:1 gaminio proporcijos
  const isRot = Boolean(State.pageRotation === 90 || State.pageRotated);
  const pageW_mm = isRot ? State.sourcePageHeight : State.sourcePageWidth;
  const pageH_mm = isRot ? State.sourcePageWidth : State.sourcePageHeight;
  const cellW = pageW_mm * mmToPx;
  const cellH = pageH_mm * mmToPx;
  const gutterXPx = State.gutterX * mmToPx;
  const gutterYPx = State.gutterY * mmToPx;

  const totalGridW_mm = State.cols * pageW_mm + (State.cols - 1) * State.gutterX;
  const totalGridH_mm = State.rows * pageH_mm + (State.rows - 1) * State.gutterY;

  let startOffsetX_mm, startOffsetY_mm;
  if (State.autoCenter) {
    startOffsetX_mm = (State.sheetWidth - totalGridW_mm) / 2;
    startOffsetY_mm = (State.sheetHeight - totalGridH_mm) / 2;
    if (window.UI && UI.inputMarginSide && document.activeElement !== UI.inputMarginSide) {
      UI.inputMarginSide.value = Math.max(0, Math.round(startOffsetX_mm * 10) / 10);
    }
    if (window.UI && UI.inputMarginTop && document.activeElement !== UI.inputMarginTop) {
      UI.inputMarginTop.value = Math.max(0, Math.round(startOffsetY_mm * 10) / 10);
    }
  } else {
    startOffsetX_mm = State.marginSide;
    startOffsetY_mm = State.marginTop;
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

  // 3. Grid Cells Rendering
  for (let r = 0; r < State.rows; r++) {
    for (let c = 0; c < State.cols; c++) {
      const creepShiftPx = getCellCreepOffsetMm(c) * mmToPx;
      const posX = startXPx + c * (cellW + gutterXPx) + creepShiftPx;
      const posY = startYPx + r * (cellH + gutterYPx);

      const slotInfo = getCellSlotInfo(c, r, State.currentSide, State.currentSheetIndex);
      const pageNum = slotInfo.page;
      const slotRot = slotInfo.rot || 0;
      const cellBleed = getCellBleed(c, r);

      if (State.viewCutSheet) {
        if (pageNum !== null) {
          const cutOffPx = State.cutOffsetMm * mmToPx;
          ctx.strokeStyle = '#e4e4e7';
          ctx.lineWidth = 0.5;
          ctx.setLineDash([2, 2]);
          ctx.strokeRect(posX, posY, cellW, cellH);
          ctx.setLineDash([]);

          ctx.strokeStyle = '#d946ef';
          ctx.lineWidth = Math.max(1, 1.2 * (mmToPx / 2.834));
          ctx.strokeRect(posX - cutOffPx, posY - cutOffPx, cellW + cutOffPx * 2, cellH + cutOffPx * 2);

          ctx.fillStyle = '#a855f7';
          ctx.font = 'bold 9px JetBrains Mono, monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`CUT (${State.cutOffsetMm >= 0 ? '+' : ''}${State.cutOffsetMm}mm)`, posX + cellW / 2, posY + cellH / 2);
        }
      } else {
        if (pageNum !== null) {
          const effColForIdx = (State.printStyle !== 'single' && State.currentSide === 'back' && State.mode !== 'booklet' && State.mode !== 'signatures')
            ? (State.cols - 1 - c) : c;
          const cellIdx = r * State.cols + effColForIdx;

          ctx.save();
          // Individual slot rotation (e.g. 180° Head-to-Head)
          if (slotRot !== 0) {
            const centerX = posX + cellW / 2;
            const centerY = posY + cellH / 2;
            ctx.translate(centerX, centerY);
            ctx.rotate((slotRot * Math.PI) / 180);
            ctx.translate(-centerX, -centerY);
          }

          drawImposedPage(ctx, posX, posY, cellW, cellH, pageNum, cellBleed, mmToPx, cellIdx);

          if (State.cutContourEnabled) {
            renderContourCutLine(ctx, posX, posY, cellW, cellH, mmToPx, State.cutOffsetMm, State.pageRenderCache[pageNum]);
          }
          ctx.restore();

          // In manual mode, display badge with assigned page & slot rotation
          if (State.mode === 'manual') {
            ctx.fillStyle = 'rgba(9, 10, 15, 0.85)';
            ctx.fillRect(posX, posY + cellH - 14, Math.min(56, cellW * 0.55), 14);
            ctx.fillStyle = '#f59e0b';
            ctx.font = 'bold 8px JetBrains Mono, monospace';
            ctx.textAlign = 'left';
            ctx.fillText(`P.${pageNum}${slotRot ? ` ${slotRot}°` : ''}`, posX + 3, posY + cellH - 4);
          }
        } else {
          // Empty slot (TUŠČIAS / BLANK)
          ctx.fillStyle = '#18181b';
          ctx.fillRect(posX, posY, cellW, cellH);
          ctx.strokeStyle = '#3f3f46';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(posX, posY, cellW, cellH);
          ctx.setLineDash([]);

          ctx.fillStyle = '#71717a';
          ctx.font = 'bold 10px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(t('Empty'), posX + cellW / 2, posY + cellH / 2);
          ctx.textBaseline = 'alphabetic';

          if (State.mode === 'manual') {
            ctx.fillStyle = '#f59e0b';
            ctx.font = '7px JetBrains Mono, monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`[${c + 1}×${r + 1}]`, posX + cellW / 2, posY + cellH / 2 + 12);
          }
        }

        if (State.cropMarks && pageNum !== null) {
          drawCropMarks(ctx, posX, posY, cellW, cellH, mmToPx, c, r, cellBleed, pageNum);
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
    if (State.centerMarks) drawSheetCenterMarks(ctx, drawX, drawY, drawW, drawH, mmToPx);
    if (State.foldMarks && (State.mode === 'booklet' || State.mode === 'signatures') && State.cols >= 2) {
      for (let c = 1; c < State.cols; c += 2) {
        const spineX = startXPx + c * cellW + (c - 1) * gutterXPx + gutterXPx / 2;
        drawSpineFoldMarks(ctx, spineX, startYPx, gridHPx, mmToPx);
      }
    }
    if (State.collatingMarks && (State.mode === 'booklet' || State.mode === 'signatures') && State.cols >= 2) {
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

/**
 * Zoom level setter with UI synchronization.
 */
function setZoom(newZoom) {
  State.zoom = Math.max(0.2, Math.min(3.5, newZoom));
  const pct = Math.round(State.zoom * 100);
  if (window.UI) {
    if (UI.zoomLevelDisplay) UI.zoomLevelDisplay.textContent = `${pct}%`;
    if (UI.zoomSlider) UI.zoomSlider.value = pct;
  }
  renderImpositionCanvas();
}

/**
 * Resets pan offsets and fits sheet to container.
 */
function resetPanAndFit() {
  State.panX = 0;
  State.panY = 0;
  setZoom(0.92);
}

/**
 * Sets up interactive zoom, pan gestures, and fixed manual slot click hit-testing.
 */
function setupZoomAndPanHandlers() {
  if (window.UI) {
    if (UI.btnZoomIn) UI.btnZoomIn.addEventListener('click', () => setZoom(State.zoom + 0.1));
    if (UI.btnZoomOut) UI.btnZoomOut.addEventListener('click', () => setZoom(State.zoom - 0.1));
    if (UI.btnZoomFit) UI.btnZoomFit.addEventListener('click', resetPanAndFit);
    if (UI.btnZoomInFloat) UI.btnZoomInFloat.addEventListener('click', () => setZoom(State.zoom + 0.1));
    if (UI.btnZoomOutFloat) UI.btnZoomOutFloat.addEventListener('click', () => setZoom(State.zoom - 0.1));
    if (UI.btnZoomFitFloat) UI.btnZoomFitFloat.addEventListener('click', resetPanAndFit);
    if (UI.btnZoom100Float) UI.btnZoom100Float.addEventListener('click', () => setZoom(1.0));
    if (UI.btnZoomResetPan) {
      UI.btnZoomResetPan.addEventListener('click', () => {
        State.panX = 0; State.panY = 0;
        renderImpositionCanvas();
      });
    }
    if (UI.btnRotateView) {
      UI.btnRotateView.addEventListener('click', () => {
        State.viewRotation = (State.viewRotation + 90) % 360;
        renderImpositionCanvas();
        showToast(`Vaizdas pasuktas: ${State.viewRotation}°`);
      });
    }
    if (UI.zoomSlider) {
      UI.zoomSlider.addEventListener('input', (e) => setZoom(parseFloat(e.target.value) / 100));
    }
  }

  let isDragging = false;
  let startX = 0, startY = 0;
  let startPanX = 0, startPanY = 0;
  let hasMovedSignificantly = false;
  let initialPinchDist = 0, initialZoom = 0.92;

  const vp = window.UI ? UI.viewportContainer : document.getElementById('viewportContainer');
  if (vp) {
    vp.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      setZoom(State.zoom * zoomFactor);
    }, { passive: false });

    vp.addEventListener('mousedown', (e) => {
      if (e.target.closest('#dragDropOverlay') || e.target.closest('.absolute.bottom-2')) return;
      isDragging = true;
      hasMovedSignificantly = false;
      startX = e.clientX;
      startY = e.clientY;
      startPanX = State.panX;
      startPanY = State.panY;
      vp.classList.remove('cursor-grab');
      vp.classList.add('cursor-grabbing');
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.hypot(dx, dy) > 4) {
        hasMovedSignificantly = true;
      }
      State.panX = startPanX + dx;
      State.panY = startPanY + dy;
      renderImpositionCanvas();
    });

    window.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        vp.classList.remove('cursor-grabbing');
        vp.classList.add('cursor-grab');
      }
    });

    vp.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        isDragging = true;
        hasMovedSignificantly = false;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        startPanX = State.panX;
        startPanY = State.panY;
      } else if (e.touches.length === 2) {
        isDragging = false;
        initialPinchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        initialZoom = State.zoom;
      }
    }, { passive: true });

    vp.addEventListener('touchmove', (e) => {
      if (isDragging && e.touches.length === 1) {
        const dx = e.touches[0].clientX - startX;
        const dy = e.touches[0].clientY - startY;
        if (Math.hypot(dx, dy) > 4) {
          hasMovedSignificantly = true;
        }
        State.panX = startPanX + dx;
        State.panY = startPanY + dy;
        renderImpositionCanvas();
      } else if (e.touches.length === 2 && initialPinchDist > 0) {
        const currentDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        setZoom(initialZoom * (currentDist / initialPinchDist));
      }
    }, { passive: true });

    vp.addEventListener('touchend', (e) => {
      if (e.touches.length === 0) {
        isDragging = false;
        initialPinchDist = 0;
      }
    });
  }

  // FIXED CANVAS HIT-TESTING FOR MANUAL IMPOSITION MODE
  const canvas = window.UI ? UI.impositionCanvas : document.getElementById('impositionCanvas');
  if (canvas) {
    canvas.addEventListener('click', (e) => {
      // Do not handle slot click if user was dragging/panning
      if (hasMovedSignificantly) return;
      if (State.mode !== 'manual') return;

      const container = window.UI ? UI.viewportContainer : document.getElementById('viewportContainer');
      if (!container) return;

      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      const cWidth = container.clientWidth;
      const cHeight = container.clientHeight;

      // Handle view rotation transformation
      let normClickX = clickX;
      let normClickY = clickY;
      if (State.viewRotation) {
        const cx = cWidth / 2;
        const cy = cHeight / 2;
        const rad = (-State.viewRotation * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const dx = clickX - cx;
        const dy = clickY - cy;
        normClickX = cx + (dx * cos - dy * sin);
        normClickY = cy + (dx * sin + dy * cos);
      }

      const sheetAspect = State.sheetWidth / State.sheetHeight;
      const marginPx = 14;
      const availW = Math.max(50, cWidth - marginPx * 2);
      const availH = Math.max(50, cHeight - marginPx * 2);

      let drawW, drawH;
      if (availW / availH > sheetAspect) {
        drawH = availH * State.zoom;
        drawW = drawH * sheetAspect;
      } else {
        drawW = availW * State.zoom;
        drawH = drawW / sheetAspect;
      }

      const drawX = (cWidth - drawW) / 2 + State.panX;
      const drawY = (cHeight - drawH) / 2 + State.panY;
      const mmToPx = drawW / State.sheetWidth;

      const isRot = Boolean(State.pageRotation === 90 || State.pageRotated);
      const pageW_mm = isRot ? State.sourcePageHeight : State.sourcePageWidth;
      const pageH_mm = isRot ? State.sourcePageWidth : State.sourcePageHeight;
      const cellW = pageW_mm * mmToPx;
      const cellH = pageH_mm * mmToPx;
      const gutterXPx = State.gutterX * mmToPx;
      const gutterYPx = State.gutterY * mmToPx;

      const totalGridW_mm = State.cols * pageW_mm + (State.cols - 1) * State.gutterX;
      const totalGridH_mm = State.rows * pageH_mm + (State.rows - 1) * State.gutterY;

      const startOffsetX_mm = State.autoCenter ? (State.sheetWidth - totalGridW_mm) / 2 : State.marginSide;
      const startOffsetY_mm = State.autoCenter ? (State.sheetHeight - totalGridH_mm) / 2 : State.marginTop;

      const startXPx = drawX + startOffsetX_mm * mmToPx;
      const startYPx = drawY + startOffsetY_mm * mmToPx;

      for (let r = 0; r < State.rows; r++) {
        for (let c = 0; c < State.cols; c++) {
          const creepShiftPx = getCellCreepOffsetMm(c) * mmToPx;
          const posX = startXPx + c * (cellW + gutterXPx) + creepShiftPx;
          const posY = startYPx + r * (cellH + gutterYPx);

          if (normClickX >= posX && normClickX <= posX + cellW && normClickY >= posY && normClickY <= posY + cellH) {
            const key = `${c}_${r}_${State.currentSide}_${State.currentSheetIndex}`;
            State.activeEditingSlot = { col: c, row: r, side: State.currentSide, sheetIndex: State.currentSheetIndex, key };
            const slotInfo = getCellSlotInfo(c, r, State.currentSide, State.currentSheetIndex);

            const slotTitle = document.getElementById('slotModalTitle');
            if (slotTitle) {
              slotTitle.innerHTML = `<i class="fa-solid fa-square-pen text-amber-400"></i> ${t('Slot') || 'Langelis'} [${c + 1}×${r + 1}]`;
            }

            const pageInput = document.getElementById('inputSlotPageNum');
            if (pageInput) {
              pageInput.value = (slotInfo.page !== null && slotInfo.page !== undefined) ? slotInfo.page : '';
            }

            const activeRot = slotInfo.rot || 0;
            document.querySelectorAll('.btn-slot-rot').forEach(btn => {
              const btnRot = parseInt(btn.getAttribute('data-rot'), 10);
              if (btnRot === activeRot) {
                btn.className = 'btn-slot-rot px-2 py-1.5 rounded-lg border border-amber-400 text-xs font-mono font-bold transition cursor-pointer text-center bg-amber-500 text-zinc-950';
              } else {
                btn.className = 'btn-slot-rot px-2 py-1.5 rounded-lg border border-zinc-700 text-xs font-mono font-bold transition cursor-pointer text-center bg-zinc-800 text-zinc-300 hover:text-white';
              }
            });

            const modal = document.getElementById('slotEditModal');
            if (modal) modal.classList.remove('hidden');
            return;
          }
        }
      }
    });
  }
}
