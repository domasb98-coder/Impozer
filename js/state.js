// =============================================================
// IMPOZITOR PRO - js/state.js
// Global State, Presets Database & Localization Engine
// =============================================================

const UI = window.UI = {};

const State = window.State = {
  lang: (function() {
    try {
      return localStorage.getItem('impozitor_lang') || 'lt';
    } catch(e) {
      return 'lt';
    }
  })(),
  docPages: [],
  docPageCount: 16,
  sourcePageWidth: 148,
  sourcePageHeight: 210,
  sourcePdfBytes: null,
  pdfJsDoc: null,
  pageRenderCache: {},
  pageRenderInProgress: {},
  pdfFileName: '',

  activePresetId: 'p1',
  pageRotated: false,
  pageRotation: 0,
  get pageWidth() { return this.sourcePageWidth; },
  get pageHeight() { return this.sourcePageHeight; },
  combinationLayout: null,
  autoCenter: true,
  gridLocked: false,
  lockedGridConfig: null,

  sheetWidth: 320,
  sheetHeight: 450,
  sheetPreset: 'SRA3',
  printStyle: 'sheetwise', // 'sheetwise', 'workandturn', 'single'

  mode: 'booklet', // 'booklet', 'nup', 'cutstack', 'signatures', 'manual'
  cols: 2,
  rows: 1,
  gutterX: 0,
  gutterY: 0,
  duplicatePages: false,

  marginTop: 15,
  marginSide: 10,
  creepMm: 0,

  bleedMm: 3,
  bleedTop: 3,
  bleedBottom: 3,
  bleedLeft: 3,
  bleedRight: 3,
  bleedAsymmetric: false,
  bleedArtwork: true,
  bleedBox: true,
  clipBleedToGutter: true,
  bookletZeroSpineBleed: true,

  // Default marks: strictly cropMarks true & minimal, others false
  cropMarks: true,
  cropMarksMode: 'minimal',
  cropStyle: 'corner',
  cropOffsetOrigin: 'trim',
  cropWeight: 0.25,
  cropLength: 5,
  cropOffset: 2,
  markInking: 'reg',

  foldMarks: false,
  centerMarks: false,
  regTargets: false,
  cmykBars: false,
  slugLine: false,
  collatingMarks: false,
  gripperMark: false,
  pageLabels: false,

  cutContourEnabled: false,
  contourMode: 'shape',
  cutOffsetMm: 2,
  plotterMarks: true,
  exportBothSheets: true,
  viewCutSheet: false,

  currentSheetIndex: 0,
  currentSide: 'front',
  zoom: 0.92,
  viewRotation: 0,
  panX: 0,
  panY: 0,
  totalSheets: 4,

  layoutMode: 'desktop',
  mobileTab: 'split',

  // Manual Imposition Slot Assignments: key -> { page: number|null, rot: number }
  manualSlots: {},
  activeEditingSlot: null,

  autoPlayActive: false,
  autoPlayTimer: null
};

let PresetsDB = [
  {
    id: 'p1',
    name: { lt: 'Knygelė A5 SRA3 (Balnas)', en: 'A5 Booklet SRA3 (Saddle Stitch)' },
    desc: { lt: '16 psl. A5 brošiūra ant SRA3 lanko, 2x1 išdėstymas, Sheetwise dvipusė', en: '16-page A5 booklet on SRA3 sheet, 2x1 grid, Sheetwise duplex' },
    category: 'booklet', mode: 'booklet', pageW: 148, pageH: 210, pageCount: 16, sheetW: 320, sheetH: 450, cols: 2, rows: 1, gutterX: 0, gutterY: 0, marginTop: 15, marginSide: 10, style: 'sheetwise', duplicatePages: false
  },
  {
    id: 'p2',
    name: { lt: 'Knygelė A4 SRA3 Atvartas', en: 'A4 Booklet SRA3 Spread' },
    desc: { lt: '8 psl. A4 brošiūra ant SRA3 gulsčio lanko, 2x1 išdėstymas', en: '8-page A4 booklet on SRA3 landscape sheet, 2x1 grid' },
    category: 'booklet', mode: 'booklet', pageW: 210, pageH: 297, pageCount: 8, sheetW: 450, sheetH: 320, cols: 2, rows: 1, gutterX: 0, gutterY: 0, marginTop: 10, marginSide: 15, style: 'sheetwise', duplicatePages: false
  },
  {
    id: 'p3',
    name: { lt: 'Brošiūra A6 SRA3 (Balnas 8-up)', en: 'A6 Booklet SRA3 (Saddle 8-up)' },
    desc: { lt: '16 psl. A6 brošiūra ant SRA3, 2x2 išdėstymas', en: '16-page A6 booklet on SRA3, 2x2 grid' },
    category: 'booklet', mode: 'booklet', pageW: 105, pageH: 148, pageCount: 16, sheetW: 320, sheetH: 450, cols: 2, rows: 2, gutterX: 0, gutterY: 0, marginTop: 12, marginSide: 10, style: 'sheetwise', duplicatePages: false
  },
  {
    id: 'p4',
    name: { lt: 'Vizitinės 90×50 mm (24-up SRA3)', en: 'Business Cards 90×50 mm (24-up SRA3)' },
    desc: { lt: 'Standartinės vizitinės kortelės 90x50 mm, 3x8 tinklelis su 4 mm tarpais', en: 'Standard business cards 90x50 mm, 3x8 grid with 4mm gutters' },
    category: 'cards', mode: 'nup', pageW: 90, pageH: 50, pageCount: 1, sheetW: 320, sheetH: 450, cols: 3, rows: 8, gutterX: 4, gutterY: 4, marginTop: 10, marginSide: 10, style: 'sheetwise', duplicatePages: true
  },
  {
    id: 'p5',
    name: { lt: 'Euro Vizitinės 85×55 mm (25-up)', en: 'Euro Business Cards 85×55 mm (25-up)' },
    desc: { lt: 'Europinio standarto vizitinės 85x55 mm, 5x5 tinklelis su 3 mm tarpais', en: 'European standard business cards 85x55 mm, 5x5 grid with 3mm gutters' },
    category: 'cards', mode: 'nup', pageW: 85, pageH: 55, pageCount: 1, sheetW: 320, sheetH: 450, cols: 5, rows: 5, gutterX: 3, gutterY: 3, marginTop: 10, marginSide: 10, style: 'sheetwise', duplicatePages: true
  },
  {
    id: 'p6',
    name: { lt: 'Kvadratiniai lipdukai 50×50 mm (48-up)', en: 'Square Stickers 50×50 mm (48-up)' },
    desc: { lt: 'Kvadratiniai lipdukai 50x50 mm, 6x8 tinklelis, vienpusė spauda', en: 'Square stickers 50x50 mm, 6x8 grid, single-sided print' },
    category: 'cards', mode: 'nup', pageW: 50, pageH: 50, pageCount: 1, sheetW: 320, sheetH: 450, cols: 6, rows: 8, gutterX: 2, gutterY: 2, marginTop: 10, marginSide: 10, style: 'single', duplicatePages: true
  },
  {
    id: 'p7',
    name: { lt: 'Apvalūs / Kvadratiniai 40×40 mm (54-up)', en: 'Round / Square Badges 40×40 mm (54-up)' },
    desc: { lt: 'Smulkūs gaminiai 40x40 mm, 6x9 tinklelis ant SRA3', en: 'Small badges/stickers 40x40 mm, 6x9 grid on SRA3' },
    category: 'cards', mode: 'nup', pageW: 40, pageH: 40, pageCount: 1, sheetW: 320, sheetH: 450, cols: 6, rows: 9, gutterX: 3, gutterY: 3, marginTop: 10, marginSide: 10, style: 'single', duplicatePages: true
  },
  {
    id: 'p8',
    name: { lt: 'A6 Skrajutės 8-up SRA3', en: 'A6 Flyers 8-up SRA3' },
    desc: { lt: 'A6 skrajutės 105x148 mm, 2x4 tinklelis su 4 mm tarpais pjovimui', en: 'A6 flyers 105x148 mm, 2x4 grid with 4mm gutters for trim' },
    category: 'flyers', mode: 'nup', pageW: 105, pageH: 148, pageCount: 1, sheetW: 320, sheetH: 450, cols: 2, rows: 4, gutterX: 4, gutterY: 4, marginTop: 12, marginSide: 10, style: 'sheetwise', duplicatePages: true
  },
  {
    id: 'p9',
    name: { lt: 'A5 Skrajutės 4-up SRA3', en: 'A5 Flyers 4-up SRA3' },
    desc: { lt: 'A5 skrajutės 148x210 mm, 2x2 tinklelis ant SRA3 lanko', en: 'A5 flyers 148x210 mm, 2x2 grid on SRA3 sheet' },
    category: 'flyers', mode: 'nup', pageW: 148, pageH: 210, pageCount: 1, sheetW: 320, sheetH: 450, cols: 2, rows: 2, gutterX: 4, gutterY: 4, marginTop: 12, marginSide: 10, style: 'sheetwise', duplicatePages: true
  },
  {
    id: 'p10',
    name: { lt: 'DL Skrajutės 6-up SRA3 (99×210)', en: 'DL Flyers 6-up SRA3 (99×210)' },
    desc: { lt: 'DL formato lankstinukai / skrajutės 99x210 mm, 3x2 tinklelis', en: 'DL format flyers 99x210 mm, 3x2 grid' },
    category: 'flyers', mode: 'nup', pageW: 99, pageH: 210, pageCount: 1, sheetW: 320, sheetH: 450, cols: 3, rows: 2, gutterX: 4, gutterY: 4, marginTop: 12, marginSide: 10, style: 'sheetwise', duplicatePages: true
  },
  {
    id: 'p11',
    name: { lt: 'A3 Plakatas Vienpusis (1-up SRA3)', en: 'A3 Poster Single-sided (1-up SRA3)' },
    desc: { lt: 'A3 plakatas 297x420 mm su pilnomis užlaidomis ant SRA3 lanko', en: 'A3 poster 297x420 mm with full bleeds on SRA3 sheet' },
    category: 'flyers', mode: 'nup', pageW: 297, pageH: 420, pageCount: 1, sheetW: 320, sheetH: 450, cols: 1, rows: 1, gutterX: 0, gutterY: 0, marginTop: 15, marginSide: 11.5, style: 'single', duplicatePages: false
  },
  {
    id: 'p12',
    name: { lt: 'A4 Lapeliai 2-up SRA3', en: 'A4 Sheets 2-up SRA3' },
    desc: { lt: 'A4 lapeliai 210x297 mm, 1x2 išdėstymas ant SRA3 lanko', en: 'A4 sheets 210x297 mm, 1x2 layout on SRA3 sheet' },
    category: 'flyers', mode: 'nup', pageW: 210, pageH: 297, pageCount: 1, sheetW: 320, sheetH: 450, cols: 1, rows: 2, gutterX: 0, gutterY: 4, marginTop: 12, marginSide: 10, style: 'sheetwise', duplicatePages: true
  },
  {
    id: 'p13',
    name: { lt: 'Pjauk & Krauk Bilietai / Talonai 12-up', en: 'Cut & Stack Tickets / Vouchers 12-up' },
    desc: { lt: 'Bilietai 70x100 mm, 3x4 tinklelis pjovimui ir rietuvavimui iš eilės', en: 'Tickets 70x100 mm, 3x4 grid for sequential guillotine cut & stack' },
    category: 'cutstack', mode: 'cutstack', pageW: 70, pageH: 100, pageCount: 24, sheetW: 320, sheetH: 450, cols: 3, rows: 4, gutterX: 0, gutterY: 0, marginTop: 15, marginSide: 10, style: 'sheetwise', duplicatePages: false
  },
  {
    id: 'p14',
    name: { lt: 'Pjauk & Krauk A6 Atvirukai 8-up', en: 'Cut & Stack A6 Postcards 8-up' },
    desc: { lt: 'A6 atvirukai 105x148 mm, 2x4 tinklelis su greitu lankų pjovimu ir rietuvavimu', en: 'A6 postcards 105x148 mm, 2x4 grid with direct cut & stacking' },
    category: 'cutstack', mode: 'cutstack', pageW: 105, pageH: 148, pageCount: 32, sheetW: 320, sheetH: 450, cols: 2, rows: 4, gutterX: 0, gutterY: 0, marginTop: 15, marginSide: 10, style: 'sheetwise', duplicatePages: false
  },
  {
    id: 'p15',
    name: { lt: 'Ofsetas B2 Knygos Lankas 16-psl. (500×700)', en: 'Offset B2 Book Signature 16-page (500×700)' },
    desc: { lt: '16 puslapių ofsetinis spaudos lankas ant B2 formato', en: '16-page offset press signature sheet on B2 format' },
    category: 'offset', mode: 'booklet', pageW: 148, pageH: 210, pageCount: 16, sheetW: 500, sheetH: 700, cols: 4, rows: 2, gutterX: 0, gutterY: 0, marginTop: 20, marginSide: 15, style: 'sheetwise', duplicatePages: false
  },
  {
    id: 'p16',
    name: { lt: 'Ofsetas B1 32-psl. Lankas (700×1000)', en: 'Offset B1 32-page Signature (700×1000)' },
    desc: { lt: 'Didelio formato 32 puslapių ofsetinis lankas ant B1 formato', en: 'Large-format 32-page offset signature on B1 sheet' },
    category: 'offset', mode: 'booklet', pageW: 148, pageH: 210, pageCount: 32, sheetW: 700, sheetH: 1000, cols: 4, rows: 4, gutterX: 0, gutterY: 0, marginTop: 25, marginSide: 20, style: 'sheetwise', duplicatePages: false
  }
];

