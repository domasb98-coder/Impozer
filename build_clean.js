const fs = require('fs');

// Read source JS modules
const stateJs = fs.readFileSync('js/state.js', 'utf8');
const marksJs = fs.readFileSync('js/marks.js', 'utf8');
const contourJs = fs.readFileSync('js/contour.js', 'utf8');
const autofitJs = fs.readFileSync('js/autofit.js', 'utf8');
let canvasJs = fs.readFileSync('js/canvas.js', 'utf8');
const pdfEngineJs = fs.readFileSync('js/pdfEngine.js', 'utf8');
let appJs = fs.readFileSync('js/app.js', 'utf8');

// 1. In canvasJs: replace setupZoomAndPanHandlers with fixed pointer/hit-testing
const setupZoomOld = canvasJs.substring(canvasJs.indexOf('function setupZoomAndPanHandlers()'));
const setupZoomFixed = `function setupZoomAndPanHandlers() {
  if (window.UI) {
    if (UI.btnZoomIn) UI.btnZoomIn.addEventListener("click", () => setZoom(State.zoom + 0.1));
    if (UI.btnZoomOut) UI.btnZoomOut.addEventListener("click", () => setZoom(State.zoom - 0.1));
    if (UI.btnZoomFit) UI.btnZoomFit.addEventListener("click", resetPanAndFit);
    if (UI.btnZoomInFloat) UI.btnZoomInFloat.addEventListener("click", () => setZoom(State.zoom + 0.1));
    if (UI.btnZoomOutFloat) UI.btnZoomOutFloat.addEventListener("click", () => setZoom(State.zoom - 0.1));
    if (UI.btnZoomFitFloat) UI.btnZoomFitFloat.addEventListener("click", resetPanAndFit);
    if (UI.btnZoom100Float) UI.btnZoom100Float.addEventListener("click", () => setZoom(1.0));
    if (UI.btnZoomResetPan) {
      UI.btnZoomResetPan.addEventListener("click", () => {
        State.panX = 0; State.panY = 0;
        renderImpositionCanvas();
      });
    }
    if (UI.btnRotateView) {
      UI.btnRotateView.addEventListener("click", () => {
        State.viewRotation = (State.viewRotation + 90) % 360;
        renderImpositionCanvas();
        showToast("Vaizdas pasuktas: " + State.viewRotation + "°");
      });
    }
    if (UI.zoomSlider) {
      UI.zoomSlider.addEventListener("input", (e) => setZoom(parseFloat(e.target.value) / 100));
    }
  }

  let isPointerDown = false;
  let isDragging = false;
  let startX = 0, startY = 0;
  let startPanX = 0, startPanY = 0;
  let pointerDist = 0;
  let initialPinchDist = 0, initialZoom = 0.92;

  const vp = window.UI ? UI.viewportContainer : document.getElementById("viewportContainer");
  const canvas = window.UI ? UI.impositionCanvas : document.getElementById("impositionCanvas");

  if (vp) {
    vp.addEventListener("wheel", (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      setZoom(State.zoom * zoomFactor);
    }, { passive: false });

    // Mouse Pointer Events
    vp.addEventListener("mousedown", (e) => {
      if (e.target.closest("#dragDropOverlay") || e.target.closest(".absolute.bottom-2")) return;
      isPointerDown = true;
      isDragging = false;
      pointerDist = 0;
      startX = e.clientX;
      startY = e.clientY;
      startPanX = State.panX;
      startPanY = State.panY;
    });

    window.addEventListener("mousemove", (e) => {
      if (!isPointerDown) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const dist = Math.hypot(dx, dy);
      if (dist > pointerDist) pointerDist = dist;

      if (dist > 6) {
        isDragging = true;
        vp.classList.remove("cursor-grab");
        vp.classList.add("cursor-grabbing");
        State.panX = startPanX + dx;
        State.panY = startPanY + dy;
        renderImpositionCanvas();
      }
    });

    window.addEventListener("mouseup", (e) => {
      if (!isPointerDown) return;
      isPointerDown = false;
      vp.classList.remove("cursor-grabbing");
      vp.classList.add("cursor-grab");

      // Pure click if pointer jitter < 8px
      if (pointerDist < 8) {
        handleSlotHitTest(e.clientX, e.clientY);
      }
      isDragging = false;
    });

    // Touch events for Mobile devices
    vp.addEventListener("touchstart", (e) => {
      if (e.touches.length === 1) {
        isPointerDown = true;
        isDragging = false;
        pointerDist = 0;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        startPanX = State.panX;
        startPanY = State.panY;
      } else if (e.touches.length === 2) {
        isPointerDown = false;
        isDragging = false;
        initialPinchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        initialZoom = State.zoom;
      }
    }, { passive: true });

    vp.addEventListener("touchmove", (e) => {
      if (isPointerDown && e.touches.length === 1) {
        const dx = e.touches[0].clientX - startX;
        const dy = e.touches[0].clientY - startY;
        const dist = Math.hypot(dx, dy);
        if (dist > pointerDist) pointerDist = dist;

        if (dist > 8) {
          isDragging = true;
          State.panX = startPanX + dx;
          State.panY = startPanY + dy;
          renderImpositionCanvas();
        }
      } else if (e.touches.length === 2 && initialPinchDist > 0) {
        const currentDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        setZoom(initialZoom * (currentDist / initialPinchDist));
      }
    }, { passive: true });

    vp.addEventListener("touchend", (e) => {
      if (isPointerDown) {
        isPointerDown = false;
        if (pointerDist < 14) {
          const clientX = e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientX : startX;
          const clientY = e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientY : startY;
          handleSlotHitTest(clientX, clientY);
        }
      }
      if (e.touches.length === 0) {
        initialPinchDist = 0;
      }
    });
  }

  // Canvas direct click fallback
  if (canvas) {
    canvas.addEventListener("click", (e) => {
      if (pointerDist < 8) {
        handleSlotHitTest(e.clientX, e.clientY);
      }
    });
  }
}

/**
 * Accurately detects clicked grid slot on canvas accounting for devicePixelRatio,
 * container bounding rect, zoom scale, panning, and view rotation.
 */
function handleSlotHitTest(clientX, clientY) {
  if (State.mode !== "manual") return;

  const canvas = window.UI ? UI.impositionCanvas : document.getElementById("impositionCanvas");
  const container = window.UI ? UI.viewportContainer : document.getElementById("viewportContainer");
  if (!canvas || !container) return;

  const rect = canvas.getBoundingClientRect();
  const cWidth = container.clientWidth;
  const cHeight = container.clientHeight;
  if (cWidth < 10 || cHeight < 10 || rect.width < 10 || rect.height < 10) return;

  // Exact scale factor between rendered on-screen rectangle and canvas CSS coordinates
  const scaleX = cWidth / rect.width;
  const scaleY = cHeight / rect.height;

  const clickCanvasX = (clientX - rect.left) * scaleX;
  const clickCanvasY = (clientY - rect.top) * scaleY;

  // Invert view rotation transformation if rotated
  let normClickX = clickCanvasX;
  let normClickY = clickCanvasY;
  if (State.viewRotation) {
    const cx = cWidth / 2;
    const cy = cHeight / 2;
    const rad = (-State.viewRotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const dx = clickCanvasX - cx;
    const dy = clickCanvasY - cy;
    normClickX = cx + (dx * cos - dy * sin);
    normClickY = cy + (dx * sin + dy * cos);
  }

  // Calculate grid layout in canvas pixel space
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
      const creepShiftPx = (typeof getCellCreepOffsetMm === "function" ? getCellCreepOffsetMm(c) : 0) * mmToPx;
      const posX = startXPx + c * (cellW + gutterXPx) + creepShiftPx;
      const posY = startYPx + r * (cellH + gutterYPx);

      if (normClickX >= posX && normClickX <= (posX + cellW) && normClickY >= posY && normClickY <= (posY + cellH)) {
        openSlotModalForCell(c, r);
        return;
      }
    }
  }
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
    const sideName = State.currentSide === "front" ? (isEn ? "Priekis" : "Priekis") : (isEn ? "Nugara" : "Nugara");
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

  const activeRot = slotInfo.rot || 0;
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
`;

