import React, { useEffect, useState } from 'react';
import { version } from '../../package.json';

import { useNavigate } from 'react-router-dom';

export function About() {
    const [appVersion, setAppVersion] = useState(version);
    const navigate = useNavigate();

    useEffect(() => {
        if (window.electron) {
            // If in electron, try to get the real app version (which should match package.json anyway)
            // or fallback to what we imported if getVersion returns electron version unexpectedly
            const electronVer = window.electron.getVersion();
            if (electronVer) setAppVersion(electronVer);
        }
    }, [appVersion]);

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
                        <div className="w-24 h-24 bg-[var(--accent-primary)] rounded-2xl flex items-center justify-center text-white font-bold shadow-2xl shadow-indigo-500/20 text-5xl mb-4">L</div>
                        <h2 className="text-2xl font-bold tracking-tight">LX<span className="text-[var(--text-tertiary)] font-normal">Log</span></h2>
                        <div className="text-xs text-[var(--text-secondary)] mt-1 font-mono">v{appVersion}</div>
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
                            {/* <h3 className="text-xl font-bold mb-3 text-[var(--accent-primary)]">Mission</h3> */}
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
                                <h4 className="font-bold mb-4 text-lg border-b border-[var(--border-subtle)] pb-2">Operation Manual</h4>

                                <div className="space-y-6 text-sm text-[var(--text-secondary)]">
                                    {/* Importing */}
                                    <div>
                                        <h5 className="font-semibold text-[var(--text-primary)] mb-2">Importing & External Data</h5>
                                        <p className="mb-2">Use the <span className="text-[var(--text-primary)] font-medium">Import</span> dropdown in the header to bring in data from other platforms.</p>
                                        <ul className="list-disc list-inside space-y-1 ml-2">
                                            <li><strong>EOS CSV:</strong> Import patch data exported from ETC Eos consoles.</li>
                                            <li><strong>Lightwright Text:</strong> Import standard text exports from Lightwright.</li>
                                            <li><strong>MA2 XML:</strong> Import fixture layers exported as XML from GrandMA2.</li>
                                            <li><span className="opacity-40 italic">MVR: My Virtual Rig files (Currently Disabled)</span></li>
                                        </ul>
                                    </div>

                                    {/* Fixture Library */}
                                    <div>
                                        <h5 className="font-semibold text-[var(--text-primary)] mb-2">Fixture Library</h5>
                                        <p className="mb-2">The Fixture Library is your central hub for managing device profiles and automating data entry.</p>
                                        <ul className="list-disc list-inside space-y-1 ml-2">
                                            <li><strong>Import GDTF:</strong> Use the <em>Import GDTF</em> button to add new fixture definitions to your library.</li>
                                            <li><strong>Fixture Details:</strong> Click any fixture card to open its detailed profile, including:
                                                <ul className="list-[circle] list-inside ml-5 mt-1 opacity-80">
                                                    <li><strong>DMX Map:</strong> View unrolled 16-bit/24-bit channel mappings with functional details.</li>
                                                    <li><strong>Wheels:</strong> See color wheels, gobos, and slot visualizations.</li>
                                                    <li><strong>Physical:</strong> Review manufacturer specs, weight, and power data.</li>
                                                    <li><strong>Raw XML:</strong> Inspect the original source code of the GDTF profile.</li>
                                                </ul>
                                            </li>
                                            <li><strong>Auto-Population:</strong> Once a fixture is in your library, selecting it in the <em>Instrument Detail</em> panel will automatically populate its DMX footprint and other metadata.</li>
                                        </ul>
                                    </div>

                                    {/* managing fixtures */}
                                    <div>
                                        <h5 className="font-semibold text-[var(--text-primary)] mb-2">Managing Fixtures</h5>
                                        <ul className="list-disc list-inside space-y-1 ml-2">
                                            <li><strong>Add/Edit:</strong> Click <em>Add Instrument</em> in the toolbar, or <strong>Double-click</strong> any row in the table to edit immediately.</li>
                                            <li><strong>Selection:</strong>
                                                <ul className="list-[circle] list-inside ml-5 mt-1 opacity-80">
                                                    <li><strong>Click & Drag:</strong> Drag over checkboxes to select multiple rows quickly.</li>
                                                    <li><strong>Shift + Click:</strong> Select a range of fixtures.</li>
                                                    <li><strong>Batch Edit:</strong> Select multiple fixtures to enable the Batch Edit footer.</li>
                                                </ul>
                                            </li>
                                            <li><strong>Delete:</strong> Click the trash icon twice to delete. Anywhere else to cancel.</li>
                                            <li><strong>Export:</strong> Use the <strong>Export</strong> menu to generate Eos Patch CSVs, Lightwright TSVs, or generic spreadsheets.</li>
                                        </ul>
                                    </div>

                                    {/* views */}
                                    <div>
                                        <h5 className="font-semibold text-[var(--text-primary)] mb-2">Views & Reports</h5>
                                        <ul className="list-disc list-inside space-y-1 ml-2">
                                            <li><strong>Instrument Schedule:</strong> The main spreadsheet view. Customize columns using the gear icon.</li>
                                            <li><strong>Print Center:</strong> Bundle multiple reports into a single PDF with custom cover pages.</li>
                                            <li><strong>Reports:</strong> Generate specialized paperwork like Channel Hookups, Hanging Schedules, and Patch reports.</li>
                                            <li><strong>DMX Universe:</strong> Visual representation of your patch.</li>
                                        </ul>
                                    </div>

                                    {/* saving */}
                                    <div>
                                        <h5 className="font-semibold text-[var(--text-primary)] mb-2">Saving & Loading</h5>
                                        <p>
                                            LXLog runs entirely in your browser. Use <strong>Save LXLog</strong> to download a <code className="bg-[var(--bg-app)] px-1 rounded">.lxlog</code> file to your computer.
                                            Use <strong>Open LXLog</strong> to restore your work from a saved file.
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