function getPresetName(preset, lang = (State ? State.lang : 'lt')) {
  if (!preset) return '';
  if (typeof preset.name === 'object' && preset.name !== null) {
    return preset.name[lang] || preset.name.lt || preset.name.en || '';
  }
  return String(preset.name || '');
}

function getPresetDesc(preset, lang = (State ? State.lang : 'lt')) {
  if (!preset) return '';
  if (typeof preset.desc === 'object' && preset.desc !== null) {
    return preset.desc[lang] || preset.desc.lt || preset.desc.en || '';
  }
  return String(preset.desc || '');
}

// -------------------------------------------------------------
// DVIKALBYSTĖS ŽODYNAS (i18n), DICT IR t() VERTĖJAS
// -------------------------------------------------------------
const dict = {
  lt: {
    Front: 'Priekis',
    Back: 'Nugara',
    Sheet: 'Lankas',
    Page: 'Puslapis',
    Bleed: 'Užlaida',
    Margins: 'Paraštės',
    Export: 'Eksportuoti',
    Open: 'Atidaryti',
    Item: 'Vnt.',
    Empty: 'TUŠČIAS',
    GripperEdge: 'GRIEBTUVAS (GRIPPER EDGE 12mm)',
    CutSheet: 'KIRTIMO LANKAS',
    PrintSheet: 'SPAUDOS LANKAS',
    PlotterSheet: 'PLOTERIO LANKAS (DUPLIKATAS)'
  },
  en: {
    Front: 'Front',
    Back: 'Back',
    Sheet: 'Sheet',
    Page: 'Page',
    Bleed: 'Bleed',
    Margins: 'Margins',
    Export: 'Export',
    Open: 'Open',
    Item: 'Item',
    Empty: 'EMPTY',
    GripperEdge: 'GRIPPER EDGE (12mm)',
    CutSheet: 'CUT SHEET',
    PrintSheet: 'PRINT SHEET',
    PlotterSheet: 'PLOTTER SHEET (DUPLICATE)'
  }
};

const t = (key) => (dict[State.lang] && dict[State.lang][key]) || key;

const i18n = {
  lt: { pages: 'psl.', open: 'Atidaryti', export: 'Eksportuoti', front: 'Priekis', back: 'Nugara' },
  en: { pages: 'pages', open: 'Open', export: 'Export', front: 'Front', back: 'Back' }
};

