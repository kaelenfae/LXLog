import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { InstrumentSchedule } from './components/InstrumentSchedule';
import { ChannelHookupReport } from './components/ChannelHookupReport';
import { InstrumentDetail } from './components/InstrumentDetail';
import { NewShowModal } from './components/NewShowModal';
import { SettingsModal } from './components/SettingsModal';
import { MagicSheetReport } from './components/MagicSheetReport';
import { HangingScheduleReport } from './components/HangingScheduleReport';
import { PatchReport } from './components/PatchReport';
import { EquipmentListReport } from './components/EquipmentListReport';
import { CuttingListReport } from './components/CuttingListReport';
import { EosTargetsReport } from './components/EosTargetsReport';
import { PatchNotes } from './components/PatchNotes';
import { db, seedDatabase, exportShow, importShow, createNewShow, importEosCsv, importLightwrightTxt, importMa2Xml, importMa3Xml } from './db';
import './index.css';

import { LandingPage } from './components/LandingPage';
import { About } from './components/About';
import { MasterDetailLayout } from './components/MasterDetailLayout';
import { ImportWizardModal } from './components/ImportWizardModal';

function App() {
  const [showModal, setShowModal] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [showImportModal, setShowImportModal] = React.useState(false);
  const [pendingImport, setPendingImport] = React.useState({ file: null, type: null });

  useEffect(() => {
    seedDatabase();
  }, []);

  // Apply theme and accessibility settings on mount and when settings change
  useEffect(() => {
    const THEME_CLASSES = ['light', 'midnight', 'forest', 'sunset', 'ocean', 'lavender', 'hotpink', 'snes', 'colorblind'];
    const A11Y_CLASSES = ['dyslexic-mode', 'reduced-motion', 'high-contrast', 'large-text'];

    const applySettings = () => {
      const theme = localStorage.getItem('theme') || 'dark';

      // Remove all theme classes first
      document.documentElement.classList.remove(...THEME_CLASSES);
      // Add the new theme class (dark uses default :root, no class needed)
      if (theme !== 'dark') {
        document.documentElement.classList.add(theme);
      }

      // Apply accessibility classes
      document.documentElement.classList.remove(...A11Y_CLASSES);
      if (localStorage.getItem('dyslexicMode') === 'true') {
        document.documentElement.classList.add('dyslexic-mode');
      }
      if (localStorage.getItem('reducedMotion') === 'true') {
        document.documentElement.classList.add('reduced-motion');
      }
      if (localStorage.getItem('highContrast') === 'true') {
        document.documentElement.classList.add('high-contrast');
      }
      if (localStorage.getItem('largeText') === 'true') {
        document.documentElement.classList.add('large-text');
      }
    };

    // Apply on mount
    applySettings();

    // Listen for settings changes
    window.addEventListener('settingsChanged', applySettings);
    return () => window.removeEventListener('settingsChanged', applySettings);
  }, []);

  const handleSave = async () => {
    const json = await exportShow();

    // Generate Filename: ShowName-YYYY-MM-DD-HHmm.lxlog
    const metadata = await db.showMetadata.toArray();
    const showName = (metadata[0] && metadata[0].name) ? metadata[0].name.replace(/[^a-z0-9]/gi, '_') : 'Untitled_Show';

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const timeStr = now.getHours().toString().padStart(2, '0') + now.getMinutes().toString().padStart(2, '0');
    const filename = `${showName}-${dateStr}-${timeStr}.lxlog`;

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    // Increased timeout to ensure browser captures the download event
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  };

  const handleLoad = (e) => {
    if (!e.target || !e.target.files) {
      document.getElementById('hidden-load-input').click();
      return;
    }
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const success = await importShow(event.target.result);
      if (success) {
        window.location.assign('/app');
      } else {
        alert('Failed to load show file.');
      }
    };
    reader.readAsText(file);
  };

  // New unified import handler - just opens the wizard
  const handleImport = () => {
    setShowImportModal(true);
  };

  // Process import from wizard
  const processWizardImport = async ({ format, fileContent, selectedFields, merge, showMetadata }) => {
    let success = false;
    let errorMsg = "Import failed.";

    try {
      if (format === 'csv') {
        success = await importEosCsv(fileContent, merge);
        errorMsg = "Failed to import CSV.";
      } else if (format === 'txt') {
        success = await importLightwrightTxt(fileContent, merge, selectedFields);
        errorMsg = "Failed to import Lightwright Text file.";
      } else if (format === 'ma2') {
        success = await importMa2Xml(fileContent, merge);
        errorMsg = "Failed to import MA2 XML file.";
      } else if (format === 'ma3') {
        success = await importMa3Xml(fileContent, merge);
        errorMsg = "Failed to import MA3 XML file.";
      }

      // If successful and creating new schedule, save show metadata
      if (success && !merge && showMetadata) {
        const existingMetadata = await db.showMetadata.toArray();
        if (existingMetadata && existingMetadata[0]) {
          // Update existing metadata with new show info
          await db.showMetadata.update(existingMetadata[0].id, {
            name: showMetadata.name || existingMetadata[0].name,
            designer: showMetadata.designer || existingMetadata[0].designer,
            venue: showMetadata.venue || existingMetadata[0].venue,
            assistant: showMetadata.assistant || existingMetadata[0].assistant
          });
        } else {
          // Create new metadata entry
          await db.showMetadata.add({
            name: showMetadata.name || '',
            designer: showMetadata.designer || '',
            venue: showMetadata.venue || '',
            assistant: showMetadata.assistant || ''
          });
        }
      }

      if (success) {
        window.location.assign('/app');
      } else {
        alert(errorMsg);
      }
    } catch (e) {
      console.error("Import error:", e);
      alert(errorMsg);
    }

    setShowImportModal(false);
  };

  const handleNewShow = () => {
    setShowModal(true);
  };

  const handleCreateShow = async (metadata) => {
    await createNewShow(metadata);
    window.location.assign('/app');
  };

  return (
    <Router>
      <AppContent
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        handleLoad={handleLoad}
        handleSave={handleSave}
        handleNewShow={handleNewShow}
        handleImport={handleImport}
        setShowSettings={setShowSettings}
      />

      {/* Hidden File Inputs for Load */}
      <input type="file" accept=".lxlog,.json" onChange={handleLoad} id="hidden-load-input" className="hidden" />

      {showModal && <NewShowModal onClose={() => setShowModal(false)} onSubmit={handleCreateShow} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showImportModal && (
        <ImportWizardModal
          onClose={() => setShowImportModal(false)}
          onConfirm={processWizardImport}
        />
      )}
    </Router>
  );
}

