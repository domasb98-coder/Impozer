// =============================================================
// IMPOZITOR PRO - js/app.js
// Application Controller, DOM Binding, Modal & Event Management
// =============================================================

const UI = {};

/**
 * Caches all DOM element references into UI object for rapid access.
 */
function cacheDomElements() {
  const ids = [
    'impositionCanvas', 'viewportContainer', 'dragDropOverlay',
    'mainWorkspace', 'viewportArea', 'settingsArea', 'mobileSubToolbar',
    'layoutToggleBtn', 'layoutToggleBtnMobile', 'layoutToggleLabel', 'layoutToggleLabelMobile',
    'btnLayoutToggleMobile', 'tabBtnPreview', 'tabBtnSplit', 'tabBtnSettings',
    'btnLangLt', 'btnLangEn', 'btnLangLtMobile', 'btnLangEnMobile',
    'btnOpenPdf', 'btnSavePdf', 'btnSampleDoc', 'pdfFileInput', 'sidebarFileStatus',
    'btnPrevSheet', 'btnNextSheet', 'btnSideFront', 'btnSideBack', 'btnAutoPlay',
    'sheetCounterDisplay', 'statusModeLabel', 'statusGridLabel', 'statusBleedBadge', 'statusSideLabel',
    'canvasDimInfo', 'zoomLevelDisplay', 'zoomSlider',
    'btnZoomIn', 'btnZoomOut', 'btnZoomFit',
    'btnZoomInFloat', 'btnZoomOutFloat', 'btnZoomFitFloat', 'btnZoom100Float', 'btnZoomResetPan', 'btnRotateView',
    'selectMode', 'inputPageWidth', 'inputPageHeight', 'btnRotatePage',
    'btnAutoFit', 'btnAutoFitMax', 'btnLockGrid', 'iconLockGrid', 'labelLockGrid',
    'selectSheetPreset', 'inputSheetWidth', 'inputSheetHeight', 'selectPrintStyle',
    'inputCols', 'inputRows', 'inputGutterX', 'inputGutterY', 'checkDuplicatePages',
    'inputMarginTop', 'inputMarginSide', 'checkAutoCenter',
    'inputBleed', 'btnMatchGuttersToBleed', 'checkBleedBox', 'checkBleedArtwork', 'checkClipBleed', 'checkZeroSpineBleed',
    'checkAsymmetricBleed', 'asymmetricBleedContainer',
    'inputBleedTop', 'inputBleedBottom', 'inputBleedLeft', 'inputBleedRight',
    'checkCropMarks', 'checkMinimalCrops', 'selectCropStyle', 'selectCropOffsetOrigin', 'selectCropWeight',
    'selectMarkInking', 'inputCropLength', 'inputCropOffset',
    'checkRegTargets', 'checkCmykBars', 'checkSlugLine', 'checkFoldMarks', 'checkCenterMarks',
    'checkCollatingMark', 'checkGripperMark', 'checkPageLabels',
    'checkCutContourEnabled', 'selectContourMode', 'btnDemoSticker', 'inputCutOffset', 'cutOffsetLabel',
    'checkPlotterMarks', 'checkExportBothSheets', 'btnToggleCutView', 'labelCutView',
    'selectPreset', 'presetDescription', 'btnSavePresetModal', 'btnExportPresets', 'btnImportPresets', 'presetFileInput',
    'savePresetModalElement', 'modalPresetName', 'modalPresetCategory', 'btnCancelPresetModal', 'btnCancelPresetModal2', 'btnConfirmSavePreset',
    'btnSaveCustomSize', 'saveSheetModalElement', 'modalSheetName', 'modalSheetW', 'modalSheetH', 'btnCancelSheetModal', 'btnCancelSheetModal2', 'btnConfirmSaveSheet',
    'slotEditModal', 'slotModalTitle', 'inputSlotPageNum', 'btnSetSlotEmpty', 'btnCloseSlotModal', 'btnCancelSlotModal', 'btnSaveSlotConfig'
  ];

  ids.forEach(id => {
    UI[id] = document.getElementById(id);
  });
}

/**
 * Switches between Side-by-Side Desktop layout and Mobile Stacked layout.
 */
function applyLayoutMode(mode) {
  State.layoutMode = mode;
  const isDesktop = mode === 'desktop';

  if (UI.mainWorkspace) {
    if (isDesktop) {
      UI.mainWorkspace.className = 'flex flex-row flex-1 overflow-hidden relative';
    } else {
      UI.mainWorkspace.className = 'flex flex-col flex-1 overflow-hidden relative';
    }
  }

  if (UI.viewportArea) {
    if (isDesktop) {
      UI.viewportArea.style.height = '';
      UI.viewportArea.style.flex = '1 1 0%';
    } else {
      applyMobileTab(State.mobileTab || 'split');
    }
  }

  if (UI.settingsArea) {
    if (isDesktop) {
      UI.settingsArea.style.width = '420px';
      UI.settingsArea.style.height = '';
      UI.settingsArea.style.display = 'flex';
    } else {
      UI.settingsArea.style.width = '100%';
      applyMobileTab(State.mobileTab || 'split');
    }
  }

  document.querySelectorAll('.layout-toggle-btn').forEach(btn => {
    const icon = btn.querySelector('.layout-toggle-icon');
    const label = btn.querySelector('.layout-toggle-label');
    if (isDesktop) {
      if (icon) icon.className = 'layout-toggle-icon fa-solid fa-desktop text-[10px]';
      if (label) label.textContent = 'PC';
      btn.className = 'layout-toggle-btn px-2 py-0.5 rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-300 hover:text-white transition text-[10px] sm:text-[11px] font-bold flex items-center gap-1 cursor-pointer';
    } else {
      if (icon) icon.className = 'layout-toggle-icon fa-solid fa-mobile-screen text-[10px]';
      if (label) label.textContent = 'MOB';
      btn.className = 'layout-toggle-btn px-2 py-0.5 rounded-xl border border-amber-500/50 bg-amber-500/20 text-amber-300 hover:text-white transition text-[10px] sm:text-[11px] font-bold flex items-center gap-1 cursor-pointer';
    }
  });

  if (typeof renderImpositionCanvas === 'function') {
    setTimeout(renderImpositionCanvas, 60);
  }
}

/**
 * Handles mobile viewport tabs (Preview, Split, Settings).
 */
