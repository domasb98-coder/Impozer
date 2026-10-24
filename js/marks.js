// =============================================================
// IMPOZITOR PRO - js/marks.js
// High-Precision Prepress Marks Engine (Canvas & Vector PDF Parity)
// =============================================================

function drawCropMarks(ctx, x, y, w, h, mmToPx, colIndex, rowIndex, bleed, pageNum) {
  if (State.cutContourEnabled && State.plotterMarks) return;

  const isLeft = colIndex === 0;
  const isRight = colIndex === State.cols - 1;
  const isTop = rowIndex === 0;
  const isBottom = rowIndex === State.rows - 1;

  const isMinimal = (State.cropMarksMode === 'minimal' || State.cropStyle === 'perimeter');

  // Suppress all marks for internal cells ONLY in minimal/perimeter mode
  if (isMinimal && !isLeft && !isRight && !isTop && !isBottom) return;

  let markLen = (typeof State.cropLength === 'number' ? State.cropLength : 5) * mmToPx;
  const markOffset = (typeof State.cropOffset === 'number' ? State.cropOffset : 2) * mmToPx;
  if (State.cropStyle === 'ticks') markLen = 2.5 * mmToPx;

  const bL = (bleed.left || 0) * mmToPx;
  const bR = (bleed.right || 0) * mmToPx;
  const bT = (bleed.top || 0) * mmToPx;
  const bB = (bleed.bottom || 0) * mmToPx;

  // Prepress Mark Offset: marks start strictly beyond Bleed box
  const offL = bL + markOffset;
  const offR = bR + markOffset;
  const offT = bT + markOffset;
  const offB = bB + markOffset;

  ctx.strokeStyle = State.markInking === 'k100' ? '#18181b' : '#000000';
  ctx.lineWidth = Math.max(0.4, State.cropWeight * (mmToPx / 2.834));

  ctx.beginPath();

  if (isMinimal) {
    // Top perimeter ticks: extending upwards into margin
    if (isTop) {
      if (isLeft || State.gutterX > 0) {
        ctx.moveTo(x, y - offT);
        ctx.lineTo(x, y - offT - markLen);
      }
      ctx.moveTo(x + w, y - offT);
      ctx.lineTo(x + w, y - offT - markLen);
    }

    // Bottom perimeter ticks: extending downwards into margin
    if (isBottom) {
      if (isLeft || State.gutterX > 0) {
        ctx.moveTo(x, y + h + offB);
        ctx.lineTo(x, y + h + offB + markLen);
      }
      ctx.moveTo(x + w, y + h + offB);
      ctx.lineTo(x + w, y + h + offB + markLen);
    }

    // Left perimeter ticks: extending leftwards into margin
    if (isLeft) {
      if (isTop || State.gutterY > 0) {
        ctx.moveTo(x - offL, y);
        ctx.lineTo(x - offL - markLen, y);
      }
      ctx.moveTo(x - offL, y + h);
      ctx.lineTo(x - offL - markLen, y + h);
    }

    // Right perimeter ticks: extending rightwards into margin
    if (isRight) {
      if (isTop || State.gutterY > 0) {
        ctx.moveTo(x + w + offR, y);
        ctx.lineTo(x + w + offR + markLen, y);
      }
      ctx.moveTo(x + w + offR, y + h);
      ctx.lineTo(x + w + offR + markLen, y + h);
    }
  } else {
    // Full mode: draw corner marks for every individual cell/gutter
    const isBooklet = (State.mode === 'booklet' || State.mode === 'signatures') && State.cols >= 2;
    const isSpineRight = isBooklet && (colIndex % 2 === 0);
    const isSpineLeft = isBooklet && (colIndex % 2 === 1);

    if (!isSpineLeft) {
      ctx.moveTo(x - offL, y); ctx.lineTo(x - offL - markLen, y);
      ctx.moveTo(x - offL, y + h); ctx.lineTo(x - offL - markLen, y + h);
    }
    ctx.moveTo(x, y - offT); ctx.lineTo(x, y - offT - markLen);
    ctx.moveTo(x, y + h + offB); ctx.lineTo(x, y + h + offB + markLen);

    if (!isSpineRight) {
      ctx.moveTo(x + w + offR, y); ctx.lineTo(x + w + offR + markLen, y);
      ctx.moveTo(x + w + offR, y + h); ctx.lineTo(x + w + offR + markLen, y + h);
    }
    ctx.moveTo(x + w, y - offT); ctx.lineTo(x + w, y - offT - markLen);
    ctx.moveTo(x + w, y + h + offB); ctx.lineTo(x + w, y + h + offB + markLen);
  }

  ctx.stroke();

  if (State.pageLabels && pageNum !== null && (isMinimal ? (isTop && isLeft) : true)) {
    ctx.fillStyle = '#71717a';
    ctx.font = '5px JetBrains Mono, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`P.${pageNum}`, x - offL - 2, y - 2);
  }
}