function applyUiTranslations(lang) {
  if (!lang) lang = State.lang || 'lt';
  const isEn = lang === 'en';
  State.lang = lang;
  try {
    localStorage.setItem('impozitor_lang', lang);
  } catch (e) {}

  const updateLangBtnStyle = (btnLt, btnEn) => {
    if (!btnLt || !btnEn) return;
    if (isEn) {
      btnLt.className = 'px-2 py-0.5 rounded-lg text-[10px] font-bold font-mono transition text-zinc-400 hover:text-white cursor-pointer';
      btnEn.className = 'px-2 py-0.5 rounded-lg text-[10px] font-bold font-mono transition bg-amber-500 text-zinc-950 font-black cursor-pointer shadow';
    } else {
      btnLt.className = 'px-2 py-0.5 rounded-lg text-[10px] font-bold font-mono transition bg-amber-500 text-zinc-950 font-black cursor-pointer shadow';
      btnEn.className = 'px-2 py-0.5 rounded-lg text-[10px] font-bold font-mono transition text-zinc-400 hover:text-white cursor-pointer';
    }
  };
  updateLangBtnStyle(UI.btnLangLt, UI.btnLangEn);
  updateLangBtnStyle(UI.btnLangLtMobile, UI.btnLangEnMobile);

  const setText = (sel, text) => {
    const el = typeof sel === 'string' ? document.querySelector(sel) : sel;
    if (el) el.textContent = text;
  };
  const setTitle = (sel, title) => {
    const el = typeof sel === 'string' ? document.querySelector(sel) : sel;
    if (el) el.title = title;
  };
  const setPlaceholder = (sel, ph) => {
    const el = typeof sel === 'string' ? document.querySelector(sel) : sel;
    if (el) el.placeholder = ph;
  };

  setText('#btnOpenPdf span', isEn ? 'Open' : 'Atidaryti');
  setTitle('#btnOpenPdf', isEn ? 'Open PDF file' : 'Atidaryti PDF failą');
  setText('#btnSavePdf span', isEn ? 'Export' : 'Eksportuoti');
  setTitle('#btnSavePdf', isEn ? 'Export print-ready PDF' : 'Išsaugoti spaudos PDF');
  setTitle('#btnSampleDoc', isEn ? 'Generate 16-page demo publication' : 'Sugeneruoti 16 psl. pavyzdinį leidinį');
  setTitle('#btnPrevSheet', isEn ? 'Previous sheet' : 'Ankstesnis lankas');
  setTitle('#btnNextSheet', isEn ? 'Next sheet' : 'Kitas lankas');
  setTitle('#btnAutoPlay', isEn ? 'Auto-flip sheets' : 'Automatinis peržiūros vartymas');
  setText('#btnSideFront', isEn ? 'Front' : 'Priekis');
  setText('#btnSideBack', isEn ? 'Back' : 'Nugara');
  if (UI.labelCutView) UI.labelCutView.textContent = State.viewCutSheet ? (isEn ? 'Print' : 'Spauda') : (isEn ? 'Cut' : 'Kirtimas');
  setTitle('#btnToggleCutView', isEn ? 'Toggle Print / Cut sheet preview' : 'Perjungti tarp spaudos ir kirtimo lanko peržiūros');
  setTitle('#btnLayoutToggle', isEn ? 'Toggle Desktop / Mobile layout' : 'Perjungti tarp PC ir Mobilaus išdėstymo');

  setText('#tabBtnPreview', isEn ? 'Preview' : 'Peržiūra');
  setText('#tabBtnSplit', isEn ? 'Split' : 'Abu');
  setText('#tabBtnSettings', isEn ? 'Settings' : 'Nustatymai');

  setText('#dragDropOverlay [data-i18n="drop_pdf"]', isEn ? 'DROP PDF FILE HERE' : 'UŽTEMPKITE PDF FAILĄ ČIA');
  setText('#dragDropOverlay [data-i18n="drop_sub"]', isEn ? 'Page dimensions and count will be auto-detected' : 'Automatiškai nuskaitysime puslapių dydį ir kiekį');

  setTitle('#btnZoomOutFloat', isEn ? 'Zoom out' : 'Nutolinti');
  setTitle('#btnZoomInFloat', isEn ? 'Zoom in' : 'Priartinti');
  setTitle('#btnZoomFitFloat', isEn ? 'Fit to window' : 'Pritaikyti langui');
  setTitle('#btnZoom100Float', isEn ? '100% scale' : '100% mastelis');
  setTitle('#btnZoomResetPan', isEn ? 'Center sheet' : 'Centruoti lanką');

  const presetHeader = document.querySelector('#settingsArea .fa-bookmark')?.parentElement;
  if (presetHeader) {
    presetHeader.innerHTML = `<i class="fa-solid fa-bookmark text-amber-400"></i> ${isEn ? 'Ready Presets' : 'Gatavi Šablonai'}`;
  }
  setText('#btnSavePresetModal', isEn ? '+ Save' : '+ Įrašyti');
  setTitle('#btnExportPresets', isEn ? 'Export presets to .json file' : 'Eksportuoti šablonus į .json failą');
  setTitle('#btnImportPresets', isEn ? 'Import presets from .json file' : 'Importuoti šablonus iš .json failo');
  setText('.preset-filter-btn[data-filter="all"]', isEn ? 'All' : 'Visi');
  setText('.preset-filter-btn[data-filter="booklet"]', isEn ? 'Booklets' : 'Knygelės');
  setText('.preset-filter-btn[data-filter="cards"]', isEn ? 'Cards' : 'Vizitinės');
  setText('.preset-filter-btn[data-filter="flyers"]', isEn ? 'Flyers' : 'Skrajutės');
  setText('.preset-filter-btn[data-filter="cutstack"]', 'Cut&Stack');
  setText('.preset-filter-btn[data-filter="offset"]', isEn ? 'Offset' : 'Ofsetas');
  setText('.preset-filter-btn[data-filter="custom"]', isEn ? 'Custom' : 'Mano');

  const sec1Header = document.querySelector('#selectMode')?.closest('.space-y-1\\.5')?.querySelector('label span');
  if (sec1Header) sec1Header.textContent = isEn ? '1. Imposition Mode' : '1. Impozicijos Režimas';
  const selMode = document.getElementById('selectMode');
  if (selMode && selMode.options.length >= 4) {
    selMode.options[0].textContent = isEn ? 'Booklet (Saddle Stitch)' : 'Knygelė (Balnas / Saddle Stitch)';
    selMode.options[1].textContent = isEn ? 'N-Up / Step & Repeat' : 'N-Up / Dauginimas (Step & Repeat)';
    selMode.options[2].textContent = isEn ? 'Cut & Stack' : 'Pjauk ir krauk (Cut & Stack)';
    selMode.options[3].textContent = isEn ? 'Book Signatures (16-up)' : 'Knygos lankai (Signatures 16-up)';
    if (selMode.options[4]) {
      selMode.options[4].textContent = isEn ? '✋ Manual (Click cell on canvas)' : '✋ Rankinis (Spausk ant langelio)';
    }
  }

  const secTrimHeader = document.querySelector('#btnRotatePage')?.closest('.space-y-2')?.querySelector('label span');
  if (secTrimHeader) secTrimHeader.textContent = isEn ? 'Product Size (Trim)' : 'Gaminio Formatas (Trim)';
  setTitle('#btnRotatePage', isEn ? 'Rotate product 90°' : 'Pasukti gaminį 90° kampu');
  const inputPageW = document.getElementById('inputPageWidth');
  if (inputPageW?.parentElement?.querySelector('span')) inputPageW.parentElement.querySelector('span').textContent = isEn ? 'Width (mm)' : 'Plotis (mm)';
  const inputPageH = document.getElementById('inputPageHeight');
  if (inputPageH?.parentElement?.querySelector('span')) inputPageH.parentElement.querySelector('span').textContent = isEn ? 'Height (mm)' : 'Aukštis (mm)';

  const secSheetHeader = document.querySelector('#selectSheetPreset')?.closest('.space-y-2')?.querySelector('label');
  if (secSheetHeader) secSheetHeader.textContent = isEn ? '2. Press Sheet Size' : '2. Spaudos Lankas';
  setText('#btnSaveCustomSize', isEn ? '+ Custom size' : '+ Naujas dydis');
  const selSheet = document.getElementById('selectSheetPreset');
  if (selSheet) {
    const optCustom = selSheet.querySelector('option[value="custom"]');
    if (optCustom) optCustom.textContent = isEn ? '-- Custom dimensions --' : '-- Įvesti rankiniu būdu --';
  }
  const inputSheetW = document.getElementById('inputSheetWidth');
  if (inputSheetW?.parentElement?.querySelector('span')) inputSheetW.parentElement.querySelector('span').textContent = isEn ? 'Width (mm)' : 'Plotis (mm)';
  const inputSheetH = document.getElementById('inputSheetHeight');
  if (inputSheetH?.parentElement?.querySelector('span')) inputSheetH.parentElement.querySelector('span').textContent = isEn ? 'Height (mm)' : 'Aukštis (mm)';
  const printStyleLabel = document.querySelector('#selectPrintStyle')?.previousElementSibling;
  if (printStyleLabel) printStyleLabel.textContent = isEn ? 'Print Style:' : 'Spaudos būdas:';
  const selStyle = document.getElementById('selectPrintStyle');
  if (selStyle && selStyle.options.length >= 3) {
    selStyle.options[0].textContent = isEn ? 'Sheetwise (Front / Back)' : 'Dvipusė (Sheetwise P/N)';
    selStyle.options[1].textContent = isEn ? 'Work & Turn' : 'Apvertimas (Work & Turn)';
    selStyle.options[2].textContent = isEn ? 'Single-sided (4+0)' : 'Vienpusė (Single-sided 4+0)';
  }

  const secGridHeader = document.querySelector('#btnAutoFitMax')?.closest('.space-y-2')?.querySelector('label');
  if (secGridHeader) secGridHeader.textContent = isEn ? '3. Imposition Grid' : '3. Išdėstymo Tinklelis';
  setTitle('#btnAutoFitMax', isEn ? 'Find optimal layout' : 'Rasti optimaliausią išdėstymą');
  setTitle('#btnLockGrid', isEn ? 'Lock grid configuration' : 'Užfiksuoti tinklelio parametrus');
  if (UI.labelLockGrid) UI.labelLockGrid.textContent = State.gridLocked ? (isEn ? 'Locked' : 'Užfiksuota') : (isEn ? 'Lock' : 'Fiksuoti');
  const inputCols = document.getElementById('inputCols');
  if (inputCols?.parentElement?.querySelector('span')) inputCols.parentElement.querySelector('span').textContent = isEn ? 'Columns (X)' : 'Stulpeliai (X)';
  const inputRows = document.getElementById('inputRows');
  if (inputRows?.parentElement?.querySelector('span')) inputRows.parentElement.querySelector('span').textContent = isEn ? 'Rows (Y)' : 'Eilutės (Y)';
  const inputGutX = document.getElementById('inputGutterX');
  if (inputGutX?.parentElement?.querySelector('span')) inputGutX.parentElement.querySelector('span').textContent = isEn ? 'Gutter X (mm)' : 'Tarpas X (mm)';
  const inputGutY = document.getElementById('inputGutterY');
  if (inputGutY?.parentElement?.querySelector('span')) inputGutY.parentElement.querySelector('span').textContent = isEn ? 'Gutter Y (mm)' : 'Tarpas Y (mm)';
  const dupSpan = document.querySelector('#checkDuplicatePages')?.nextElementSibling;
  if (dupSpan) dupSpan.textContent = isEn ? 'Duplicate page (Step & Repeat)' : 'Kartoti puslapį (Step & Repeat)';

  const secMarginHeader = document.querySelector('#checkAutoCenter')?.closest('.space-y-2')?.querySelector('label');
  if (secMarginHeader) secMarginHeader.textContent = isEn ? '4. Margins & Creep' : '4. Paraštės ir Poslinkis (Creep)';
  const autoCenterSpan = document.querySelector('#checkAutoCenter')?.nextElementSibling;
  if (autoCenterSpan) autoCenterSpan.textContent = isEn ? 'Center on sheet' : 'Centruoti lanke';
  const inputMarTop = document.getElementById('inputMarginTop');
  if (inputMarTop?.parentElement?.querySelector('span')) inputMarTop.parentElement.querySelector('span').textContent = isEn ? 'Gripper / Top (mm)' : 'Griebtuvas / Viršus (mm)';
  const inputMarSide = document.getElementById('inputMarginSide');
  if (inputMarSide?.parentElement?.querySelector('span')) inputMarSide.parentElement.querySelector('span').textContent = isEn ? 'Side Margin (mm)' : 'Šoninė paraštė (mm)';
  const creepLabel = document.querySelector('#inputCreep')?.previousElementSibling?.firstElementChild;
  if (creepLabel) creepLabel.textContent = isEn ? 'Booklet creep compensation (mm)' : 'Knygelės creep kompensavimas (mm)';

  const secBleedHeader = document.querySelector('#btnMatchGuttersToBleed')?.closest('.space-y-2\\.5')?.querySelector('label span');
  if (secBleedHeader) secBleedHeader.textContent = isEn ? '5. Bleed Settings' : '5. Užlaidos (Bleed) Nustatymai';
  const btnMatchG = document.getElementById('btnMatchGuttersToBleed');
  if (btnMatchG) {
    btnMatchG.innerHTML = `<i class="fa-solid fa-bolt text-[8px]"></i> ${isEn ? 'Gutters = 2× Bleed' : 'Tarpai = 2× Bleed'}`;
    btnMatchG.title = isEn ? 'Match gutter spacing to 2× bleed' : 'Nustatyti tarpus tarp gaminių lygius 2× užlaida';
  }
  const bleedTotalLabel = document.querySelector('#inputBleed')?.closest('div')?.previousElementSibling?.firstElementChild;
  if (bleedTotalLabel) bleedTotalLabel.textContent = isEn ? 'Total Bleed (mm):' : 'Bendra užlaida (Bleed mm):';
  const bleedBoxSpan = document.querySelector('#checkBleedBox')?.nextElementSibling;
  if (bleedBoxSpan) bleedBoxSpan.textContent = isEn ? 'Show Bleed Box' : 'Rodyti Bleed Box';
  const bleedArtSpan = document.querySelector('#checkBleedArtwork')?.nextElementSibling;
  if (bleedArtSpan) bleedArtSpan.textContent = isEn ? 'Bleed Artwork' : 'Užlaidų išliejimas';
  const clipBleedSpan = document.querySelector('#checkClipBleed')?.nextElementSibling;
  if (clipBleedSpan) clipBleedSpan.textContent = isEn ? 'Clip at 50% gutter' : 'Riboti ties 50% tarpo';
  const zeroSpineSpan = document.querySelector('#checkZeroSpineBleed')?.nextElementSibling;
  if (zeroSpineSpan) zeroSpineSpan.textContent = isEn ? '0mm at spine' : '0mm ties nugarėle';
  const asymmSpan = document.querySelector('#checkAsymmetricBleed')?.nextElementSibling;
  if (asymmSpan) asymmSpan.textContent = isEn ? 'Separate asymmetric bleeds (T/B/L/R)' : 'Atskiros asimetrinės užlaidos (V/A/K/D)';
  const asymmBox = document.getElementById('asymmetricBleedContainer');
  if (asymmBox) {
    const labels = asymmBox.querySelectorAll('span');
    if (labels.length >= 4) {
      labels[0].textContent = isEn ? 'Top' : 'Viršus';
      labels[1].textContent = isEn ? 'Bottom' : 'Apačia';
      labels[2].textContent = isEn ? 'Left/In' : 'Kairė/Vid.';
      labels[3].textContent = isEn ? 'Right/Out' : 'Dešinė/Išor.';
    }
  }

  const secMarksHeader = document.querySelector('#checkCropMarks')?.closest('.space-y-3')?.querySelector('label span');
  if (secMarksHeader) secMarksHeader.textContent = isEn ? '6. Print & Crop Marks' : '6. Spaudos ir Pjovimo Žymės';
  const cropMarksSpan = document.querySelector('#checkCropMarks')?.nextElementSibling;
  if (cropMarksSpan) cropMarksSpan.textContent = isEn ? 'Crop Marks' : 'Pjovimo žymės';
  const foldMarksSpan = document.querySelector('#checkFoldMarks')?.nextElementSibling;
  if (foldMarksSpan) foldMarksSpan.textContent = isEn ? 'Fold Marks' : 'Lankstymo žymės';
  const centerMarksSpan = document.querySelector('#checkCenterMarks')?.nextElementSibling;
  if (centerMarksSpan) centerMarksSpan.textContent = isEn ? 'Center Marks' : 'Centro / Ašinės';
  const regTargetsSpan = document.querySelector('#checkRegTargets')?.nextElementSibling;
  if (regTargetsSpan) regTargetsSpan.textContent = isEn ? 'Reg Targets' : 'Taikiniai (Reg)';
  const cmykBarsSpan = document.querySelector('#checkCmykBars')?.nextElementSibling;
  if (cmykBarsSpan) cmykBarsSpan.textContent = isEn ? 'CMYK Color Bar' : 'CMYK juostelė';
  const slugLineSpan = document.querySelector('#checkSlugLine')?.nextElementSibling;
  if (slugLineSpan) slugLineSpan.textContent = isEn ? 'Slug Line' : 'Info eilutė (Slug)';
  const collatingSpan = document.querySelector('#checkCollatingMark')?.nextElementSibling;
  if (collatingSpan) collatingSpan.textContent = isEn ? 'Collating Mark' : 'Surinkimo laiptelis';
  const gripperSpan = document.querySelector('#checkGripperMark')?.nextElementSibling;
  if (gripperSpan) gripperSpan.textContent = isEn ? 'Gripper Mark' : 'Griebtuvo žymė';
  const pageLabelsSpan = document.querySelector('#checkPageLabels')?.nextElementSibling;
  if (pageLabelsSpan) pageLabelsSpan.textContent = isEn ? 'Page Numbers at Cuts' : 'Puslapių numeriai prie pjūvių';

  const selCropStyle = document.getElementById('selectCropStyle');
  if (selCropStyle?.parentElement?.querySelector('span')) selCropStyle.parentElement.querySelector('span').textContent = isEn ? 'Marks Style' : 'Žymių stilius';
  if (selCropStyle && selCropStyle.options.length >= 6) {
    selCropStyle.options[0].textContent = isEn ? 'Corner (L-shape)' : 'Kampinis (Corner L)';
    selCropStyle.options[1].textContent = isEn ? 'Double (Bleed + Trim)' : 'Dvigubas (Japonų Bleed+Trim)';
    selCropStyle.options[2].textContent = isEn ? 'Gutter Cuts (Continuous)' : 'Pjūviai tarpuose (Ištisiniai)';
    selCropStyle.options[3].textContent = isEn ? 'Crosshairs' : 'Kryžminis (Crosshairs)';
    selCropStyle.options[4].textContent = isEn ? 'Minimal (Ticks 2.5mm)' : 'Minimalus (Short Ticks 2.5mm)';
    selCropStyle.options[5].textContent = isEn ? 'Perimeter Only' : 'Tik lanko perimetras';
  }

  const selOffsetOrig = document.getElementById('selectCropOffsetOrigin');
  if (selOffsetOrig?.parentElement?.querySelector('span')) selOffsetOrig.parentElement.querySelector('span').textContent = isEn ? 'Offset Origin' : 'Atitraukimo atskaita';
  if (selOffsetOrig && selOffsetOrig.options.length >= 2) {
    selOffsetOrig.options[0].textContent = isEn ? 'From Trim Line' : 'Nuo Trim linijos';
    selOffsetOrig.options[1].textContent = isEn ? 'Safe (Outside Bleed)' : 'Saugus (Už Bleed ribos)';
  }

  const selInking = document.getElementById('selectMarkInking');
  if (selInking?.parentElement?.querySelector('span')) selInking.parentElement.querySelector('span').textContent = isEn ? 'Mark Inking' : 'Spaudos dažai (Inking)';
  if (selInking && selInking.options.length >= 2) {
    selInking.options[0].textContent = isEn ? 'Registration (C+M+Y+K)' : 'Registration (C+M+Y+K)';
    selInking.options[1].textContent = isEn ? '100% K (Black only)' : '100% K (Tik juoda)';
  }

  const selWeight = document.getElementById('selectCropWeight');
  if (selWeight?.parentElement?.querySelector('span')) selWeight.parentElement.querySelector('span').textContent = isEn ? 'Line Weight' : 'Linijos storis';
  if (selWeight && selWeight.options.length >= 5) {
    selWeight.options[1].textContent = isEn ? '0.25 pt (Standard)' : '0.25 pt (Standartas)';
  }

  const inputCropL = document.getElementById('inputCropLength');
  if (inputCropL?.parentElement?.querySelector('span')) inputCropL.parentElement.querySelector('span').textContent = isEn ? 'Mark Length (mm)' : 'Žymės ilgis (mm)';
  const inputCropO = document.getElementById('inputCropOffset');
  if (inputCropO?.parentElement?.querySelector('span')) inputCropO.parentElement.querySelector('span').textContent = isEn ? 'Offset (mm)' : 'Atitraukimas (mm)';

  const secCutHeader = document.querySelector('#checkCutContourEnabled')?.closest('.space-y-2\\.5')?.querySelector('label span');
  if (secCutHeader) secCutHeader.textContent = isEn ? '7. Cut Contour (Print & Cut)' : '7. Kirtimo Kontūras (Print & Cut)';
  const cutSheetBadge = document.querySelector('#checkCutContourEnabled')?.closest('.space-y-2\\.5')?.querySelector('.text-\\[8px\\]');
  if (cutSheetBadge) cutSheetBadge.textContent = isEn ? 'SHEET 2' : '2 LANKAS';
  const cutContourSpan = document.querySelector('#checkCutContourEnabled')?.nextElementSibling;
  if (cutContourSpan) cutContourSpan.textContent = isEn ? 'Generate Cut Sheet' : 'Generuoti kirtimo lanką (Cut Sheet)';
  const cutOffDesc = document.querySelector('#cutOffsetLabel')?.previousElementSibling;
  if (cutOffDesc) cutOffDesc.textContent = isEn ? 'Contour line offset from trim:' : 'Pjovimo linijos atstumas nuo objekto:';
  const plotterMarksSpan = document.querySelector('#checkPlotterMarks')?.nextElementSibling;
  if (plotterMarksSpan) plotterMarksSpan.textContent = isEn ? 'Plotter Registration Dots' : 'Ploterio taikiniai (Dots)';
  const exportBothSpan = document.querySelector('#checkExportBothSheets')?.nextElementSibling;
  if (exportBothSpan) exportBothSpan.textContent = isEn ? 'Duplicate PDF (1=Print, 2=Cut)' : 'Duplikatas PDF (1=Spauda, 2=Kirtimas)';

  updateStatusBadge();
  updateSideButtonsUI();
  updateSheetNavigationUI();
  updateGridLockUI();
  updatePresetDropdown(State.lang);
}