function applyMobileTab(tab) {
  State.mobileTab = tab;
  if (State.layoutMode === 'desktop') return;

  const vp = UI.viewportArea;
  const setArea = UI.settingsArea;
  if (!vp || !setArea) return;

  const tabs = [
    { btn: UI.tabBtnPreview, name: 'preview' },
    { btn: UI.tabBtnSplit, name: 'split' },
    { btn: UI.tabBtnSettings, name: 'settings' }
  ];

  tabs.forEach(t => {
    if (t.btn) {
      if (t.name === tab) {
        t.btn.className = 'flex-1 py-1 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 bg-amber-500 text-zinc-950 shadow-sm cursor-pointer';
      } else {
        t.btn.className = 'flex-1 py-1 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 bg-zinc-900 text-zinc-400 hover:text-white cursor-pointer';
      }
    }
  });

  if (tab === 'preview') {
    vp.style.display = 'flex';
    vp.style.height = '100%';
    vp.style.flex = '1 1 auto';
    setArea.style.display = 'none';
  } else if (tab === 'settings') {
    vp.style.display = 'none';
    setArea.style.display = 'flex';
    setArea.style.height = '100%';
    setArea.style.flex = '1 1 auto';
  } else {
    // Split: 45% preview, 55% settings
    vp.style.display = 'flex';
    vp.style.height = '42%';
    vp.style.flex = '0 0 42%';
    setArea.style.display = 'flex';
    setArea.style.height = '58%';
    setArea.style.flex = '1 1 58%';
  }

  if (typeof renderImpositionCanvas === 'function') {
    setTimeout(renderImpositionCanvas, 60);
  }
}

/**
 * Updates status bar labels and metrics.
 */
function updateStatusBadge() {
  const isLt = State.lang !== 'en';
  if (UI.statusModeLabel) {
    const modeName = {
      booklet: isLt ? 'KNYGELĖ (BALNAS)' : 'BOOKLET (SADDLE)',
      nup: isLt ? 'DAUGINIMAS (N-UP)' : 'N-UP (STEP & REPEAT)',
      cutstack: isLt ? 'PJAUK IR KRAUK' : 'CUT & STACK',
      signatures: isLt ? 'LANKAI (SIGNATURES)' : 'SIGNATURES',
      manual: isLt ? 'RANKINIS (MANUAL)' : 'MANUAL SLOTS'
    }[State.mode] || State.mode.toUpperCase();
    UI.statusModeLabel.innerHTML = `<i class="fa-solid fa-shapes mr-1"></i>${modeName}`;
  }

  if (UI.statusGridLabel) {
    const itemsPerSheet = State.cols * State.rows;
    UI.statusGridLabel.textContent = `${State.cols} × ${State.rows} (${itemsPerSheet} psl./lanke)`;
  }

  if (UI.statusBleedBadge) {
    UI.statusBleedBadge.textContent = State.bleedAsymmetric 
      ? `UŽLAIDA: T${State.bleedTop}/B${State.bleedBottom}/L${State.bleedLeft}/R${State.bleedRight}mm`
      : `UŽLAIDA: ${State.bleedMm}mm`;
  }

  if (UI.canvasDimInfo) {
    UI.canvasDimInfo.textContent = `${State.sheetPreset} • ${State.sheetWidth}×${State.sheetHeight} mm`;
  }

  updateSideButtonsUI();
  updateSheetNavigationUI();
}

/**
 * Updates side buttons UI state (Front / Back).
 */
function updateSideButtonsUI() {
  const isFront = State.currentSide === 'front';
  if (UI.btnSideFront) {
    UI.btnSideFront.className = isFront 
      ? 'px-2.5 py-0.5 rounded-lg font-bold text-zinc-950 bg-amber-400 text-[10px] sm:text-[11px] shadow transition cursor-pointer'
      : 'px-2.5 py-0.5 rounded-lg text-zinc-400 hover:text-white text-[10px] sm:text-[11px] transition cursor-pointer';
  }
  if (UI.btnSideBack) {
    if (State.printStyle === 'single') {
      UI.btnSideBack.disabled = true;
      UI.btnSideBack.className = 'px-2.5 py-0.5 rounded-lg text-zinc-600 text-[10px] sm:text-[11px] opacity-40 cursor-not-allowed';
    } else {
      UI.btnSideBack.disabled = false;
      UI.btnSideBack.className = !isFront 
        ? 'px-2.5 py-0.5 rounded-lg font-bold text-zinc-950 bg-amber-400 text-[10px] sm:text-[11px] shadow transition cursor-pointer'
        : 'px-2.5 py-0.5 rounded-lg text-zinc-400 hover:text-white text-[10px] sm:text-[11px] transition cursor-pointer';
    }
  }

  if (UI.statusSideLabel) {
    if (State.printStyle === 'single') {
      UI.statusSideLabel.textContent = 'VIENPUSĖ (SIMPLEX)';
    } else {
      UI.statusSideLabel.textContent = isFront ? 'PRIEKIS (1-oji PUSĖ)' : 'NUGARĖLĖ (2-oji PUSĖ)';
    }
  }
}

/**
 * Updates sheet pager counter and button states.
 */
function updateSheetNavigationUI() {
  if (UI.sheetCounterDisplay) {
    UI.sheetCounterDisplay.textContent = `${State.currentSheetIndex + 1} / ${Math.max(1, State.totalSheets)}`;
  }
  if (UI.btnPrevSheet) {
    UI.btnPrevSheet.disabled = State.currentSheetIndex <= 0;
    UI.btnPrevSheet.classList.toggle('opacity-40', State.currentSheetIndex <= 0);
  }
  if (UI.btnNextSheet) {
    UI.btnNextSheet.disabled = State.currentSheetIndex >= State.totalSheets - 1;
    UI.btnNextSheet.classList.toggle('opacity-40', State.currentSheetIndex >= State.totalSheets - 1);
  }
}

let autoPlayTimer = null;
function toggleAutoPlay() {
  if (autoPlayTimer) {
    stopAutoPlay();
  } else {
    if (UI.btnAutoPlay) {
      UI.btnAutoPlay.className = 'w-6 h-6 flex items-center justify-center text-zinc-950 bg-amber-400 rounded-lg transition active:scale-95 cursor-pointer shadow';
      UI.btnAutoPlay.innerHTML = '<i class="fa-solid fa-pause text-[9px]"></i>';
    }
    autoPlayTimer = setInterval(() => {
      if (State.currentSheetIndex < State.totalSheets - 1) {
        State.currentSheetIndex++;
      } else {
        State.currentSheetIndex = 0;
        State.currentSide = State.currentSide === 'front' ? 'back' : 'front';
        updateSideButtonsUI();
      }
      updateSheetNavigationUI();
      if (typeof renderImpositionCanvas === 'function') renderImpositionCanvas();
    }, 2000);
    showToast(State.lang === 'en' ? 'Sheet slideshow started' : 'Lankų peržiūra paleista', 'info');
  }
}

function stopAutoPlay() {
  if (autoPlayTimer) {
    clearInterval(autoPlayTimer);
    autoPlayTimer = null;
    if (UI.btnAutoPlay) {
      UI.btnAutoPlay.className = 'w-6 h-6 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition active:scale-95 cursor-pointer';
      UI.btnAutoPlay.innerHTML = '<i class="fa-solid fa-play text-[9px]"></i>';
    }
  }
}

/**
 * Toggles locked grid layout mode.
 */