function drawCropMarksToPdf(sheetPage, posX, posY, cellWPt, cellHPt, c, r, bLeftPt, bRightPt, bTopPt, bBottomPt, cropWeightPt, markColor, pageNum, mmToPt) {
  if (!State.cropMarks || (State.cutContourEnabled && State.plotterMarks)) return;

  const markOffsetPt = (typeof State.cropOffset === 'number' ? State.cropOffset : 2) * mmToPt;
  const markLenPt = (State.cropStyle === 'ticks' ? 2.5 : (typeof State.cropLength === 'number' ? State.cropLength : 5)) * mmToPt;

  // Prepress Mark Offset: marks start strictly beyond Bleed box
  const offLPt = bLeftPt + markOffsetPt;
  const offRPt = bRightPt + markOffsetPt;
  const offTPt = bTopPt + markOffsetPt;
  const offBPt = bBottomPt + markOffsetPt;

  if (State.cropMarksMode === 'minimal' || State.cropStyle === 'perimeter') {
    const isLeft = c === 0;
    const isRight = c === State.cols - 1;
    const isTop = r === 0;
    const isBottom = r === State.rows - 1;

    if (!isLeft && !isRight && !isTop && !isBottom) return;

    // Top perimeter ticks (extending UP)
    if (isTop) {
      if (isLeft || State.gutterX > 0) {
        sheetPage.drawLine({ start: { x: posX, y: posY + cellHPt + offTPt }, end: { x: posX, y: posY + cellHPt + offTPt + markLenPt }, thickness: cropWeightPt, color: markColor });
      }
      sheetPage.drawLine({ start: { x: posX + cellWPt, y: posY + cellHPt + offTPt }, end: { x: posX + cellWPt, y: posY + cellHPt + offTPt + markLenPt }, thickness: cropWeightPt, color: markColor });
    }
    // Bottom perimeter ticks (extending DOWN)
    if (isBottom) {
      if (isLeft || State.gutterX > 0) {
        sheetPage.drawLine({ start: { x: posX, y: posY - offBPt }, end: { x: posX, y: posY - offBPt - markLenPt }, thickness: cropWeightPt, color: markColor });
      }
      sheetPage.drawLine({ start: { x: posX + cellWPt, y: posY - offBPt }, end: { x: posX + cellWPt, y: posY - offBPt - markLenPt }, thickness: cropWeightPt, color: markColor });
    }
    // Left perimeter ticks (extending LEFT)
    if (isLeft) {
      if (isTop || State.gutterY > 0) {
        sheetPage.drawLine({ start: { x: posX - offLPt, y: posY + cellHPt }, end: { x: posX - offLPt - markLenPt, y: posY + cellHPt }, thickness: cropWeightPt, color: markColor });
      }
      sheetPage.drawLine({ start: { x: posX - offLPt, y: posY }, end: { x: posX - offLPt - markLenPt, y: posY }, thickness: cropWeightPt, color: markColor });
    }
    // Right perimeter ticks (extending RIGHT)
    if (isRight) {
      if (isTop || State.gutterY > 0) {
        sheetPage.drawLine({ start: { x: posX + cellWPt + offRPt, y: posY + cellHPt }, end: { x: posX + cellWPt + offRPt + markLenPt, y: posY + cellHPt }, thickness: cropWeightPt, color: markColor });
      }
      sheetPage.drawLine({ start: { x: posX + cellWPt + offRPt, y: posY }, end: { x: posX + cellWPt + offRPt + markLenPt, y: posY }, thickness: cropWeightPt, color: markColor });
    }
    if (State.pageLabels && isTop && isLeft) {
      sheetPage.drawText(`P.${pageNum}`, { x: Math.max(4, posX - offLPt - 16), y: posY + cellHPt + 2, size: 5, color: PDFLib.rgb(0.45, 0.45, 0.5) });
    }
    return;
  } else {
    const isBooklet = (State.mode === 'booklet' || State.mode === 'signatures') && State.cols >= 2;
    const isSpineRight = isBooklet && (c % 2 === 0);
    const isSpineLeft = isBooklet && (c % 2 === 1);

    if (!isSpineLeft) {
      sheetPage.drawLine({ start: { x: posX - offLPt, y: posY + cellHPt }, end: { x: posX - offLPt - markLenPt, y: posY + cellHPt }, thickness: cropWeightPt, color: markColor });
      sheetPage.drawLine({ start: { x: posX - offLPt, y: posY }, end: { x: posX - offLPt - markLenPt, y: posY }, thickness: cropWeightPt, color: markColor });
    }
    sheetPage.drawLine({ start: { x: posX, y: posY + cellHPt + offTPt }, end: { x: posX, y: posY + cellHPt + offTPt + markLenPt }, thickness: cropWeightPt, color: markColor });
    sheetPage.drawLine({ start: { x: posX, y: posY - offBPt }, end: { x: posX, y: posY - offBPt - markLenPt }, thickness: cropWeightPt, color: markColor });

    if (!isSpineRight) {
      sheetPage.drawLine({ start: { x: posX + cellWPt + offRPt, y: posY + cellHPt }, end: { x: posX + cellWPt + offRPt + markLenPt, y: posY + cellHPt }, thickness: cropWeightPt, color: markColor });
      sheetPage.drawLine({ start: { x: posX + cellWPt + offRPt, y: posY }, end: { x: posX + cellWPt + offRPt + markLenPt, y: posY }, thickness: cropWeightPt, color: markColor });
    }
    sheetPage.drawLine({ start: { x: posX + cellWPt, y: posY + cellHPt + offTPt }, end: { x: posX + cellWPt, y: posY + cellHPt + offTPt + markLenPt }, thickness: cropWeightPt, color: markColor });
    sheetPage.drawLine({ start: { x: posX + cellWPt, y: posY - offBPt }, end: { x: posX + cellWPt, y: posY - offBPt - markLenPt }, thickness: cropWeightPt, color: markColor });

    if (State.cropStyle === 'double') {
      if (bLeftPt > 0 || bTopPt > 0) {
        sheetPage.drawLine({ start: { x: posX - offLPt, y: posY + cellHPt + bTopPt }, end: { x: posX - offLPt - markLenPt, y: posY + cellHPt + bTopPt }, thickness: cropWeightPt, color: markColor });
        sheetPage.drawLine({ start: { x: posX - bLeftPt, y: posY + cellHPt + offTPt }, end: { x: posX - bLeftPt, y: posY + cellHPt + offTPt + markLenPt }, thickness: cropWeightPt, color: markColor });
      }
      if (bRightPt > 0 || bTopPt > 0) {
        sheetPage.drawLine({ start: { x: posX + cellWPt + offRPt, y: posY + cellHPt + bTopPt }, end: { x: posX + cellWPt + offRPt + markLenPt, y: posY + cellHPt + bTopPt }, thickness: cropWeightPt, color: markColor });
        sheetPage.drawLine({ start: { x: posX + cellWPt + bRightPt, y: posY + cellHPt + offTPt }, end: { x: posX + cellWPt + bRightPt, y: posY + cellHPt + offTPt + markLenPt }, thickness: cropWeightPt, color: markColor });
      }
      if (bLeftPt > 0 || bBottomPt > 0) {
        sheetPage.drawLine({ start: { x: posX - offLPt, y: posY - bBottomPt }, end: { x: posX - offLPt - markLenPt, y: posY - bBottomPt }, thickness: cropWeightPt, color: markColor });
        sheetPage.drawLine({ start: { x: posX - bLeftPt, y: posY - offBPt }, end: { x: posX - bLeftPt, y: posY - offBPt - markLenPt }, thickness: cropWeightPt, color: markColor });
      }
      if (bRightPt > 0 || bBottomPt > 0) {
        sheetPage.drawLine({ start: { x: posX + cellWPt + offRPt, y: posY - bBottomPt }, end: { x: posX + cellWPt + offRPt + markLenPt, y: posY - bBottomPt }, thickness: cropWeightPt, color: markColor });
        sheetPage.drawLine({ start: { x: posX + cellWPt + bRightPt, y: posY - offBPt }, end: { x: posX + cellWPt + bRightPt, y: posY - offBPt - markLenPt }, thickness: cropWeightPt, color: markColor });
      }
    }

    if (State.cropStyle === 'gutters') {
      if (State.gutterX > 0 && c < State.cols - 1) {
        sheetPage.drawLine({ start: { x: posX + cellWPt, y: posY + cellHPt + offTPt }, end: { x: posX + cellWPt, y: posY + cellHPt + offTPt + markLenPt }, thickness: cropWeightPt, color: markColor });
        sheetPage.drawLine({ start: { x: posX + cellWPt, y: posY - offBPt }, end: { x: posX + cellWPt, y: posY - offBPt - markLenPt }, thickness: cropWeightPt, color: markColor });
      }
      if (State.gutterY > 0 && r < State.rows - 1) {
        sheetPage.drawLine({ start: { x: posX - offLPt, y: posY }, end: { x: posX - offLPt - markLenPt, y: posY }, thickness: cropWeightPt, color: markColor });
        sheetPage.drawLine({ start: { x: posX + cellWPt + offRPt, y: posY }, end: { x: posX + cellWPt + offRPt + markLenPt, y: posY }, thickness: cropWeightPt, color: markColor });
      }
    }

    if (State.cropStyle === 'cross') {
      const radPt = 1.6 * mmToPt;
      const corners = [];
      if (!isSpineLeft) {
        corners.push({ cx: posX - offLPt - markLenPt / 2, cy: posY + cellHPt });
        corners.push({ cx: posX - offLPt - markLenPt / 2, cy: posY });
      }
      if (!isSpineRight) {
        corners.push({ cx: posX + cellWPt + offRPt + markLenPt / 2, cy: posY + cellHPt });
        corners.push({ cx: posX + cellWPt + offRPt + markLenPt / 2, cy: posY });
      }
      corners.forEach(pt => {
        sheetPage.drawCircle({ x: pt.cx, y: pt.cy, size: radPt, borderColor: markColor, borderWidth: cropWeightPt });
        sheetPage.drawLine({ start: { x: pt.cx, y: pt.cy - radPt * 1.6 }, end: { x: pt.cx, y: pt.cy + radPt * 1.6 }, thickness: cropWeightPt, color: markColor });
      });
    }

    if (State.pageLabels) {
      sheetPage.drawText(`P.${pageNum}`, { x: Math.max(4, posX - offLPt - 16), y: posY + cellHPt + 2, size: 5, color: PDFLib.rgb(0.45, 0.45, 0.5) });
    }
  }
}