// -------------------------------------------------------------
// IMPOSITION MATH, UNIFIED SLOT GEOMETRY & CELL LOOKUP ENGINE
// -------------------------------------------------------------
function normalizeRotationAngle(angle) {
  const num = Number(angle) || 0;
  const snapped = Math.round(num / 90) * 90;
  return ((snapped % 360) + 360) % 360;
}

function getGlobalPageRotation() {
  if (typeof State.pageRotation === 'number' && !isNaN(State.pageRotation)) {
    return normalizeRotationAngle(State.pageRotation);
  }
  return State.pageRotated ? 90 : 0;
}

function computeAutoPageNumber(mode, col, row, side, sheetIndex) {
  const cellsPerSheet = Math.max(1, State.cols * State.rows);
  const sIndex = Math.max(0, Number(sheetIndex) || 0);
  const activeMode = mode || State.lastAutoMode || 'booklet';
  const totalDocPages = Math.max(1, Number(State.docPageCount) || 1);

  if (activeMode === 'booklet') {
    const effColBooklet = (State.printStyle === 'workandturn' && side === 'back')
      ? (State.cols - 1 - col)
      : col;
    const pagesPerSheet = Math.max(4, cellsPerSheet * 2);
    const paddedCount = Math.max(pagesPerSheet, Math.ceil(totalDocPages / pagesPerSheet) * pagesPerSheet);
    const pairIndex = row * Math.max(1, Math.floor(State.cols / 2)) + Math.floor(effColBooklet / 2);
    const isRightPageOfSpread = (effColBooklet % 2) === 1;
    const spreadOffset = (sIndex * Math.max(1, Math.floor(cellsPerSheet / 2)) + pairIndex) * 2;

    if (side === 'front') {
      const left = paddedCount - spreadOffset;
      const right = 1 + spreadOffset;
      const p = isRightPageOfSpread ? right : left;
      return (p >= 1 && p <= totalDocPages) ? p : null;
    } else {
      const left = 2 + spreadOffset;
      const right = paddedCount - 1 - spreadOffset;
      const p = isRightPageOfSpread ? right : left;
      return (p >= 1 && p <= totalDocPages) ? p : null;
    }
  }

  if (activeMode === 'signatures') {
    const effColSig = (State.printStyle === 'workandturn' && side === 'back')
      ? (State.cols - 1 - col)
      : col;
    const pagesPerSheet = Math.max(4, cellsPerSheet * 2);
    const sigBase = sIndex * pagesPerSheet;
    const pairIndex = row * Math.max(1, Math.floor(State.cols / 2)) + Math.floor(effColSig / 2);
    const isRightPageOfSpread = (effColSig % 2) === 1;
    const localOffset = pairIndex * 2;

    if (side === 'front') {
      const left = sigBase + pagesPerSheet - localOffset;
      const right = sigBase + 1 + localOffset;
      const p = isRightPageOfSpread ? right : left;
      return (p >= 1 && p <= totalDocPages) ? p : null;
    } else {
      const left = sigBase + 2 + localOffset;
      const right = sigBase + pagesPerSheet - 1 - localOffset;
      const p = isRightPageOfSpread ? right : left;
      return (p >= 1 && p <= totalDocPages) ? p : null;
    }
  }

  // Back side mirror inversion for duplex printing
  const effCol = (State.printStyle !== 'single' && side === 'back')
    ? (State.cols - 1 - col)
    : col;

  if (activeMode === 'cutstack') {
    const cellIndex = row * State.cols + effCol;
    const totalS = Math.max(1, State.totalSheets || 1);
    const pNum = (State.printStyle === 'single')
      ? 1 + sIndex + (cellIndex * totalS)
      : 1 + (sIndex * 2) + (side === 'front' ? 0 : 1) + (cellIndex * totalS * 2);
    return (pNum >= 1 && pNum <= totalDocPages) ? pNum : null;
  }

  if (State.duplicatePages) {
    let pNum = (State.printStyle === 'single' || State.printStyle === 'workandturn')
      ? sIndex + 1
      : (sIndex * 2) + (side === 'front' ? 1 : 2);
    if (pNum > totalDocPages && totalDocPages === 1) pNum = 1;
    return (pNum >= 1 && pNum <= totalDocPages) ? pNum : null;
  } else {
    // Standard sequential N-Up duplex pairing (odd front, even back)
    const cellIndex = row * State.cols + effCol;
    const pNum = (State.printStyle === 'single')
      ? 1 + (sIndex * cellsPerSheet) + cellIndex
      : (sIndex * cellsPerSheet + cellIndex) * 2 + (side === 'front' ? 1 : 2);
    return (pNum >= 1 && pNum <= totalDocPages) ? pNum : null;
  }
}