function toggleGridLock() {
  State.gridLocked = !State.gridLocked;
  updateGridLockUI();
  if (State.gridLocked) {
    State.lockedGridConfig = {
      cols: State.cols, rows: State.rows,
      gutterX: State.gutterX, gutterY: State.gutterY,
      autoCenter: State.autoCenter, marginTop: State.marginTop, marginSide: State.marginSide,
      pageW: State.sourcePageWidth, pageH: State.sourcePageHeight, rotated: State.pageRotated
    };
    showToast(State.lang === 'en' ? `Grid (${State.cols}×${State.rows}) locked! Parameters protected from recalculation.` : `Tinklelis (${State.cols}×${State.rows}) užfiksuotas! Parametrai apsaugoti nuo perskaičiavimo.`, 'success');
  } else {
    State.lockedGridConfig = null;
    showToast(State.lang === 'en' ? 'Grid unlocked (auto layout enabled)' : 'Tinklelis atlaisvintas (parametrus vėl galima keisti automatiškai)', 'info');
  }
}

function updateGridLockUI() {
  if (!UI.btnLockGrid) return;
  const isLt = State.lang !== 'en';
  const lockInputs = [UI.inputCols, UI.inputRows, UI.inputGutterX, UI.inputGutterY, UI.inputPageWidth, UI.inputPageHeight];

  if (State.gridLocked) {
    UI.btnLockGrid.className = 'px-2 py-0.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black border border-amber-400 shadow-sm rounded text-[9px] font-mono transition flex items-center gap-1 cursor-pointer';
    if (UI.iconLockGrid) UI.iconLockGrid.className = 'fa-solid fa-lock text-[8px] text-zinc-950';
    if (UI.labelLockGrid) UI.labelLockGrid.textContent = isLt ? 'Užfiksuota' : 'Locked';
    if (UI.btnAutoFit) UI.btnAutoFit.classList.add('opacity-50', 'pointer-events-none');
    if (UI.btnAutoFitMax) UI.btnAutoFitMax.classList.add('opacity-50', 'pointer-events-none');
    lockInputs.forEach(el => { if (el) { el.disabled = true; el.classList.add('opacity-50', 'cursor-not-allowed'); } });
  } else {
    UI.btnLockGrid.className = 'px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded text-[9px] font-mono font-bold transition flex items-center gap-1 cursor-pointer';
    if (UI.iconLockGrid) UI.iconLockGrid.className = 'fa-solid fa-lock-open text-[8px] text-zinc-400';
    if (UI.labelLockGrid) UI.labelLockGrid.textContent = isLt ? 'Fiksuoti' : 'Lock';
    if (UI.btnAutoFit) UI.btnAutoFit.classList.remove('opacity-50', 'pointer-events-none');
    if (UI.btnAutoFitMax) UI.btnAutoFitMax.classList.remove('opacity-50', 'pointer-events-none');
    lockInputs.forEach(el => { if (el) { el.disabled = false; el.classList.remove('opacity-50', 'cursor-not-allowed'); } });
  }
}

/**
 * Renders presets catalog cards filtered by category.
 */
function renderPresetsCatalog(filter = 'all') {
  const container = document.getElementById('presetsListContainer');
  if (!container) return;
  container.innerHTML = '';

  const filtered = PresetsDB.filter(p => filter === 'all' || p.category === filter);

  if (filtered.length === 0) {
    container.innerHTML = `<div class="text-[10px] text-zinc-500 text-center py-3 font-mono">${State.lang === 'en' ? 'No presets in this category' : 'Šioje kategorijoje šablonų nėra'}</div>`;
    return;
  }

  filtered.forEach(preset => {
    const isActive = State.activePresetId === preset.id;
    const displayName = getPresetName(preset, State.lang);
    const item = document.createElement('div');
    item.className = `flex items-center justify-between p-1.5 rounded border text-xs transition cursor-pointer group ${
      isActive ? 'bg-amber-950/40 border-amber-500 shadow-sm' : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800'
    }`;
    item.innerHTML = `
      <div class="flex flex-col text-left overflow-hidden mr-1">
        <span class="font-bold truncate text-[11px] ${isActive ? 'text-amber-300' : 'text-zinc-200 group-hover:text-amber-300'}">${displayName}</span>
        <span class="text-[9px] font-mono text-zinc-400">${preset.sheetW}×${preset.sheetH}mm • ${preset.cols}×${preset.rows} (${preset.pageW || 148}×${preset.pageH || 210}mm)</span>
      </div>
      <span class="text-[9px] px-1.5 py-0.5 rounded font-mono shrink-0 font-bold uppercase ${isActive ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-950 text-amber-400'}">${preset.mode}</span>
    `;
    item.addEventListener('click', () => applyPreset(preset));
    container.appendChild(item);
  });
}

/**
 * Applies selected preset configuration to State and UI.
 */
function applyPreset(preset) {
  if (!preset) return;
  State.activePresetId = preset.id;
  State.mode = preset.mode || 'booklet';
  State.sheetWidth = preset.sheetW || 320;
  State.sheetHeight = preset.sheetH || 450;
  State.printStyle = preset.style || 'sheetwise';
  if (preset.duplicatePages !== undefined) State.duplicatePages = preset.duplicatePages;

  if (!State.gridLocked) {
    State.cols = preset.cols || 2;
    State.rows = preset.rows || 1;
    State.gutterX = preset.gutterX !== undefined ? preset.gutterX : 0;
    State.gutterY = preset.gutterY !== undefined ? preset.gutterY : 0;
    if (preset.marginTop !== undefined) State.marginTop = preset.marginTop;
    if (preset.marginSide !== undefined) State.marginSide = preset.marginSide;
    if (preset.pageW && preset.pageH) {
      State.sourcePageWidth = preset.pageW;
      State.sourcePageHeight = preset.pageH;
      State.pageRotated = false;
      if (UI.inputPageWidth) UI.inputPageWidth.value = State.sourcePageWidth;
      if (UI.inputPageHeight) UI.inputPageHeight.value = State.sourcePageHeight;
    }
  }

  if (UI.selectMode) UI.selectMode.value = State.mode;
  if (UI.inputSheetWidth) UI.inputSheetWidth.value = State.sheetWidth;
  if (UI.inputSheetHeight) UI.inputSheetHeight.value = State.sheetHeight;
  if (UI.inputCols) UI.inputCols.value = State.cols;
  if (UI.inputRows) UI.inputRows.value = State.rows;
  if (UI.inputGutterX) UI.inputGutterX.value = State.gutterX;
  if (UI.inputGutterY) UI.inputGutterY.value = State.gutterY;
  if (UI.selectPrintStyle) UI.selectPrintStyle.value = State.printStyle;
  if (UI.inputMarginTop) UI.inputMarginTop.value = State.marginTop;
  if (UI.inputMarginSide) UI.inputMarginSide.value = State.marginSide;
  if (UI.checkDuplicatePages) UI.checkDuplicatePages.checked = State.duplicatePages;

  if (UI.selectSheetPreset) {
    const sheetMap = { 'SRA3': [320, 450], 'A3': [297, 420], 'SRA3Plus': [330, 488], 'B3': [353, 500], 'B2': [500, 700], 'B1': [700, 1000], 'A4': [210, 297] };
    const matchedKey = Object.keys(sheetMap).find(k => sheetMap[k][0] === State.sheetWidth && sheetMap[k][1] === State.sheetHeight);
    UI.selectSheetPreset.value = matchedKey || 'custom';
    State.sheetPreset = matchedKey || 'custom';
  }

  if (UI.selectPreset) UI.selectPreset.value = preset.id;
  const descEl = UI.presetDescription || document.getElementById('presetDescription');
  if (descEl) {
    const descText = getPresetDesc(preset, State.lang) ||
      `${preset.sheetW}×${preset.sheetH}mm • ${preset.cols}×${preset.rows} (${preset.pageW || 148}×${preset.pageH || 210}mm) • ${preset.mode.toUpperCase()}`;
    descEl.textContent = descText;
    descEl.classList.remove('hidden');
  }

  if (!State.sourcePdfBytes) {
    generateDemoPublication(preset.pageCount || 16, State.sourcePageWidth, State.sourcePageHeight);
  } else {
    updateStatusBadge();
    recalculateImposition();
    if (typeof renderImpositionCanvas === 'function') renderImpositionCanvas();
  }

  const activeFilter = document.querySelector('.preset-filter-btn.bg-amber-500')?.getAttribute('data-filter') || 'all';
  renderPresetsCatalog(activeFilter);
  const displayName = getPresetName(preset, State.lang);
  showToast(State.lang === 'en' ? `Preset applied: ${displayName}` : `Šablonas pritaikytas: ${displayName}`);
}

