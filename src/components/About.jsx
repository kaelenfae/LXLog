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
                                        <h5 className="font-semibold text-[var(--text-primary)] mb-2">Importing Data</h5>
                                        <p className="mb-2">Use the <span className="text-[var(--text-primary)] font-medium">Import</span> dropdown in the header to bring in data from other platforms.</p>
                                        <ul className="list-disc list-inside space-y-1 ml-2">
                                            <li><strong>EOS CSV:</strong> Import patch data exported from ETC Eos consoles.</li>
                                            <li><strong>Lightwright Text:</strong> Import standard text exports from Lightwright.</li>
                                            <li><strong>MA2 XML:</strong> Import fixture layers exported as XML from GrandMA2.</li>
                                            <li><span className="opacity-50">MA3 XML:</span> Coming soon!</li>
                                        </ul>
                                        <p className="mt-2 text-xs italic">
                                            Note: When importing, you can choose to <strong>Create New</strong> (replacing everything) or <strong>Merge</strong> (updating existing channels and adding new ones) via the prompt.
                                        </p>
                                    </div>

                                    {/* managing fixtures */}
                                    <div>
                                        <h5 className="font-semibold text-[var(--text-primary)] mb-2">Managing Fixtures</h5>
                                        <ul className="list-disc list-inside space-y-1 ml-2">
                                            <li><strong>Add:</strong> Click <em>Add Instrument</em> in the Instrument Schedule toolbar.</li>
                                            <li><strong>Edit:</strong> Click on any cell to edit that specific field in the Detail View.</li>
                                            <li><strong>Selection:</strong> Click the checkbox row to select a fixture.
                                                <ul className="list-[circle] list-inside ml-5 mt-1 opacity-80">
                                                    <li>Hold <strong>Shift</strong> to select a range of fixtures.</li>
                                                    <li>Select multiple fixtures to enable <strong>Batch Edit</strong> or <strong>Duplicate</strong> actions in the footer.</li>
                                                </ul>
                                            </li>
                                            <li><strong>Duplicate:</strong> Select one or more fixtures and click <em>Duplicate</em> in the footer selection bar to create copies.</li>
                                        </ul>
                                    </div>

                                    {/* views */}
                                    <div>
                                        <h5 className="font-semibold text-[var(--text-primary)] mb-2">Views & Reports</h5>
                                        <ul className="list-disc list-inside space-y-1 ml-2">
                                            <li><strong>Instrument Schedule:</strong> Main spreadsheet view of all equipment. Sort by clicking column headers.</li>
                                            <li><strong>Channel Hookup:</strong> View organized by channel, with multi-part channels grouped together.</li>
                                            <li><strong>Reports:</strong> Generate printable paperwork via the sidebar (Magic Sheet, Hanging Schedule, Patch).</li>
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
                                Created by <strong>Kaelen Perchuk</strong>.
                            </p>
                            <p className="mt-3">
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
        </div>
    );
}