function seedManualSlotsFromAuto(sourceMode = null, overwriteExisting = false) {
  if (!State.manualSlots) State.manualSlots = {};
  const baseMode = sourceMode || State.lastAutoMode || (State.mode !== 'manual' ? State.mode : 'booklet');
  const totalS = Math.max(1, State.totalSheets || 1);

  for (let s = 0; s < totalS; s++) {
    for (const side of ['front', 'back']) {
      for (let r = 0; r < State.rows; r++) {
        for (let c = 0; c < State.cols; c++) {
          const key = `${c}_${r}_${side}_${s}`;
          if (overwriteExisting || State.manualSlots[key] === undefined) {
            const p = computeAutoPageNumber(baseMode, c, r, side, s);
            const autoRot = (baseMode === 'signatures' && State.rows >= 2 && (r % 2 === 1)) ? 180 : 0;
            State.manualSlots[key] = {
              page: p,
              rot: autoRot,
              rotation: autoRot,
              offsetX: 0,
              offsetY: 0
            };
          }
        }
      }
    }
  }
}

function getCellSlotInfo(col, row, side = State.currentSide, sheetIndex = State.currentSheetIndex) {
  const key = `${col}_${row}_${side}_${sheetIndex}`;
  if (State.mode === 'manual') {
    if (State.manualSlots && State.manualSlots[key] !== undefined) {
      const slotData = State.manualSlots[key];
      if (typeof slotData === 'object' && slotData !== null) {
        const rot = normalizeRotationAngle(slotData.rotation !== undefined ? slotData.rotation : (slotData.rot || 0));
        const parsedPage = (slotData.page !== null && slotData.page !== undefined && slotData.page !== '')
          ? parseInt(slotData.page, 10)
          : null;
        return {
          page: (!isNaN(parsedPage) && parsedPage > 0) ? parsedPage : null,
          rot: rot,
          rotation: rot,
          offsetX: Number(slotData.offsetX) || 0,
          offsetY: Number(slotData.offsetY) || 0
        };
      }
      const parsedLegacy = parseInt(slotData, 10);
      return {
        page: (!isNaN(parsedLegacy) && parsedLegacy > 0) ? parsedLegacy : null,
        rot: 0,
        rotation: 0,
        offsetX: 0,
        offsetY: 0
      };
    }
    const fallbackPage = computeAutoPageNumber(State.lastAutoMode || 'booklet', col, row, side, sheetIndex);
    const fallbackRot = ((State.lastAutoMode || 'booklet') === 'signatures' && State.rows >= 2 && (row % 2 === 1)) ? 180 : 0;
    return { page: fallbackPage, rot: fallbackRot, rotation: fallbackRot, offsetX: 0, offsetY: 0 };
  }

  const autoPage = computeAutoPageNumber(State.mode, col, row, side, sheetIndex);
  const autoRot = (State.mode === 'signatures' && State.rows >= 2 && (row % 2 === 1)) ? 180 : 0;
  return { page: autoPage, rot: autoRot, rotation: autoRot, offsetX: 0, offsetY: 0 };
}

function getCellPageNumber(col, row, side = State.currentSide, sheetIndex = State.currentSheetIndex) {
  return getCellSlotInfo(col, row, side, sheetIndex).page;
}