function updatePresetDropdown(lang = (State ? State.lang : 'lt')) {
  const select = UI.selectPreset || document.getElementById('selectPreset');
  const descEl = UI.presetDescription || document.getElementById('presetDescription');
  const isEn = lang === 'en';

  if (select) {
    const currentVal = select.value || (State ? State.activePresetId : 'p1');
    select.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = isEn ? '-- Select a preset --' : '-- Pasirinkti šabloną --';
    select.appendChild(placeholder);

    PresetsDB.forEach(preset => {
      const opt = document.createElement('option');
      opt.value = preset.id;
      opt.textContent = getPresetName(preset, lang);
      if (preset.id === currentVal) opt.selected = true;
      select.appendChild(opt);
    });

    const activePreset = PresetsDB.find(p => p.id === currentVal);
    if (descEl && activePreset) {
      descEl.textContent = getPresetDesc(activePreset, lang);
      descEl.classList.remove('hidden');
    }
  }

  renderPresetsCatalog(document.querySelector('.preset-filter-btn.bg-amber-500')?.getAttribute('data-filter') || 'all');
}

function exportPresetsToJson() {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(PresetsDB, null, 2));
  const dlAnchor = document.createElement('a');
  dlAnchor.setAttribute('href', dataStr);
  dlAnchor.setAttribute('download', 'impozitor_presets.json');
  document.body.appendChild(dlAnchor);
  dlAnchor.click();
  dlAnchor.remove();
  showToast(State.lang === 'en' ? 'Presets exported to JSON' : 'Šablonai eksportuoti į JSON');
}

function importPresetsFromJson(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      if (Array.isArray(imported)) {
        PresetsDB.splice(0, PresetsDB.length, ...imported);
        updatePresetDropdown(State.lang);
        showToast(State.lang === 'en' ? `Loaded ${imported.length} presets!` : `Užkrauta ${imported.length} šablonų!`, 'success');
      }
    } catch(err) {
      showToast(State.lang === 'en' ? 'Invalid JSON preset file' : 'Klaidingas JSON failas', 'error');
    }
  };
  reader.readAsText(file);
}

/**
 * Attaches all event listeners for UI buttons, inputs, sliders, and modals.
 */