function drawSheetCenterMarks(ctx, sx, sy, sw, sh, mmToPx) {
  const tick = 7 * mmToPx;
  ctx.strokeStyle = State.markInking === 'k100' ? '#18181b' : '#000000';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(sx + sw / 2, sy); ctx.lineTo(sx + sw / 2, sy + tick);
  ctx.moveTo(sx + sw / 2, sy + sh); ctx.lineTo(sx + sw / 2, sy + sh - tick);
  ctx.moveTo(sx, sy + sh / 2); ctx.lineTo(sx + tick, sy + sh / 2);
  ctx.moveTo(sx + sw, sy + sh / 2); ctx.lineTo(sx + sw - tick, sy + sh / 2);
  ctx.stroke();
}

function drawSpineFoldMarks(ctx, spineX, startY, height, mmToPx) {
  const tick = 8 * mmToPx;
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 0.6;
  ctx.setLineDash([3, 2]);
  ctx.beginPath();
  ctx.moveTo(spineX, startY - tick); ctx.lineTo(spineX, startY);
  ctx.moveTo(spineX, startY + height); ctx.lineTo(spineX, startY + height + tick);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawCollatingMark(ctx, spineX, startY, height, mmToPx) {
  if (State.totalSheets <= 1) return;
  const stepH = height / (State.totalSheets + 1);
  const markY = startY + (State.currentSheetIndex + 1) * stepH;
  const markW = 4 * mmToPx;
  const markThick = 2 * mmToPx;
  ctx.fillStyle = '#000000';
  ctx.fillRect(spineX - markW / 2, markY - markThick / 2, markW, markThick);
}

function drawGripperEdgeMark(ctx, sx, sy, sw, sh, mmToPx) {
  ctx.save();
  ctx.fillStyle = '#71717a';
  ctx.font = 'bold 6px JetBrains Mono, monospace';
  ctx.textAlign = 'center';
  const gripLabel = `▲ ${t('GripperEdge')} ▲`;
  ctx.fillText(gripLabel, sx + sw / 2, sy + sh - 2 * mmToPx);
  ctx.restore();
}

function drawRegistrationTargets(ctx, sx, sy, sw, sh, mmToPx) {
  const rad = 3.5 * mmToPx;
  const pts = [
    { x: sx + sw / 2, y: sy + 7 * mmToPx }, { x: sx + sw / 2, y: sy + sh - 7 * mmToPx },
    { x: sx + 7 * mmToPx, y: sy + sh / 2 }, { x: sx + sw - 7 * mmToPx, y: sy + sh / 2 }
  ];
  ctx.strokeStyle = State.markInking === 'k100' ? '#18181b' : '#000000';
  ctx.lineWidth = 0.6;
  pts.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
    ctx.moveTo(p.x - rad * 1.5, p.y); ctx.lineTo(p.x + rad * 1.5, p.y);
    ctx.moveTo(p.x, p.y - rad * 1.5); ctx.lineTo(p.x, p.y + rad * 1.5);
    ctx.stroke();

    ctx.fillStyle = State.markInking === 'k100' ? '#18181b' : '#000000';
    ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, Math.PI / 2); ctx.lineTo(p.x, p.y); ctx.fill();
    ctx.beginPath(); ctx.arc(p.x, p.y, rad, Math.PI, Math.PI * 1.5); ctx.lineTo(p.x, p.y); ctx.fill();
  });
}