function setManualSlotData(col, row, side, sheetIndex, patch) {
  if (!State.manualSlots) State.manualSlots = {};
  const key = `${col}_${row}_${side}_${sheetIndex}`;
  const current = getCellSlotInfo(col, row, side, sheetIndex);
  const nextRot = patch.rotation !== undefined
    ? normalizeRotationAngle(patch.rotation)
    : (patch.rot !== undefined ? normalizeRotationAngle(patch.rot) : current.rotation);
  const nextPage = patch.page !== undefined
    ? ((patch.page !== null && patch.page !== '' && !isNaN(parseInt(patch.page, 10)) && parseInt(patch.page, 10) > 0) ? parseInt(patch.page, 10) : null)
    : current.page;
  const nextOffsetX = patch.offsetX !== undefined ? (parseFloat(patch.offsetX) || 0) : (current.offsetX || 0);
  const nextOffsetY = patch.offsetY !== undefined ? (parseFloat(patch.offsetY) || 0) : (current.offsetY || 0);

  State.manualSlots[key] = {
    page: nextPage,
    rot: nextRot,
    rotation: nextRot,
    offsetX: nextOffsetX,
    offsetY: nextOffsetY
  };
  return State.manualSlots[key];
}

function swapManualSlots(colA, rowA, colB, rowB, side = State.currentSide, sheetIndex = State.currentSheetIndex) {
  // Support swapManualSlots("0_0_front_0", "1_0_front_0") or swapManualSlots("0_0", "1_0")
  if (typeof colA === 'string' && typeof rowA === 'string') {
    const partsA = colA.split('_');
    const partsB = rowA.split('_');
    const cA = parseInt(partsA[0], 10) || 0;
    const rA = parseInt(partsA[1], 10) || 0;
    const sA = partsA[2] || State.currentSide;
    const shA = partsA[3] !== undefined ? parseInt(partsA[3], 10) : State.currentSheetIndex;
    const cB = parseInt(partsB[0], 10) || 0;
    const rB = parseInt(partsB[1], 10) || 0;
    return swapManualSlots(cA, rA, cB, rB, sA, shA);
  }
  if (colA === colB && rowA === rowB) return false;
  if (State.mode !== 'manual') {
    const prevMode = State.mode;
    seedManualSlotsFromAuto(prevMode, false);
    State.lastAutoMode = prevMode;
    State.mode = 'manual';
    if (window.UI && UI.selectMode) UI.selectMode.value = 'manual';
  }
  const slotA = getCellSlotInfo(colA, rowA, side, sheetIndex);
  const slotB = getCellSlotInfo(colB, rowB, side, sheetIndex);
  setManualSlotData(colA, rowA, side, sheetIndex, slotB);
  setManualSlotData(colB, rowB, side, sheetIndex, slotA);
  updateStatusBadge();
  renderManualSlotsPanel();
  if (typeof renderImpositionCanvas === 'function') renderImpositionCanvas();
  return true;
}

let draggedManualSlot = null;

function renderManualSlotsPanel() {
  const panel = document.getElementById('manualImpositionPanel');
  const grid = document.getElementById('manualSlotsGridContainer');
  const sheetsBadge = document.getElementById('manualSheetsCountBadge');
  if (!panel || !grid) return;

  if (State.mode !== 'manual') {
    panel.classList.add('hidden');
    return;
  }

  panel.classList.remove('hidden');
  if (sheetsBadge) {
    sheetsBadge.textContent = String(Math.max(1, State.totalSheets || 1));
  }
  grid.innerHTML = '';

  for (let r = 0; r < State.rows; r++) {
    for (let c = 0; c < State.cols; c++) {
      const slotInfo = getCellSlotInfo(c, r, State.currentSide, State.currentSheetIndex);
      const pageVal = (slotInfo.page !== null && slotInfo.page !== undefined) ? slotInfo.page : '';
      const rotVal = slotInfo.rotation || 0;
      const offX = slotInfo.offsetX || 0;
      const offY = slotInfo.offsetY || 0;

      const cellEl = document.createElement('div');
      cellEl.className = 'bg-zinc-950 border border-zinc-800 hover:border-amber-500/50 rounded-lg p-1.5 flex flex-col gap-1 transition cursor-move';
      cellEl.draggable = true;
      cellEl.dataset.col = String(c);
      cellEl.dataset.row = String(r);

      cellEl.addEventListener('dragstart', (e) => {
        draggedManualSlot = { col: c, row: r };
        cellEl.classList.add('opacity-50', 'border-amber-500');
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = 'move';
          try { e.dataTransfer.setData('text/plain', `${c}_${r}`); } catch (_) {}
        }
      });
      cellEl.addEventListener('dragend', () => {
        draggedManualSlot = null;
        cellEl.classList.remove('opacity-50', 'border-amber-500');
      });
      cellEl.addEventListener('dragover', (e) => {
        e.preventDefault();
        cellEl.classList.add('border-amber-400', 'bg-amber-950/20');
      });
      cellEl.addEventListener('dragleave', () => {
        cellEl.classList.remove('border-amber-400', 'bg-amber-950/20');
      });
      cellEl.addEventListener('drop', (e) => {
        e.preventDefault();
        cellEl.classList.remove('border-amber-400', 'bg-amber-950/20');
        if (draggedManualSlot && (draggedManualSlot.col !== c || draggedManualSlot.row !== r)) {
          swapManualSlots(draggedManualSlot.col, draggedManualSlot.row, c, r, State.currentSide, State.currentSheetIndex);
          showToast(
            State.lang === 'en'
              ? `Swapped [${draggedManualSlot.col + 1}×${draggedManualSlot.row + 1}] ↔ [${c + 1}×${r + 1}]`
              : `Sukeista [${draggedManualSlot.col + 1}×${draggedManualSlot.row + 1}] ↔ [${c + 1}×${r + 1}]`,
            'info'
          );
        }
        draggedManualSlot = null;
      });

      const topRow = document.createElement('div');
      topRow.className = 'flex items-center justify-between text-[9px] font-mono';

      const labelBtn = document.createElement('button');
      labelBtn.type = 'button';
      labelBtn.className = 'text-amber-400 hover:text-amber-300 font-bold cursor-pointer flex items-center gap-1';
      const offsetIndicator = (offX !== 0 || offY !== 0) ? ` <span class="text-fuchsia-400">(${offX > 0 ? '+' : ''}${offX},${offY > 0 ? '+' : ''}${offY})</span>` : '';
      labelBtn.innerHTML = `<i class="fa-solid fa-pen-to-square text-[8px]"></i> [${c + 1}×${r + 1}]${offsetIndicator}`;
      labelBtn.title = 'Atidaryti langelio redagavimo langą';
      labelBtn.addEventListener('click', () => {
        if (typeof openSlotModalForCell === 'function') openSlotModalForCell(c, r);
      });

      const rotBtn = document.createElement('button');
      rotBtn.type = 'button';
      rotBtn.className = `px-1.5 py-0.5 rounded text-[9px] font-mono font-bold cursor-pointer transition ${
        rotVal === 180
          ? 'bg-amber-500 text-zinc-950'
          : (rotVal !== 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-zinc-800 text-zinc-300 hover:text-white')
      }`;
      rotBtn.textContent = rotVal === 180 ? '180° 🔻' : `${rotVal}°`;
      rotBtn.title = 'Spustelėkite norėdami pasukti (0° → 90° → 180° → 270°)';
      rotBtn.addEventListener('click', () => {
        const nextRot = (rotVal + 90) % 360;
        setManualSlotData(c, r, State.currentSide, State.currentSheetIndex, { rotation: nextRot });
        renderManualSlotsPanel();
        if (typeof renderImpositionCanvas === 'function') renderImpositionCanvas();
      });

      topRow.appendChild(labelBtn);
      topRow.appendChild(rotBtn);

      const bottomRow = document.createElement('div');
      bottomRow.className = 'flex items-center gap-1';

      const pgInput = document.createElement('input');
      pgInput.type = 'number';
      pgInput.min = '1';
      pgInput.placeholder = 'Tuščias';
      pgInput.value = pageVal;
      pgInput.className = 'w-full bg-zinc-900 border border-zinc-700 focus:border-amber-500 rounded px-1.5 py-0.5 text-[11px] font-mono text-white';
      pgInput.addEventListener('input', (e) => {
        const raw = e.target.value.trim();
        const parsed = parseInt(raw, 10);
        const newPage = (!isNaN(parsed) && parsed > 0) ? parsed : null;
        setManualSlotData(c, r, State.currentSide, State.currentSheetIndex, { page: newPage });
        if (newPage !== null && State.pdfJsDoc && !State.pageRenderCache[newPage]) {
          renderPdfPageToCache(newPage);
        }
        if (typeof renderImpositionCanvas === 'function') renderImpositionCanvas();
      });

      bottomRow.appendChild(pgInput);
      cellEl.appendChild(topRow);
      cellEl.appendChild(bottomRow);
      grid.appendChild(cellEl);
    }
  }
}

function getCellCreepOffsetMm(col, sheetIdx = State.currentSheetIndex) {
  if (State.creepMm <= 0 || State.totalSheets <= 1 || State.cols < 2) {
    return 0;
  }
  const effMode = State.mode === 'manual' ? (State.lastAutoMode || 'booklet') : State.mode;
  if (effMode !== 'booklet' && effMode !== 'signatures') {
    return 0;
  }
  const factor = sheetIdx / Math.max(1, State.totalSheets - 1);
  const shift = State.creepMm * factor;
  return (col % 2 === 0) ? shift : -shift;
}