function setupEventListeners() {
  const handleLayoutToggle = () => {
    const nextMode = State.layoutMode === 'desktop' ? 'mobile' : 'desktop';
    applyLayoutMode(nextMode);
    showToast(
      nextMode === 'desktop' 
        ? (State.lang === 'en' ? 'Switched to PC (Side-by-Side) Mode' : 'Įjungtas PC (Šalia) režimas') 
        : (State.lang === 'en' ? 'Switched to Mobile (Stacked) Mode' : 'Įjungtas Mobilus (Viršus/Apačia) režimas'), 
      'info'
    );
  };

  document.querySelectorAll('.layout-toggle-btn').forEach(btn => {
    btn.addEventListener('click', handleLayoutToggle);
  });

  if (UI.tabBtnPreview) UI.tabBtnPreview.addEventListener('click', () => applyMobileTab('preview'));
  if (UI.tabBtnSplit) UI.tabBtnSplit.addEventListener('click', () => applyMobileTab('split'));
  if (UI.tabBtnSettings) UI.tabBtnSettings.addEventListener('click', () => applyMobileTab('settings'));

  if (UI.btnOpenPdf) UI.btnOpenPdf.addEventListener('click', () => { if (UI.pdfFileInput) UI.pdfFileInput.click(); });
  if (UI.pdfFileInput) {
    UI.pdfFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) handlePdfUpload(e.target.files[0]);
    });
  }
  if (UI.btnSavePdf) UI.btnSavePdf.addEventListener('click', exportImposedPdf);
  if (UI.btnSampleDoc) {
    UI.btnSampleDoc.addEventListener('click', () => {
      generateDemoPublication(16);
      showToast(State.lang === 'en' ? 'Generated 16-page sample publication' : 'Sugeneruotas 16 psl. demonstracinis leidinys');
    });
  }

  if (UI.btnPrevSheet) {
    UI.btnPrevSheet.addEventListener('click', () => {
      stopAutoPlay();
      if (State.currentSheetIndex > 0) {
        State.currentSheetIndex--;
        updateSheetNavigationUI();
        if (typeof renderImpositionCanvas === 'function') renderImpositionCanvas();
      }
    });
  }
  if (UI.btnNextSheet) {
    UI.btnNextSheet.addEventListener('click', () => {
      stopAutoPlay();
      if (State.currentSheetIndex < State.totalSheets - 1) {
        State.currentSheetIndex++;
        updateSheetNavigationUI();
        if (typeof renderImpositionCanvas === 'function') renderImpositionCanvas();
      }
    });
  }

  if (UI.btnSideFront) {
    UI.btnSideFront.addEventListener('click', () => {
      stopAutoPlay();
      State.currentSide = 'front';
      updateSideButtonsUI();
      if (typeof renderImpositionCanvas === 'function') renderImpositionCanvas();
    });
  }
  if (UI.btnSideBack) {
    UI.btnSideBack.addEventListener('click', () => {
      if (State.printStyle === 'single') return;
      stopAutoPlay();
      State.currentSide = 'back';
      updateSideButtonsUI();
      if (typeof renderImpositionCanvas === 'function') renderImpositionCanvas();
    });
  }

  if (UI.btnAutoPlay) UI.btnAutoPlay.addEventListener('click', toggleAutoPlay);

  const handleLanguageToggle = (targetLang) => {
    State.lang = targetLang || (State.lang === 'lt' ? 'en' : 'lt');
    applyUiTranslations(State.lang);
    if (typeof renderImpositionCanvas === 'function') renderImpositionCanvas();
  };
  if (UI.btnLangLt) UI.btnLangLt.addEventListener('click', () => handleLanguageToggle('lt'));
  if (UI.btnLangEn) UI.btnLangEn.addEventListener('click', () => handleLanguageToggle('en'));
  if (UI.btnLangLtMobile) UI.btnLangLtMobile.addEventListener('click', () => handleLanguageToggle('lt'));
  if (UI.btnLangEnMobile) UI.btnLangEnMobile.addEventListener('click', () => handleLanguageToggle('en'));

  if (UI.btnRotatePage) {
    UI.btnRotatePage.addEventListener('click', () => {
      const tempW = State.sourcePageWidth;
      State.sourcePageWidth = State.sourcePageHeight;
      State.sourcePageHeight = tempW;
      State.pageRotated = !State.pageRotated;
      if (UI.inputPageWidth) UI.inputPageWidth.value = Math.round(State.sourcePageWidth);
      if (UI.inputPageHeight) UI.inputPageHeight.value = Math.round(State.sourcePageHeight);
      updateStatusBadge();
      recalculateImposition();
      if (typeof renderImpositionCanvas === 'function') renderImpositionCanvas();
      showToast(State.lang === 'en' ? `Page rotated: ${Math.round(State.sourcePageWidth)}×${Math.round(State.sourcePageHeight)} mm` : `Gaminys pasuktas: ${Math.round(State.sourcePageWidth)}×${Math.round(State.sourcePageHeight)} mm`);
    });
  }

  const btnAutoFit = document.getElementById('btnAutoFit');
  if (btnAutoFit) {
    btnAutoFit.addEventListener('click', (e) => {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      runAutoFit(e);
    });
  }
  const btnAutoFitMax = document.getElementById('btnAutoFitMax');
  if (btnAutoFitMax) {
    btnAutoFitMax.addEventListener('click', (e) => {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      runAutoFitMax(e);
    });
  }
  if (UI.btnLockGrid) UI.btnLockGrid.addEventListener('click', toggleGridLock);

  if (UI.checkAutoCenter) {
    UI.checkAutoCenter.addEventListener('change', (e) => {
      State.autoCenter = e.target.checked;
      if (typeof renderImpositionCanvas === 'function') renderImpositionCanvas();
      showToast(State.autoCenter ? 'Tinklelis centruojamas lanke' : 'Naudojamos fiksuotos paraštės');
    });
  }

  if (UI.selectMode) {
    UI.selectMode.addEventListener('change', (e) => {
      State.mode = e.target.value;
      recalculateImposition();
      if (typeof renderImpositionCanvas === 'function') renderImpositionCanvas();
    });
  }

  if (UI.inputPageWidth) {
    UI.inputPageWidth.addEventListener('input', (e) => {
      State.sourcePageWidth = parseFloat(e.target.value) || 148;
      updateStatusBadge();
      recalculateImposition();
      if (typeof renderImpositionCanvas === 'function') renderImpositionCanvas();
    });
  }
  if (UI.inputPageHeight) {
    UI.inputPageHeight.addEventListener('input', (e) => {
      State.sourcePageHeight = parseFloat(e.target.value) || 210;
      updateStatusBadge();
      recalculateImposition();
      if (typeof renderImpositionCanvas === 'function') renderImpositionCanvas();
    });
  }

  document.querySelectorAll('.quick-page-size').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const w = parseFloat(e.currentTarget.getAttribute('data-w'));
      const h = parseFloat(e.currentTarget.getAttribute('data-h'));
      if (w && h) {
        State.sourcePageWidth = w;
        State.sourcePageHeight = h;
        State.pageRotated = false;
        if (UI.inputPageWidth) UI.inputPageWidth.value = w;
        if (UI.inputPageHeight) UI.inputPageHeight.value = h;
        updateStatusBadge();
        recalculateImposition();
        if (typeof renderImpositionCanvas === 'function') renderImpositionCanvas();
        showToast(`Gaminio formatas: ${w}×${h} mm`);
      }
    });
  });

  if (UI.selectSheetPreset) {
    UI.selectSheetPreset.addEventListener('change', (e) => {
      const val = e.target.value;
      State.sheetPreset = val;
      const map = { 'SRA3': [320, 450], 'A3': [297, 420], 'SRA3Plus': [330, 488], 'B3': [353, 500], 'B2': [500, 700], 'B1': [700, 1000], 'A4': [210, 297] };
      if (map[val]) {
        State.sheetWidth = map[val][0];
        State.sheetHeight = map[val][1];
        if (UI.inputSheetWidth) UI.inputSheetWidth.value = State.sheetWidth;
        if (UI.inputSheetHeight) UI.inputSheetHeight.value = State.sheetHeight;
        recalculateImposition();
        if (typeof renderImpositionCanvas === 'function') renderImpositionCanvas();
      }
    });
  }

  if (UI.inputSheetWidth) {
    UI.inputSheetWidth.addEventListener('input', (e) => {
      State.sheetWidth = parseFloat(e.target.value) || 320;
      recalculateImposition();
      if (typeof renderImpositionCanvas === 'function') renderImpositionCanvas();
    });
  }
  if (UI.inputSheetHeight) {
    UI.inputSheetHeight.addEventListener('input', (e) => {
      State.sheetHeight = parseFloat(e.target.value) || 450;
      recalculateImposition();
      if (typeof renderImpositionCanvas === 'function') renderImpositionCanvas();
    });
  }

  if (UI.selectPrintStyle) {
    UI.selectPrintStyle.addEventListener('change', (e) => {
      State.printStyle = e.target.value;
      recalculateImposition();
      if (typeof renderImpositionCanvas === 'function') renderImpositionCanvas();
    });
  }

  if (UI.inputCols) {
    UI.inputCols.addEventListener('input', (e) => {
      State.combinationLayout = null;
      State.cols = Math.max(1, parseInt(e.target.value, 10) || 1);
      recalculateImposition();
      if (typeof renderImpositionCanvas === 'function') renderImpositionCanvas();
    });
  }
  if (UI.inputRows) {
    UI.inputRows.addEventListener('input', (e) => {
      State.combinationLayout = null;
      State.rows = Math.max(1, parseInt(e.target.value, 10) || 1);
      recalculateImposition();
      if (typeof renderImpositionCanvas === 'function') renderImpositionCanvas();
    });
  }
  if (UI.inputGutterX) {
    UI.inputGutterX.addEventListener('input', (e) => {
      State.gutterX = Math.max(0, parseFloat(e.target.value) || 0);
      recalculateImposition();
      if (typeof renderImpositionCanvas === 'function') renderImpositionCanvas();
    });
  }
  if (UI.inputGutterY) {
    UI.inputGutterY.addEventListener('input', (e) => {
      State.gutterY = Math.max(0, parseFloat(e.target.value) || 0);
      recalculateImposition();
      if (typeof renderImpositionCanvas === 'function') renderImpositionCanvas();
    });
  }
  if (UI.checkDuplicatePages) {
    UI.checkDuplicatePages.addEventListener('change', (e) => {
      State.duplicatePages = e.target.checked;
      recalculateImposition();
      if (typeof renderImpositionCanvas === 'function') renderImpositionCanvas();
    });
  }

  if (UI.inputMarginTop) {
    UI.inputMarginTop.addEventListener('input', (e) => {
      State.marginTop = Math.max(0, parseFloat(e.target.value) || 0);
      if (typeof renderImpositionCanvas === 'function') renderImpositionCanvas();
    });
  }
  if (UI.inputMarginSide) {
    UI.inputMarginSide.addEventListener('input', (e) => {
      State.marginSide = Math.max(0, parseFloat(e.target.value) || 0);
      if (typeof renderImpositionCanvas === 'function') renderImpositionCanvas();
    });
  }

  // Section 5 Bleed controls
  if (UI.inputBleed) {
    UI.inputBleed.addEventListener('input', (e) => {
      State.bleedMm = Math.max(0, parseFloat(e.target.value) || 0);
      updateSheetNavigationUI();
      if (typeof renderImpositionCanvas === 'function') renderImpositionCanvas();
    });
  }
  document.querySelectorAll('.quick-bleed-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.quick-bleed-btn').forEach(b => {
        b.className = 'quick-bleed-btn px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition cursor-pointer';
      });
      e.currentTarget.className = 'quick-bleed-btn px-2 py-1 rounded bg-amber-500 text-zinc-950 font-bold transition cursor-pointer';
      const bleed = parseFloat(e.currentTarget.getAttribute('data-bleed')) || 0;
      State.bleedMm = bleed;
      if (UI.inputBleed) UI.inputBleed.value = bleed;
      updateSheetNavigationUI();
      if (typeof renderImpositionCanvas === 'function') renderImpositionCanvas();
      showToast(`Užlaida: ${bleed} mm`);
    });
  });

  if (UI.btnMatchGuttersToBleed) {
    UI.btnMatchGuttersToBleed.addEventListener('click', () => {
      const matchGut = State.bleedMm * 2;
      State.gutterX = matchGut;
      State.gutterY = matchGut;
      if (UI.inputGutterX) UI.inputGutterX.value = matchGut;
      if (UI.inputGutterY) UI.inputGutterY.value = matchGut;
      if (typeof renderImpositionCanvas === 'function') renderImpositionCanvas();
      showToast(`Tarpai = ${matchGut} mm (2×${State.bleedMm}mm)`);
    });
  }

  if (UI.checkBleedBox) UI.checkBleedBox.addEventListener('change', (e) => { State.bleedBox = e.target.checked; if (typeof renderImpositionCanvas === 'function') renderImpositionCanvas(); });
  if (UI.checkBleedArtwork) UI.checkBleedArtwork.addEventListener('change', (e) => { State.bleedArtwork = e.target.checked; if (typeof renderImpositionCanvas === 'function') renderImpositionCanvas(); });
  if (UI.checkClipBleed) UI.checkClipBleed.addEventListener('change', (e) => { State.clipBleedToGutter = e.target.checked; if (typeof renderImpositionCanvas === 'function') renderImpositionCanvas(); });
  if (UI.checkZeroSpineBleed) UI.checkZeroSpineBleed.addEventListener('change', (e) => { State.bookletZeroSpineBleed = e.target.checked; if (typeof renderImpositionCanvas === 'function') renderImpositionCanvas(); });

  if (UI.checkAsymmetricBleed) {
    UI.checkAsymmetricBleed.addEventListener('change', (e) => {
      State.bleedAsymmetric = e.target.checked;
      if (UI.asymmetricBleedContainer) UI.asymmetricBleedContainer.classList.toggle('hidden', !e.target.checked);
      updateSheetNavigationUI();
      if (typeof renderImpositionCanvas === 'function') renderImpositionCanvas();
    });
  }
  [['inputBleedTop', 'bleedTop'], ['inputBleedBottom', 'bleedBottom'], ['inputBleedLeft', 'bleedLeft'], ['inputBleedRight', 'bleedRight']].forEach(([id, prop]) => {
    if (UI[id]) {
      UI[id].addEventListener('input', (e) => {
        State[prop] = Math.max(0, parseFloat(e.target.value) || 0);
        updateSheetNavigationUI();
        if (typeof renderImpositionCanvas === 'function') renderImpositionCanvas();
      });
    }
  });

  // Section 6 Marks controls (Defaults: cropMarks: true, minimal, others false)
  [
    ['checkCropMarks', 'cropMarks'], ['checkRegTargets', 'regTargets'], ['checkCmykBars', 'cmykBars'],
    ['checkSlugLine', 'slugLine'], ['checkFoldMarks', 'foldMarks'], ['checkCenterMarks', 'centerMarks'],
    ['checkCollatingMark', 'collatingMarks'], ['checkGripperMark', 'gripperMark'], ['checkPageLabels', 'pageLabels']
  ].forEach(([id, prop]) => {
    if (UI[id]) {
      UI[id].addEventListener('change', (e) => {
        State[prop] = e.target.checked;
        if (typeof renderImpositionCanvas === 'function') renderImpositionCanvas();
      });
    }
  });

  if (UI.checkMinimalCrops) {
    UI.checkMinimalCrops.addEventListener('change', (e) => {
      State.cropMarksMode = e.target.checked ? 'minimal' : 'full';
      if (typeof renderImpositionCanvas === 'function') renderImpositionCanvas();
    });
  }

  if (UI.selectCropStyle) {
    UI.selectCropStyle.addEventListener('change', (e) => {
      State.cropStyle = e.target.value;
      updateSheetNavigationUI();
      if (typeof renderImpositionCanvas === 'function') renderImpositionCanvas();
    });
  }
  if (UI.selectCropOffsetOrigin) {
    UI.selectCropOffsetOrigin.addEventListener('change', (e) => {
      State.cropOffsetOrigin = e.target.value;
      if (typeof renderImpositionCanvas === 'function') renderImpositionCanvas();
    });
  }
  if (UI.selectCropWeight) {
    UI.selectCropWeight.addEventListener('change', (e) => {
      State.cropWeight = parseFloat(e.target.value) || 0.25;
      updateSheetNavigationUI();
      if (typeof renderImpositionCanvas === 'function') renderImpositionCanvas();
    });
  }
  if (UI.selectMarkInking) {
    UI.selectMarkInking.addEventListener('change', (e) => {
      State.markInking = e.target.value;
      if (typeof renderImpositionCanvas === 'function') renderImpositionCanvas();
    });
  }
  if (UI.inputCropLength) {
    UI.inputCropLength.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      State.cropLength = !isNaN(val) ? Math.max(1, val) : 5;
      updateSheetNavigationUI();
      if (typeof renderImpositionCanvas === 'function') renderImpositionCanvas();
    });
  }
  if (UI.inputCropOffset) {
    UI.inputCropOffset.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      State.cropOffset = !isNaN(val) ? Math.max(0, val) : 0;
      updateSheetNavigationUI();
      if (typeof renderImpositionCanvas === 'function') renderImpositionCanvas();
    });
  }

  document.querySelectorAll('.quick-crop-offset-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.quick-crop-offset-btn').forEach(b => {
        b.className = 'quick-crop-offset-btn px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 cursor-pointer';
      });
      e.currentTarget.className = 'quick-crop-offset-btn px-1.5 py-0.5 rounded bg-amber-500 text-zinc-950 font-bold cursor-pointer';
      const offset = parseFloat(e.currentTarget.getAttribute('data-offset'));
      State.cropOffset = !isNaN(offset) ? offset : 2;
      if (UI.inputCropOffset) UI.inputCropOffset.value = State.cropOffset;
      updateSheetNavigationUI();
      if (typeof renderImpositionCanvas === 'function') renderImpositionCanvas();
      showToast(`Atitraukimas: ${State.cropOffset} mm`);
    });
  });

  document.querySelectorAll('.quick-crop-len-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.quick-crop-len-btn').forEach(b => {
        b.className = 'quick-crop-len-btn px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 cursor-pointer';
      });
      e.currentTarget.className = 'quick-crop-len-btn px-1.5 py-0.5 rounded bg-amber-500 text-zinc-950 font-bold cursor-pointer';
      const len = parseFloat(e.currentTarget.getAttribute('data-len'));
      State.cropLength = !isNaN(len) ? len : 5;
      if (UI.inputCropLength) UI.inputCropLength.value = State.cropLength;
      updateSheetNavigationUI();
      if (typeof renderImpositionCanvas === 'function') renderImpositionCanvas();
      showToast(`Ilgis: ${State.cropLength} mm`);
    });
  });

  // Section 7 Plotter & CutContour controls
  if (UI.checkCutContourEnabled) {
    UI.checkCutContourEnabled.addEventListener('change', (e) => {
      State.cutContourEnabled = e.target.checked;
      if (typeof renderImpositionCanvas === 'function') renderImpositionCanvas();
      showToast(State.cutContourEnabled ? 'Kirtimo kontūras įjungtas (+2mm)' : 'Kirtimo kontūras išjungtas');
    });
  }
  if (UI.selectContourMode) {
    UI.selectContourMode.addEventListener('change', (e) => {
      State.contourMode = e.target.value;
      if (typeof renderImpositionCanvas === 'function') renderImpositionCanvas();
    });
  }
  if (UI.btnDemoSticker) {
    UI.btnDemoSticker.addEventListener('click', loadDemoSticker);
  }
  if (UI.inputCutOffset) {
    UI.inputCutOffset.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      State.cutOffsetMm = !isNaN(val) ? val : 2;
      if (UI.cutOffsetLabel) UI.cutOffsetLabel.textContent = `+${State.cutOffsetMm.toFixed(1)} mm`;
      if (typeof renderImpositionCanvas === 'function') renderImpositionCanvas();
    });
  }
  document.querySelectorAll('.quick-cut-offset').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.quick-cut-offset').forEach(b => {
        b.className = 'quick-cut-offset px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition cursor-pointer';
      });
      e.currentTarget.className = 'quick-cut-offset px-2 py-1 rounded bg-fuchsia-500 text-zinc-950 font-bold transition cursor-pointer';
      const off = parseFloat(e.currentTarget.getAttribute('data-val'));
      State.cutOffsetMm = !isNaN(off) ? off : 2;
      if (UI.inputCutOffset) UI.inputCutOffset.value = State.cutOffsetMm;
      if (UI.cutOffsetLabel) UI.cutOffsetLabel.textContent = `+${State.cutOffsetMm.toFixed(1)} mm`;
      if (typeof renderImpositionCanvas === 'function') renderImpositionCanvas();
      showToast(`Kirtimo linija: +${State.cutOffsetMm} mm`);
    });
  });
  if (UI.checkPlotterMarks) UI.checkPlotterMarks.addEventListener('change', (e) => { State.plotterMarks = e.target.checked; if (typeof renderImpositionCanvas === 'function') renderImpositionCanvas(); });
  if (UI.checkExportBothSheets) UI.checkExportBothSheets.addEventListener('change', (e) => { State.exportBothSheets = e.target.checked; });

  if (UI.btnToggleCutView) {
    UI.btnToggleCutView.addEventListener('click', () => {
      State.viewCutSheet = !State.viewCutSheet;
      if (State.viewCutSheet) {
        UI.btnToggleCutView.className = 'px-2 py-0.5 bg-fuchsia-500 text-zinc-950 font-black rounded-xl shadow transition text-[10px] sm:text-[11px] flex items-center gap-1 cursor-pointer';
        if (UI.labelCutView) UI.labelCutView.textContent = 'Spauda';
        showToast('Rodomas Kirtimo lankas (Cut Sheet)', 'info');
      } else {
        UI.btnToggleCutView.className = 'px-2 py-0.5 bg-zinc-950 hover:bg-zinc-800 text-zinc-400 border border-zinc-800 rounded-xl transition text-[10px] sm:text-[11px] font-bold flex items-center gap-1 cursor-pointer';
        if (UI.labelCutView) UI.labelCutView.textContent = 'Kirtimas';
        showToast('Rodomas Spaudos lankas (Print Sheet)');
      }
      if (typeof renderImpositionCanvas === 'function') renderImpositionCanvas();
    });
  }

  // Presets catalog filter buttons
  document.querySelectorAll('.preset-filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.preset-filter-btn').forEach(b => {
        b.className = 'preset-filter-btn px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer transition';
      });
      e.target.className = 'preset-filter-btn px-2 py-0.5 rounded-full bg-amber-500 text-zinc-950 font-black cursor-pointer transition';
      renderPresetsCatalog(e.target.getAttribute('data-filter'));
    });
  });

  if (UI.selectPreset) {
    UI.selectPreset.addEventListener('change', (e) => {
      const pId = e.target.value;
      const preset = PresetsDB.find(p => p.id === pId);
      if (preset) applyPreset(preset);
    });
  }

  if (UI.btnExportPresets) UI.btnExportPresets.addEventListener('click', exportPresetsToJson);
  if (UI.btnImportPresets) UI.btnImportPresets.addEventListener('click', () => { if (UI.presetFileInput) UI.presetFileInput.click(); });
  if (UI.presetFileInput) {
    UI.presetFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) importPresetsFromJson(e.target.files[0]);
    });
  }

  // Preset save modal
  if (UI.btnSavePresetModal) UI.btnSavePresetModal.addEventListener('click', () => { if (UI.savePresetModalElement) UI.savePresetModalElement.classList.remove('hidden'); });
  const closePresetModal = () => { if (UI.savePresetModalElement) UI.savePresetModalElement.classList.add('hidden'); };
  if (UI.btnCancelPresetModal) UI.btnCancelPresetModal.addEventListener('click', closePresetModal);
  if (UI.btnCancelPresetModal2) UI.btnCancelPresetModal2.addEventListener('click', closePresetModal);
  if (UI.btnConfirmSavePreset) {
    UI.btnConfirmSavePreset.addEventListener('click', () => {
      const name = UI.modalPresetName?.value.trim() || `Šablonas ${PresetsDB.length + 1}`;
      const cat = UI.modalPresetCategory?.value || 'custom';
      PresetsDB.push({
        id: 'custom_' + Date.now(),
        name: { lt: name, en: name },
        desc: { lt: `Mano šablonas (${State.cols}×${State.rows})`, en: `Custom preset (${State.cols}×${State.rows})` },
        category: cat,
        mode: State.mode,
        pageW: State.sourcePageWidth,
        pageH: State.sourcePageHeight,
        pageCount: State.docPageCount,
        sheetW: State.sheetWidth,
        sheetH: State.sheetHeight,
        cols: State.cols,
        rows: State.rows,
        gutterX: State.gutterX,
        gutterY: State.gutterY,
        marginTop: State.marginTop,
        marginSide: State.marginSide,
        style: State.printStyle,
        duplicatePages: State.duplicatePages
      });
      closePresetModal();
      updatePresetDropdown(State.lang);
      showToast(State.lang === 'en' ? `Preset "${name}" saved!` : `Šablonas „${name}“ išsaugotas!`);
    });
  }

  // Custom sheet modal
  if (UI.btnSaveCustomSize) {
    UI.btnSaveCustomSize.addEventListener('click', () => {
      if (UI.saveSheetModalElement) UI.saveSheetModalElement.classList.remove('hidden');
    });
  }
  const closeSheetModal = () => { if (UI.saveSheetModalElement) UI.saveSheetModalElement.classList.add('hidden'); };
  if (UI.btnCancelSheetModal) UI.btnCancelSheetModal.addEventListener('click', closeSheetModal);
  if (UI.btnCancelSheetModal2) UI.btnCancelSheetModal2.addEventListener('click', closeSheetModal);
  if (UI.btnConfirmSaveSheet) {
    UI.btnConfirmSaveSheet.addEventListener('click', () => {
      const name = UI.modalSheetName?.value.trim() || 'Naujas dydis';
      const w = parseFloat(UI.modalSheetW?.value) || 320;
      const h = parseFloat(UI.modalSheetH?.value) || 450;
      const customKey = `custom_${w}x${h}`;
      if (UI.selectSheetPreset) {
        const opt = document.createElement('option');
        opt.value = customKey;
        opt.textContent = `${name} (${w} × ${h} mm)`;
        UI.selectSheetPreset.appendChild(opt);
        UI.selectSheetPreset.value = customKey;
      }
      State.sheetWidth = w;
      State.sheetHeight = h;
      State.sheetPreset = name;
      if (UI.inputSheetWidth) UI.inputSheetWidth.value = w;
      if (UI.inputSheetHeight) UI.inputSheetHeight.value = h;
      closeSheetModal();
      recalculateImposition();
      if (typeof renderImpositionCanvas === 'function') renderImpositionCanvas();
      showToast(`Dydis „${name}“ (${w}×${h} mm) pridėtas!`);
    });
  }

  // MANUAL SLOT MODAL BINDINGS
  document.querySelectorAll('.btn-slot-rot').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.btn-slot-rot').forEach(b => {
        b.className = 'btn-slot-rot px-2 py-1.5 rounded-lg border border-zinc-700 text-xs font-mono font-bold transition cursor-pointer text-center bg-zinc-800 text-zinc-300 hover:text-white';
      });
      e.currentTarget.className = 'btn-slot-rot px-2 py-1.5 rounded-lg border border-amber-400 text-xs font-mono font-bold transition cursor-pointer text-center bg-amber-500 text-zinc-950';
    });
  });

  const btnSetSlotEmpty = document.getElementById('btnSetSlotEmpty');
  if (btnSetSlotEmpty) {
    btnSetSlotEmpty.addEventListener('click', () => {
      const pageInput = document.getElementById('inputSlotPageNum');
      if (pageInput) pageInput.value = '';
    });
  }

  const closeSlotModal = () => {
    const modal = document.getElementById('slotEditModal');
    if (modal) modal.classList.add('hidden');
  };

  const btnCloseSlotModal = document.getElementById('btnCloseSlotModal');
  if (btnCloseSlotModal) btnCloseSlotModal.addEventListener('click', closeSlotModal);

  const btnCancelSlotModal = document.getElementById('btnCancelSlotModal');
  if (btnCancelSlotModal) btnCancelSlotModal.addEventListener('click', closeSlotModal);

  const btnSaveSlotConfig = document.getElementById('btnSaveSlotConfig');
  if (btnSaveSlotConfig) {
    btnSaveSlotConfig.addEventListener('click', () => {
      if (!State.activeEditingSlot) {
        closeSlotModal();
        return;
      }

      const pageInput = document.getElementById('inputSlotPageNum');
      const rawVal = pageInput ? pageInput.value.trim() : '';
      const parsedPage = parseInt(rawVal, 10);
      const page = (!isNaN(parsedPage) && parsedPage > 0) ? parsedPage : null;

      const activeRotBtn = document.querySelector('.btn-slot-rot.bg-amber-500');
      const rot = activeRotBtn ? (parseInt(activeRotBtn.getAttribute('data-rot'), 10) || 0) : 0;

      State.manualSlots[State.activeEditingSlot.key] = { page, rot };
      closeSlotModal();
      if (typeof renderImpositionCanvas === 'function') renderImpositionCanvas();

      if (page !== null) {
        showToast(`Langelis [${State.activeEditingSlot.col + 1}×${State.activeEditingSlot.row + 1}]: P.${page} (${rot}°)`);
      } else {
        showToast(`Langelis [${State.activeEditingSlot.col + 1}×${State.activeEditingSlot.row + 1}] nustatytas kaip tuščias`);
      }
    });
  }

  // Drag and drop PDF onto workspace
  const vp = UI.viewportContainer;
  const overlay = UI.dragDropOverlay;
  if (vp && overlay) {
    ['dragenter', 'dragover'].forEach(eventName => {
      vp.addEventListener(eventName, (e) => {
        e.preventDefault(); e.stopPropagation();
        overlay.classList.remove('opacity-0'); overlay.classList.add('opacity-100');
      });
    });
    ['dragleave', 'drop'].forEach(eventName => {
      vp.addEventListener(eventName, (e) => {
        e.preventDefault(); e.stopPropagation();
        overlay.classList.remove('opacity-100'); overlay.classList.add('opacity-0');
      });
    });
    vp.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      if (dt.files && dt.files[0]) handlePdfUpload(dt.files[0]);
    });
  }
}

/**
 * Global App Initialization on DOM ready.
 */
window.addEventListener('DOMContentLoaded', () => {
  cacheDomElements();
  setupZoomAndPanHandlers();
  setupEventListeners();
  applyUiTranslations(State.lang);
  updatePresetDropdown(State.lang);
  generateDemoPublication(16);

  const isNarrowMobile = window.innerWidth < 768 || /Android|iPhone|iPod|Mobile/i.test(navigator.userAgent);
  applyLayoutMode(isNarrowMobile ? 'mobile' : 'desktop');
});

window.addEventListener('load', () => {
  if (typeof renderImpositionCanvas === 'function') renderImpositionCanvas();
});

window.addEventListener('resize', () => {
  if (typeof renderImpositionCanvas === 'function') renderImpositionCanvas();
});