function drawCmykColorBars(ctx, sx, sy, sw, sh, mmToPx) {
  const patchSize = 3.5 * mmToPx;
  const colors = ['#00ffff', '#ff00ff', '#ffff00', '#000000', '#707070', '#b0b0b0', '#0077ff', '#ff0077'];
  const startX = sx + 15 * mmToPx;
  const startY = sy + sh - 6 * mmToPx;
  colors.forEach((col, idx) => {
    ctx.fillStyle = col;
    ctx.fillRect(startX + idx * patchSize, startY, patchSize, patchSize);
    ctx.strokeStyle = '#d4d4d8';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(startX + idx * patchSize, startY, patchSize, patchSize);
  });
}

function drawSlugLine(ctx, sx, sy, sw, sh, mmToPx) {
  ctx.fillStyle = '#18181b';
  ctx.font = '6px JetBrains Mono, monospace';
  ctx.textAlign = 'left';
  const sideName = State.printStyle === 'single' ? 'SIMPLEX' : (State.currentSide === 'front' ? t('Front').toUpperCase() : t('Back').toUpperCase());
  const inkingTxt = State.markInking === 'k100' ? '100% K' : 'REG CMYK';
  const bleedWord = t('Bleed').toUpperCase();
  const bleedTxt = State.bleedAsymmetric 
    ? `${bleedWord}: T${State.bleedTop}/B${State.bleedBottom}/L${State.bleedLeft}/R${State.bleedRight}mm`
    : `${bleedWord}: ${State.bleedMm}mm`;
  const sheetWord = t('Sheet').toUpperCase();
  const text = `IMPOZITOR PRO • ${sheetWord}: ${State.currentSheetIndex + 1}/${State.totalSheets} (${sideName}) • ${State.sheetPreset} ${State.sheetWidth}×${State.sheetHeight}mm • ${State.mode.toUpperCase()} • ${inkingTxt} • ${bleedTxt}`;
  ctx.fillText(text, sx + 12 * mmToPx, sy + 6 * mmToPx);
}