canvasJs = canvasJs.replace(setupZoomOld, setupZoomFixed);

// 180° Head-to-Head visual rendering badge in canvas.js
canvasJs = canvasJs.replace(
  `ctx.fillText(\`P.\${pageNum}\${slotRot ? \` \${slotRot}°\` : ''}\`, posX + 3, posY + cellH - 4);`,
  `const rotTag = slotRot === 180 ? " 180° 🔻 (Galva į galvą)" : (slotRot ? (" " + slotRot + "°") : "");\n            ctx.fillText("P." + pageNum + rotTag, posX + 3, posY + cellH - 4);`
);

// 2. In appJs: replace layout functions
const layoutStart = appJs.indexOf("function applyLayoutMode(mode) {");
const layoutEnd = appJs.indexOf("function updateStatusBadge() {");

const layoutFixed = `function applyLayoutMode(mode) {
  State.layoutMode = mode;
  const isDesktop = mode === "desktop";

  document.body.classList.toggle("layout-desktop", isDesktop);
  document.body.classList.toggle("layout-mobile", !isDesktop);

  const mainWs = document.getElementById("mainWorkspace") || UI.mainWorkspace;
  const prevArea = document.getElementById("previewArea") || UI.previewArea;
  const setArea = document.getElementById("settingsArea") || UI.settingsArea;

  if (mainWs) {
    if (isDesktop) {
      mainWs.className = "flex flex-row flex-1 overflow-hidden relative";
    } else {
      mainWs.className = "flex flex-col flex-1 overflow-hidden relative";
    }
  }

  if (isDesktop) {
    if (prevArea) {
      prevArea.style.display = "flex";
      prevArea.style.height = "100%";
      prevArea.style.flex = "1 1 0%";
    }
    if (setArea) {
      setArea.style.display = "flex";
      setArea.style.width = "380px";
      setArea.style.maxWidth = "400px";
      setArea.style.height = "100%";
      setArea.style.flex = "0 0 380px";
    }
  } else {
    if (setArea) {
      setArea.style.width = "100%";
      setArea.style.maxWidth = "none";
    }
    applyMobileTab(State.mobileTab || "split");
  }

  document.querySelectorAll(".layout-toggle-btn").forEach(btn => {
    const icon = btn.querySelector(".layout-toggle-icon");
    const label = btn.querySelector(".layout-toggle-label");
    if (isDesktop) {
      if (icon) icon.className = "layout-toggle-icon fa-solid fa-desktop text-[10px]";
      if (label) label.textContent = "PC";
      btn.className = "layout-toggle-btn px-2 py-0.5 rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-300 hover:text-white transition text-[10px] sm:text-[11px] font-bold flex items-center gap-1 cursor-pointer";
    } else {
      if (icon) icon.className = "layout-toggle-icon fa-solid fa-mobile-screen text-[10px]";
      if (label) label.textContent = "MOB";
      btn.className = "layout-toggle-btn px-2 py-0.5 rounded-xl border border-amber-500/50 bg-amber-500/20 text-amber-300 hover:text-white transition text-[10px] sm:text-[11px] font-bold flex items-center gap-1 cursor-pointer";
    }
  });

  if (typeof renderImpositionCanvas === "function") {
    setTimeout(renderImpositionCanvas, 40);
  }
}

/**
 * Handles mobile viewport tabs (Preview, Split, Settings) with instant switching.
 */
function applyMobileTab(tab) {
  State.mobileTab = tab;

  // Auto-switch layoutMode to mobile if currently in desktop view
  if (State.layoutMode === "desktop") {
    State.layoutMode = "mobile";
    document.body.classList.remove("layout-desktop");
    document.body.classList.add("layout-mobile");
    document.querySelectorAll(".layout-toggle-btn").forEach(btn => {
      const icon = btn.querySelector(".layout-toggle-icon");
      const label = btn.querySelector(".layout-toggle-label");
      if (icon) icon.className = "layout-toggle-icon fa-solid fa-mobile-screen text-[10px]";
      if (label) label.textContent = "MOB";
      btn.className = "layout-toggle-btn px-2 py-0.5 rounded-xl border border-amber-500/50 bg-amber-500/20 text-amber-300 hover:text-white transition text-[10px] sm:text-[11px] font-bold flex items-center gap-1 cursor-pointer";
    });
  }

  document.body.classList.remove("mobile-tab-preview", "mobile-tab-split", "mobile-tab-settings");
  document.body.classList.add("mobile-tab-" + tab);

  const prevArea = document.getElementById("previewArea") || UI.previewArea;
  const setArea = document.getElementById("settingsArea") || UI.settingsArea;
  if (!prevArea || !setArea) return;

  const tabBtns = [
    { btn: document.getElementById("tabBtnPreview") || UI.tabBtnPreview, name: "preview" },
    { btn: document.getElementById("tabBtnSplit") || UI.tabBtnSplit, name: "split" },
    { btn: document.getElementById("tabBtnSettings") || UI.tabBtnSettings, name: "settings" }
  ];

  tabBtns.forEach(t => {
    if (t.btn) {
      if (t.name === tab) {
        t.btn.className = "px-2 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 text-zinc-950 font-black shadow-sm transition cursor-pointer";
      } else {
        t.btn.className = "px-2 py-1 rounded-lg text-zinc-400 hover:text-white transition cursor-pointer";
      }
    }
  });

  if (tab === "preview") {
    prevArea.style.display = "flex";
    prevArea.style.height = "100%";
    prevArea.style.flex = "1 1 auto";
    setArea.style.display = "none";
  } else if (tab === "settings") {
    prevArea.style.display = "none";
    setArea.style.display = "flex";
    setArea.style.height = "100%";
    setArea.style.flex = "1 1 auto";
  } else {
    // Split: 46% preview, 54% settings
    prevArea.style.display = "flex";
    prevArea.style.height = "46%";
    prevArea.style.flex = "0 0 46%";
    setArea.style.display = "flex";
    setArea.style.height = "54%";
    setArea.style.flex = "1 1 54%";
  }

  if (typeof renderImpositionCanvas === "function") {
    setTimeout(renderImpositionCanvas, 40);
  }
}
`;