/**
 * Computes exact press-sheet geometry (in millimeters, top-left origin) for any grid slot.
 * Ensures 100% mathematical parity across Canvas preview, Hit-Testing, and PDF-Lib export.
 */
function getSlotGeometry(col, row, side = State.currentSide, sheetIndex = State.currentSheetIndex) {
  const sourceW_mm = Math.max(1, Number(State.sourcePageWidth) || 148);
  const sourceH_mm = Math.max(1, Number(State.sourcePageHeight) || 210);
  const globalRot = getGlobalPageRotation();
  const isGlobal90or270 = (globalRot === 90 || globalRot === 270);

  const cellW_mm = isGlobal90or270 ? sourceH_mm : sourceW_mm;
  const cellH_mm = isGlobal90or270 ? sourceW_mm : sourceH_mm;

  const cols = Math.max(1, Number(State.cols) || 1);
  const rows = Math.max(1, Number(State.rows) || 1);
  const gutX_mm = Math.max(0, Number(State.gutterX) || 0);
  const gutY_mm = Math.max(0, Number(State.gutterY) || 0);

  const gridW_mm = cols * cellW_mm + Math.max(0, cols - 1) * gutX_mm;
  const gridH_mm = rows * cellH_mm + Math.max(0, rows - 1) * gutY_mm;

  const startX_mm = State.autoCenter
    ? (State.sheetWidth - gridW_mm) / 2
    : (Number(State.marginSide) || 0);
  const startY_mm = State.autoCenter
    ? (State.sheetHeight - gridH_mm) / 2
    : (Number(State.marginTop) || 0);

  const slot = getCellSlotInfo(col, row, side, sheetIndex);
  const slotRot = normalizeRotationAngle(slot.rotation || 0);
  const totalRot = (globalRot + slotRot) % 360;
  const isTotal90or270 = (totalRot === 90 || totalRot === 270);

  const creepMm = getCellCreepOffsetMm(col, sheetIndex);
  const offsetX_mm = Number(slot.offsetX) || 0;
  const offsetY_mm = Number(slot.offsetY) || 0;

  const cellX_mm = startX_mm + col * (cellW_mm + gutX_mm) + creepMm + offsetX_mm;
  const cellY_mm = startY_mm + row * (cellH_mm + gutY_mm) + offsetY_mm;

  const centerX_mm = cellX_mm + cellW_mm / 2;
  const centerY_mm = cellY_mm + cellH_mm / 2;

  const trimW_mm = isTotal90or270 ? sourceH_mm : sourceW_mm;
  const trimH_mm = isTotal90or270 ? sourceW_mm : sourceH_mm;
  const trimX_mm = centerX_mm - trimW_mm / 2;
  const trimY_mm = centerY_mm - trimH_mm / 2;

  return {
    slot,
    pageNum: slot.page,
    globalRot,
    slotRot,
    totalRot,
    sourceW_mm,
    sourceH_mm,
    cellW_mm,
    cellH_mm,
    gridW_mm,
    gridH_mm,
    startX_mm,
    startY_mm,
    creepMm,
    offsetX_mm,
    offsetY_mm,
    cellX_mm,
    cellY_mm,
    centerX_mm,
    centerY_mm,
    trimX_mm,
    trimY_mm,
    trimW_mm,
    trimH_mm
  };
}

/**
 * Computes rotation-aware bleed box offsets in both sheet space (top/right/bottom/left)
 * and unrotated page-local space (localTop/localRight/localBottom/localLeft).
 */