function drawPlotterRegistrationMarks(ctx, sx, sy, sw, sh, mmToPx) {
  const dotDiaMm = 5.0; // Standard 5mm diameter optical black dots
  const dotRad = (dotDiaMm / 2) * mmToPx;
  const margin = 10 * mmToPx;
  
  const targets = [
    { x: sx + margin, y: sy + margin, type: 'origin' },
    { x: sx + sw - margin, y: sy + margin, type: 'corner' },
    { x: sx + margin, y: sy + sh - margin, type: 'corner' },
    { x: sx + sw - margin, y: sy + sh - margin, type: 'corner' }
  ];

  targets.forEach(pt => {
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, dotRad, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.75;
    const arm = dotRad * 1.8;
    ctx.beginPath();
    ctx.moveTo(pt.x - arm, pt.y); ctx.lineTo(pt.x + arm, pt.y);
    ctx.moveTo(pt.x, pt.y - arm); ctx.lineTo(pt.x, pt.y + arm);
    ctx.stroke();

    if (pt.type === 'origin') {
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(pt.x - arm - 2, pt.y + arm + 2);
      ctx.lineTo(pt.x - arm - 2, pt.y - arm - 2);
      ctx.lineTo(pt.x + arm + 2, pt.y - arm - 2);
      ctx.stroke();
    }
  });
}

const drawPlotterRegistrationDots = drawPlotterRegistrationMarks;
