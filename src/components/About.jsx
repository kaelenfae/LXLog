import React from 'react';
import { version } from '../../package.json';

import { useNavigate } from 'react-router-dom';

export function About() {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col h-full bg-[var(--bg-app)] text-[var(--text-primary)] relative overflow-y-auto">
            {/* Toolbar */}
            <div className="h-14 border-b border-[var(--border-subtle)] flex items-center px-6 bg-[var(--bg-app)] justify-between shrink-0 sticky top-0 z-10">
                <h1 className="text-xl font-bold tracking-tight">About LXLog</h1>
            </div>

            <div className="flex-1 p-8 max-w-4xl mx-auto w-full">
                <div className="flex items-start gap-8 flex-col md:flex-row">
                    {/* Logo Section */}
                    <div className="shrink-0 flex flex-col items-center text-center">
                        <img src="/lxlog_logo_final.png" alt="LXLog Logo" className="w-24 h-24 rounded-2xl shadow-2xl shadow-indigo-500/20 mb-4" />
                        <h2 className="text-2xl font-bold tracking-tight">LX<span className="text-[var(--text-tertiary)] font-normal">Log</span></h2>
                        <div className="text-xs text-[var(--text-secondary)] mt-1 font-mono">v{version}</div>
                        <button
                            className="mt-3 px-3 py-1 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-secondary)] transition-colors"
                            onClick={() => navigate('/app/patch-notes')}
                        >
                            Patch Notes
                        </button>
                    </div>

                    {/* Content Section */}
                    <div className="space-y-8 flex-1">
                        <section>
                            <p className="text-[var(--text-secondary)] leading-relaxed text-lg mb-4">
                                LXLog is a project to see if I can create a lighting paperwork web app that does what I want. It seems simple and free options are missing so I'm putting it out for other people to use as well. Please feel free to give me feedback or suggestions.
                            </p>

                            <p className="text-[var(--text-secondary)] leading-relaxed text-lg">
                                LXLog does not track or save any user info. Your show files are saved locally and processed by the app.
                            </p>
                        </section>

                        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-6 bg-[var(--bg-card)] rounded-lg border border-[var(--border-subtle)] relative overflow-hidden md:col-span-2">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-yellow-400/20 to-orange-500/20 rounded-bl-full pointer-events-none"></div>
                                <h4 className="font-bold mb-2">Support Development</h4>
                                <p className="text-sm text-[var(--text-secondary)] mb-4">
                                    If this tool saves you time on a show, consider buying me a coffee. Your support keeps the updates coming!
                                </p>
                                <div className="flex gap-2 items-center">
                                    <a href="https://ko-fi.com/lxlog" target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-[#FF5E5B] text-white text-xs font-bold rounded hover:bg-[#ff4542] transition-colors">
                                        Ko-fi
                                    </a>
                                    <button disabled className="px-4 py-2 bg-[#f96854]/50 text-white/50 text-xs font-bold rounded cursor-not-allowed">
                                        Patreon (Coming Soon)
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 bg-[var(--bg-card)] rounded-lg border border-[var(--border-subtle)] md:col-span-2">
                                <div className="flex justify-between items-center mb-4 border-b border-[var(--border-subtle)] pb-2 flex-wrap gap-2">
                                    <h4 className="font-bold text-lg">Operation Manual</h4>
                                    <a
                                        href="/LXLog_Manual.htm"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-3 py-1.5 bg-[var(--accent-primary)] text-white text-xs font-bold rounded hover:bg-[var(--accent-hover)] transition-all shadow-lg flex items-center gap-1.5 active:scale-95"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                                        </svg>
                                        Open Full Manual
                                    </a>
                                </div>

                                <div className="space-y-6 text-sm text-[var(--text-secondary)]">
                                    {/* Step 1: Project Setup */}
                                    <div>
                                        <h5 className="font-semibold text-[var(--text-primary)] mb-1 flex items-center gap-2">
                                            <span className="w-5 h-5 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] flex items-center justify-center text-xs font-bold font-mono">1</span>
                                            Project Setup (Import or Initialize)
                                        </h5>
                                        <p className="ml-7 leading-relaxed">
                                            Start fresh by clicking <strong>New Show</strong> in the toolbar, or import existing paperwork using the <strong>Import</strong> dropdown (supports ETC Eos CSV, Lightwright Text, and MA2 XML formats). Configure custom show metadata fields in settings and set your persistent **Venue Profile** (default heights, address, notes) which remains constant across different show files.
                                        </p>
                                    </div>

                                    {/* Step 2: Populate & Link Fixtures */}
                                    <div>
                                        <h5 className="font-semibold text-[var(--text-primary)] mb-1 flex items-center gap-2">
                                            <span className="w-5 h-5 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] flex items-center justify-center text-xs font-bold font-mono">2</span>
                                            Populate & Link Fixtures
                                        </h5>
                                        <p className="ml-7 leading-relaxed">
                                            Click the plus icon (<strong>Add Instrument</strong>) to append fixtures to your schedule. Entering a fixture type automatically registers it in your local **Fixture Library** (or import GDTF profiles), allowing the app to auto-fill DMX footprints, wattages, weights, and frame sizes when matching type names.
                                        </p>
                                    </div>

                                    {/* Step 3: Keyboard Entry & Sequential Numbering */}
                                    <div>
                                        <h5 className="font-semibold text-[var(--text-primary)] mb-1 flex items-center gap-2">
                                            <span className="w-5 h-5 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] flex items-center justify-center text-xs font-bold font-mono">3</span>
                                            Keyboard Entry & Sequential Numbering
                                        </h5>
                                        <p className="ml-7 leading-relaxed mb-2">
                                            Double-click cells for inline editing and use arrow keys, <strong>Tab</strong>, and <strong>Enter</strong> for fast keyboard navigation.
                                        </p>
                                        <ul className="list-disc list-inside space-y-1 ml-9">
                                            <li><strong>Multi-Selection:</strong> Hold <strong>Ctrl/Cmd</strong> or <strong>Shift</strong> while clicking rows, or drag over checkboxes to activate the <strong>Batch Edit</strong> panel.</li>
                                            <li><strong>Renumbering:</strong> Type patterns like <code className="bg-[var(--bg-app)] px-1 rounded font-mono text-xs">1-x</code> or <code className="bg-[var(--bg-app)] px-1 rounded font-mono text-xs">1++</code> in the Channel or Unit fields to auto-number selected fixtures.</li>
                                            <li><strong>Multi-Part Channels:</strong> Right-click rows to combine duplicates under a single channel with sequential parts (e.g. <code className="bg-[var(--bg-app)] px-1 rounded font-mono text-xs">.1</code>, <code className="bg-[var(--bg-app)] px-1 rounded font-mono text-xs">.2</code>).</li>
                                        </ul>
                                    </div>

                                    {/* Step 4: Audit & Patch Validation */}
                                    <div>
                                        <h5 className="font-semibold text-[var(--text-primary)] mb-1 flex items-center gap-2">
                                            <span className="w-5 h-5 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] flex items-center justify-center text-xs font-bold font-mono">4</span>
                                            Audit & Patch Validation
                                        </h5>
                                        <p className="ml-7 leading-relaxed">
                                            Use the <strong>DMX Universe</strong> visual grid to spot overlapping address conflicts (highlighted in red) and examine address footprints. Refine your spreadsheet view using the search bar or validation toggles to show only fixtures with missing addresses, duplicate channels, or incomplete fields.
                                        </p>
                                    </div>

                                    {/* Step 5: Deliverables & Backups */}
                                    <div>
                                        <h5 className="font-semibold text-[var(--text-primary)] mb-1 flex items-center gap-2">
                                            <span className="w-5 h-5 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] flex items-center justify-center text-xs font-bold font-mono">5</span>
                                            Compile Deliverables & Backups
                                        </h5>
                                        <p className="ml-7 leading-relaxed">
                                            Generate specialized paperwork instantly (Channel Hookups, Hanging Schedules, Magic Sheets, Power Reports). Go to the <strong>Print Center</strong> to select and arrange reports with a professional cover page into a single combined PDF. Always export a local <code className="bg-[var(--bg-app)] px-1 rounded font-mono text-xs">.lxlog</code> backup of your show file before closing the app.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="pt-8 border-t border-[var(--border-subtle)] text-sm text-[var(--text-secondary)]">
                            <p>
                                Created by <strong>Kaelen Perchuk</strong> with the help of <strong>Google Antigravity</strong>.
                            </p>
                             <p className="mt-3">
                                <strong>Source Code:</strong>{' '}
                                <a
                                    href="https://github.com/kaelenfae/LXLog"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[var(--accent-primary)] hover:underline"
                                >
                                    github.com/kaelenfae/LXLog
                                </a>
                            </p>
                            <p className="mt-2">
                                <strong>License:</strong> This project is open source under the{' '}
                                <a
                                    href="https://www.gnu.org/licenses/gpl-3.0.html"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[var(--accent-primary)] hover:underline"
                                >
                                    GNU General Public License v3.0
                                </a>
                            </p>
                            <p className="mt-2 text-xs">
                                &copy; {new Date().getFullYear()} LXLog. Licensed under GPLv3.
                            </p>
                        </section>
                    </div>
                </div>
            </div>
        </div >
    );
}