appJs = appJs.substring(0, layoutStart) + layoutFixed + '\n\n' + appJs.substring(layoutEnd);

// In appJs: ensure cacheDomElements caches previewArea
appJs = appJs.replace(
  `'mainWorkspace', 'viewportArea', 'settingsArea', 'mobileSubToolbar',`,
  `'mainWorkspace', 'previewArea', 'settingsArea', 'mobileSubToolbar',`
);

// In appJs: closeSlotModal also hides display
appJs = appJs.replace(
  `const closeSlotModal = () => {\n    const modal = document.getElementById('slotEditModal');\n    if (modal) modal.classList.add('hidden');\n  };`,
  `const closeSlotModal = () => {\n    const modal = document.getElementById('slotEditModal');\n    if (modal) {\n      modal.classList.add('hidden');\n      modal.style.display = 'none';\n    }\n  };`
);

// In appJs: update DOMContentLoaded with multi-stage rendering & ResizeObserver
const domPos = appJs.indexOf("window.addEventListener('DOMContentLoaded'");
const domInitFixed = `window.addEventListener("DOMContentLoaded", () => {
  cacheDomElements();
  setupZoomAndPanHandlers();
  setupEventListeners();
  applyUiTranslations(State.lang);
  updatePresetDropdown(State.lang);
  generateDemoPublication(16);

  const isNarrowMobile = window.innerWidth < 768 || /Android|iPhone|iPod|Mobile/i.test(navigator.userAgent);
  applyLayoutMode(isNarrowMobile ? "mobile" : "desktop");

  // Multi-phase auto-render on initialization to guarantee immediate canvas rendering
  renderImpositionCanvas();
  requestAnimationFrame(renderImpositionCanvas);
  setTimeout(renderImpositionCanvas, 50);
  setTimeout(renderImpositionCanvas, 150);
  setTimeout(renderImpositionCanvas, 350);
  setTimeout(renderImpositionCanvas, 700);

  // Auto-render when viewportContainer size updates
  const vpCont = document.getElementById("viewportContainer");
  if (vpCont && window.ResizeObserver) {
    new ResizeObserver(() => {
      if (typeof renderImpositionCanvas === "function") {
        renderImpositionCanvas();
      }
    }).observe(vpCont);
  }
});

window.addEventListener("load", () => {
  if (typeof renderImpositionCanvas === "function") {
    renderImpositionCanvas();
    setTimeout(renderImpositionCanvas, 100);
  }
});

window.addEventListener("resize", () => {
  if (typeof renderImpositionCanvas === "function") renderImpositionCanvas();
});
`;