// Separate component to use useLocation hook
function AppContent({ isSidebarOpen, setIsSidebarOpen, handleLoad, handleSave, handleNewShow, handleImport, setShowSettings }) {
  const location = useLocation();
  const isLandingPage = location.pathname === '/';

  useEffect(() => {
    const root = document.getElementById('root');
    if (isLandingPage) {
      root.classList.add('landing-layout');
    } else {
      root.classList.remove('landing-layout');
    }
  }, [isLandingPage]);

  if (isLandingPage) {
    return (
      <main className="w-full h-full overflow-y-auto bg-[#0f0f13]">
        <Routes>
          <Route path="/" element={
            localStorage.getItem('disableLanding') === 'true'
              ? <Navigate to="/app" replace />
              : <LandingPage />
          } />
        </Routes>
      </main>
    )
  }

  return (
    <>
      {/* Header - Grid Area: header */}
      <header style={{ gridArea: 'header' }} className="flex items-center justify-between px-5 bg-[var(--bg-panel)] border-b border-[var(--border-subtle)] z-10 print:hidden">
        <div className="flex items-center gap-4">
          {/* Mobile Menu Button */}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-[var(--text-secondary)] hover:text-white md:hidden">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[var(--accent-primary)] rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">L</div>
            <span className="font-semibold text-lg tracking-tight text-[var(--text-primary)]">LX<span className="text-[var(--text-tertiary)] font-normal">Log</span></span>
          </div>

          <div className="h-6 w-px bg-[var(--border-subtle)] mx-2 hidden md:block"></div>

          <div className="hidden md:flex items-center gap-1">
            <button onClick={() => document.getElementById('hidden-load-input').click()} className="px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-md transition-colors">
              Open LXLog
            </button>
            <button onClick={handleSave} className="px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-md transition-colors">
              Save LXLog
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleImport}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-md transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            Import
          </button>
          <button onClick={() => setShowSettings(true)} className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded transition-colors" title="Settings">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </button>

          <button onClick={handleNewShow} className="primary text-xs shadow-lg shadow-indigo-500/20">New Show</button>
        </div>
      </header>

      {/* Sidebar - Grid Area: sidebar */}
      <div
        style={{ gridArea: 'sidebar' }}
        className={`overflow-hidden border-r border-[var(--border-subtle)] bg-[var(--bg-panel)] print:hidden transition-transform duration-300 md:translate-x-0 ${isSidebarOpen ? 'fixed inset-0 z-40 w-64 border-r translate-x-0' : 'fixed inset-0 z-40 w-64 border-r -translate-x-full md:static md:block'}`}
        onClick={() => setIsSidebarOpen(false)}
      >
        <Sidebar />
      </div>

      {/* Mobile Backdrop */}
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setIsSidebarOpen(false)}></div>}

      {/* Main Content - Grid Area: main */}
      <main style={{ gridArea: 'main' }} className="overflow-hidden relative bg-[var(--bg-app)] min-w-0 min-h-0 print:absolute print:top-0 print:left-0 print:z-50 print:bg-white print:overflow-visible print:w-full print:h-auto print:min-h-screen">
        <Routes>
          <Route path="/app" element={<MasterDetailLayout MasterComponent={InstrumentSchedule} />}>
            <Route index element={
              <div className="flex flex-col items-center justify-center h-full text-[var(--text-tertiary)]">
                <svg className="w-12 h-12 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                <p>Select an instrument to view details</p>
              </div>
            } />
            <Route path="instrument/:id" element={<InstrumentDetail />} />
          </Route>

          <Route path="/app/reports/channel-hookup" element={<ChannelHookupReport />} />

          <Route path="/app/reports/magic-sheet" element={<MagicSheetReport />} />
          <Route path="/app/reports/hanging-schedule" element={<HangingScheduleReport />} />
          <Route path="/app/reports/patch" element={<PatchReport />} />
          <Route path="/app/reports/equipment-list" element={<EquipmentListReport />} />
          <Route path="/app/reports/cutting-list" element={<CuttingListReport />} />
          <Route path="/app/reports/eos-targets" element={<EosTargetsReport />} />
          <Route path="/app/patch-notes" element={<PatchNotes />} />

          <Route path="/app/about" element={<About />} />

          {/* Catch-all 404 -> Redirect to App or Landing */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}

export default App;