function getCellBleed(col, row, totalRotOverride = undefined) {
  const pTop = State.bleedAsymmetric ? (Number(State.bleedTop) || 0) : (Number(State.bleedMm) || 0);
  const pBottom = State.bleedAsymmetric ? (Number(State.bleedBottom) || 0) : (Number(State.bleedMm) || 0);
  const pLeft = State.bleedAsymmetric ? (Number(State.bleedLeft) || 0) : (Number(State.bleedMm) || 0);
  const pRight = State.bleedAsymmetric ? (Number(State.bleedRight) || 0) : (Number(State.bleedMm) || 0);

  let totalRot;
  if (totalRotOverride !== undefined) {
    totalRot = normalizeRotationAngle(totalRotOverride);
  } else {
    const slot = getCellSlotInfo(col, row, State.currentSide, State.currentSheetIndex);
    totalRot = (getGlobalPageRotation() + normalizeRotationAngle(slot.rotation || 0)) % 360;
  }

  // Rotate page bleeds clockwise by totalRot into sheet space
  let top, right, bottom, left;
  if (totalRot === 90) {
    top = pLeft;
    right = pTop;
    bottom = pRight;
    left = pBottom;
  } else if (totalRot === 180) {
    top = pBottom;
    right = pLeft;
    bottom = pTop;
    left = pRight;
  } else if (totalRot === 270) {
    top = pRight;
    right = pBottom;
    bottom = pLeft;
    left = pTop;
  } else {
    top = pTop;
    right = pRight;
    bottom = pBottom;
    left = pLeft;
  }

  const effMode = State.mode === 'manual' ? (State.lastAutoMode || 'booklet') : State.mode;
  if ((effMode === 'booklet' || effMode === 'signatures') && State.cols >= 2 && State.bookletZeroSpineBleed) {
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

  // Inverse-rotate sheet-space bleeds back to local page coordinates for rotated canvas rendering
  let localTop, localRight, localBottom, localLeft;
  if (totalRot === 90) {
    localTop = right;
    localRight = bottom;
    localBottom = left;
    localLeft = top;
  } else if (totalRot === 180) {
    localTop = bottom;
    localRight = left;
    localBottom = top;
    localLeft = right;
  } else if (totalRot === 270) {
    localTop = left;
    localRight = top;
    localBottom = right;
    localLeft = bottom;
  } else {
    localTop = top;
    localRight = right;
    localBottom = bottom;
    localLeft = left;
  }

  return {
    top,
    bottom,
    left,
    right,
    localTop,
    localBottom,
    localLeft,
    localRight
  };
}

function recalculateImposition() {
  const cellsPerSide = Math.max(1, State.cols * State.rows);

  if (State.mode !== 'manual') {
    State.lastAutoMode = State.mode;
  }

  if (State.mode === 'booklet' || State.mode === 'signatures') {
    const pagesPerSheet = Math.max(4, cellsPerSide * 2);
    const paddedCount = Math.max(pagesPerSheet, Math.ceil(State.docPageCount / pagesPerSheet) * pagesPerSheet);
    State.totalSheets = Math.max(1, Math.ceil(paddedCount / pagesPerSheet));
  } else if (State.mode === 'cutstack') {
    State.totalSheets = State.printStyle === 'single'
      ? Math.max(1, Math.ceil(State.docPageCount / cellsPerSide))
      : Math.max(1, Math.ceil(State.docPageCount / (cellsPerSide * 2)));
  } else if (State.mode === 'manual') {
    State.totalSheets = Math.max(1, State.totalSheets || 1);
    seedManualSlotsFromAuto(State.lastAutoMode || 'booklet', false);
  } else {
    if (State.duplicatePages) {
      State.totalSheets = (State.printStyle === 'single' || State.printStyle === 'workandturn')
        ? (State.docPageCount <= 1 ? 1 : Math.max(1, State.docPageCount))
        : (State.docPageCount <= 1 ? 1 : Math.max(1, Math.ceil(State.docPageCount / 2)));
    } else {
      State.totalSheets = State.printStyle === 'single'
        ? Math.max(1, Math.ceil(State.docPageCount / cellsPerSide))
        : Math.max(1, Math.ceil(State.docPageCount / (cellsPerSide * 2)));
    }
  }

  if (State.currentSheetIndex >= State.totalSheets) {
    State.currentSheetIndex = Math.max(0, State.totalSheets - 1);
  }
  if (State.printStyle === 'single') {
    State.currentSide = 'front';
  }

  updateSheetNavigationUI();
  updateSideButtonsUI();
  renderManualSlotsPanel();
}

function updateStatusBadge() {
  const globalRot = getGlobalPageRotation();
  const isRot = (globalRot === 90 || globalRot === 270);
  const w = Math.round(isRot ? State.sourcePageHeight : State.sourcePageWidth);
  const h = Math.round(isRot ? State.sourcePageWidth : State.sourcePageHeight);
  const totalCells = State.cols * State.rows;
  const pagesLabel = (i18n[State.lang] && i18n[State.lang].pages) ? i18n[State.lang].pages : 'psl.';
  const unitsLabel = State.lang === 'en' ? 'pcs/sheet' : 'vnt./lanke';

  const txt = (State.duplicatePages && State.mode === 'nup')
    ? `${totalCells} ${unitsLabel} (${w}×${h} mm)`
    : `${State.docPageCount} ${pagesLabel} (${w}×${h} mm)`;

  const sidebarStatus = UI.sidebarFileStatus || document.getElementById('sidebarFileStatus');
  const mobileInfo = UI.mobileDocInfo || document.getElementById('mobileDocInfo');
  const aspectBadge = UI.productAspectBadge || document.getElementById('productAspectBadge');
  const rotBadge = UI.pageRotationBadge || document.getElementById('pageRotationBadge');

  if (sidebarStatus) sidebarStatus.textContent = txt;
  if (mobileInfo) mobileInfo.textContent = txt;
  if (rotBadge) rotBadge.textContent = `${globalRot}°`;

  if (aspectBadge) {
    let label = `${w}×${h} mm`;
    if ((w === 148 && h === 210) || (w === 210 && h === 148)) label = `A5 (${w}×${h})`;
    else if ((w === 210 && h === 297) || (w === 297 && h === 210)) label = `A4 (${w}×${h})`;
    else if ((w === 105 && h === 148) || (w === 148 && h === 105)) label = `A6 (${w}×${h})`;
    else if ((w === 90 && h === 50) || (w === 50 && h === 90)) label = `Vizitinė (${w}×${h})`;
    else if ((w === 85 && h === 55) || (w === 55 && h === 85)) label = `Euro (${w}×${h})`;
    else if ((w === 99 && h === 210) || (w === 210 && h === 99)) label = `DL (${w}×${h})`;
    aspectBadge.textContent = label;
  }

  updateSheetNavigationUI();
  updateSideButtonsUI();
}

function updateSheetNavigationUI() {
  const isLt = State.lang !== 'en';
  const sheetLabel = UI.currentSheetLabel || document.getElementById('currentSheetLabel');
  if (sheetLabel) {
    sheetLabel.textContent = `${State.currentSheetIndex + 1} / ${Math.max(1, State.totalSheets)}`;
  }
  const manualCountBadge = document.getElementById('manualSheetsCountBadge');
  if (manualCountBadge) {
    manualCountBadge.textContent = String(Math.max(1, State.totalSheets));
  }
  if (UI.btnPrevSheet) {
    UI.btnPrevSheet.disabled = State.currentSheetIndex <= 0;
    UI.btnPrevSheet.classList.toggle('opacity-40', State.currentSheetIndex <= 0);
  }
  if (UI.btnNextSheet) {
    UI.btnNextSheet.disabled = State.currentSheetIndex >= State.totalSheets - 1;
    UI.btnNextSheet.classList.toggle('opacity-40', State.currentSheetIndex >= State.totalSheets - 1);
  }
  if (UI.canvasDimInfo) {
    UI.canvasDimInfo.textContent = `${State.sheetPreset} • ${State.sheetWidth}×${State.sheetHeight} mm`;
  }
  if (UI.statusModeLabel) {
    const modeMap = isLt
      ? { 'booklet': 'KNYGELĖ (BALNAS)', 'nup': 'N-UP / DAUGINIMAS', 'cutstack': 'PJAUK IR KRAUK', 'signatures': 'KNYGOS LANKAI', 'manual': 'RANKINIS (SPAUSK ANT LANGELIO)' }
      : { 'booklet': 'BOOKLET (SADDLE STITCH)', 'nup': 'N-UP / STEP & REPEAT', 'cutstack': 'CUT & STACK', 'signatures': 'BOOK SIGNATURES', 'manual': 'MANUAL (CLICK CELL)' };
    UI.statusModeLabel.innerHTML = `<i class="fa-solid fa-layer-group mr-1"></i>${modeMap[State.mode] || State.mode.toUpperCase()}`;
  }
  if (UI.statusGridLabel) {
    const totalCells = State.cols * State.rows;
    if (State.mode === 'booklet' || State.mode === 'signatures') {
      UI.statusGridLabel.textContent = isLt
        ? `${State.cols} × ${State.rows} (${totalCells * 2} psl./lanke)`
        : `${State.cols} × ${State.rows} (${totalCells * 2} pages/sheet)`;
    } else if (State.duplicatePages && State.mode === 'nup') {
      UI.statusGridLabel.textContent = isLt
        ? `${State.cols} × ${State.rows} (${totalCells} vnt./lanke)`
        : `${State.cols} × ${State.rows} (${totalCells} pcs/sheet)`;
    } else {
      UI.statusGridLabel.textContent = isLt
        ? `${State.cols} × ${State.rows} (${totalCells} vietų/lanke)`
        : `${State.cols} × ${State.rows} (${totalCells} slots/sheet)`;
    }
  }
  if (UI.statusBleedBadge) {
    const bleedPrefix = isLt ? 'UŽLAIDA' : 'BLEED';
    const bleedText = State.bleedAsymmetric
      ? (isLt ? `V:${State.bleedTop} A:${State.bleedBottom} K:${State.bleedLeft} D:${State.bleedRight}` : `T:${State.bleedTop} B:${State.bleedBottom} L:${State.bleedLeft} R:${State.bleedRight}`)
      : `${State.bleedMm}mm`;
    UI.statusBleedBadge.textContent = `${bleedPrefix}: ${bleedText}`;
  }
  const bleedBadge = UI.bleedDisplayBadge || document.getElementById('bleedDisplayBadge');
  if (bleedBadge) bleedBadge.textContent = `${State.bleedMm.toFixed(1)} mm`;
  const cropsInfo = UI.cropsSummaryInfo || document.getElementById('cropsSummaryInfo');
  if (cropsInfo) {
    cropsInfo.textContent = isLt
      ? `${State.bleedMm}mm užlaida • ${State.cropLength}mm ilgis • ${State.cropOffset}mm atitraukimas • ${State.cropWeight}pt • ${State.cropStyle.toUpperCase()}`
      : `${State.bleedMm}mm bleed • ${State.cropLength}mm length • ${State.cropOffset}mm offset • ${State.cropWeight}pt • ${State.cropStyle.toUpperCase()}`;
  }
  if (State.mode === 'manual') {
    renderManualSlotsPanel();
  }
}

function updateSideButtonsUI() {
  const isSingle = State.printStyle === 'single';
  if (UI.btnSideBack) {
    UI.btnSideBack.disabled = isSingle;
    if (isSingle) {
      UI.btnSideBack.classList.add('opacity-40', 'cursor-not-allowed', 'line-through');
      UI.btnSideBack.title = 'Vienpusė spauda neturi nugaros';
    } else {
      UI.btnSideBack.classList.remove('opacity-40', 'cursor-not-allowed', 'line-through');
      UI.btnSideBack.title = 'Nugara';
    }
  }

  const isLt = State.lang !== 'en';
  if (State.currentSide === 'front') {
    if (UI.btnSideFront) UI.btnSideFront.className = 'px-2.5 py-0.5 rounded-lg font-bold text-[10px] sm:text-[11px] bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-950 font-black shadow transition cursor-pointer';
    if (UI.btnSideBack) UI.btnSideBack.className = `px-2.5 py-0.5 rounded-lg font-bold text-[10px] sm:text-[11px] text-zinc-400 hover:text-white transition cursor-pointer ${isSingle ? 'opacity-40 cursor-not-allowed line-through' : ''}`;
    if (UI.statusSideLabel) UI.statusSideLabel.textContent = isSingle ? (isLt ? 'VIENPUSĖ (4+0)' : 'SIMPLEX (4+0)') : (isLt ? 'PRIEKIS (1-oji PUSĖ)' : 'FRONT (SIDE 1)');
  } else {
    if (UI.btnSideFront) UI.btnSideFront.className = 'px-2.5 py-0.5 rounded-lg font-bold text-[10px] sm:text-[11px] text-zinc-400 hover:text-white transition cursor-pointer';
    if (UI.btnSideBack) UI.btnSideBack.className = 'px-2.5 py-0.5 rounded-lg font-bold text-[10px] sm:text-[11px] bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-950 font-black shadow transition cursor-pointer';
    if (UI.statusSideLabel) UI.statusSideLabel.textContent = isLt ? 'NUGARA (2-oji PUSĖ)' : 'BACK (SIDE 2)';
  }
}

function generateDemoPublication(pageCount = 16, w = null, h = null) {
  State.docPageCount = pageCount;
  if (w !== null) State.sourcePageWidth = w;
  if (h !== null) State.sourcePageHeight = h;
  State.pageRotated = false;
  State.pageRotation = 0;
  State.sourcePdfBytes = null;
  State.pdfJsDoc = null;
  State.pageRenderCache = {};
  State.pageRenderInProgress = {};
  State.pdfFileName = '';
  State.docPages = [];
  State.currentSheetIndex = 0;
  State.manualSlots = {};

  for (let i = 1; i <= pageCount; i++) {
    State.docPages.push({
      pageNumber: i,
      title: `Puslapis ${i}`,
      isCover: (i === 1 || i === pageCount),
      accentHue: ((i - 1) * 28 + 25) % 360
    });
  }

  if (window.UI) {
    if (UI.inputPageWidth) UI.inputPageWidth.value = Math.round(State.sourcePageWidth);
    if (UI.inputPageHeight) UI.inputPageHeight.value = Math.round(State.sourcePageHeight);
  }

  recalculateImposition();
  updateStatusBadge();
  if (typeof renderImpositionCanvas === 'function') {
    renderImpositionCanvas();
  }
}

/**
 * Global toast notification system for prepress user feedback.
 */
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `px-3 py-2 rounded-xl text-xs font-bold shadow-xl border flex items-center gap-2 transform transition-all duration-300 translate-y-[-10px] opacity-0 pointer-events-auto ${
    type === 'error' ? 'bg-rose-950/95 border-rose-500 text-rose-200' 
    : type === 'info' ? 'bg-amber-950/95 border-amber-500 text-amber-200'
    : 'bg-emerald-950/95 border-emerald-500 text-emerald-200'
  }`;
  toast.innerHTML = `<i class="fa-solid ${type === 'error' ? 'fa-circle-exclamation text-rose-400' : type === 'info' ? 'fa-circle-info text-amber-400' : 'fa-circle-check text-emerald-400'}"></i> <span>${message}</span>`;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.remove('translate-y-[-10px]', 'opacity-0'));
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-[-10px]');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
window.showToast = showToast;