appJs = appJs.substring(0, domPos) + domInitFixed;

// Extract pristine HTML markup
const currentIndex = fs.readFileSync('index.html', 'utf8');
const scriptPos = currentIndex.indexOf('<script>');
let htmlPart = currentIndex.substring(0, scriptPos).trim();

// Ensure viewportContainer has no p-2 padding offset
htmlPart = htmlPart.replace(
  `id="viewportContainer" class="flex-1 relative overflow-hidden checkerboard-pattern flex items-center justify-center p-2 cursor-grab select-none"`,
  `id="viewportContainer" class="flex-1 relative overflow-hidden checkerboard-pattern flex items-center justify-center cursor-grab select-none"`
);

// Concatenate all modules cleanly
const fullJs = [
  "/* =====================================================\n * MODULE: js/state.js\n * ===================================================== */\n" + stateJs,
  "/* =====================================================\n * MODULE: js/marks.js\n * ===================================================== */\n" + marksJs,
  "/* =====================================================\n * MODULE: js/contour.js\n * ===================================================== */\n" + contourJs,
  "/* =====================================================\n * MODULE: js/autofit.js\n * ===================================================== */\n" + autofitJs,
  "/* =====================================================\n * MODULE: js/canvas.js\n * ===================================================== */\n" + canvasJs,
  "/* =====================================================\n * MODULE: js/pdfEngine.js\n * ===================================================== */\n" + pdfEngineJs,
  "/* =====================================================\n * MODULE: js/app.js\n * ===================================================== */\n" + appJs
].join("\n\n");

const completeIndexHtml = htmlPart + "\n\n  <script>\n" + fullJs + "\n  </script>\n</body>\n</html>\n";
fs.writeFileSync('index.html', completeIndexHtml, 'utf8');
console.log('Built index.html successfully! Size:', completeIndexHtml.length);
fs.writeFileSync('/tmp/check_index.js', fullJs, 'utf8');
