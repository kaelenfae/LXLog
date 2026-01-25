import React from 'react';
import { useNavigate } from 'react-router-dom';

const PATCH_NOTES = [
    {
        version: "0.3.0",
        date: "2026-01-24",
        title: "EOS Targets & Project Restructure",
        changes: [
            "New EOS Targets Report: View Groups, Presets, and Subs from EOS CSV imports.",
            "Improved EOS CSV Import: Better parsing with UUID validation for accurate target detection.",
            "Import Wizard: Field selection now available for EOS CHANNELS section.",
            "Project licensed under GPLv3 for open-source contributions.",
        ]
    },
    {
        version: "0.2.0",
        date: "2026-01-02",
        title: "Performance & UI Refinements",
        changes: [
            "Bug fixes (mobile layout, smoother scrolling for large shows, UI consistency)",
            "Instrument Schedule: Customizeable Columns and Details Panel",
            "Channel Hookup moved to a Report",
            "Magic Sheet: Added custom drag-and-drop and layout lock",
        ]
    },
    {
        version: "0.1.0",
        date: "2025-12-20",
        title: "Initial Version",
        changes: [
            "Initial release of LXLog.",
            "Instrument Schedule, Channel Hookup, and Detail Views.",
            "Reporting: Patch, Hanging Schedule, Magic Sheet.",
            "Import from EOS CSV, Lightwright Text, and MA2 XML.",
            "Database management: Backup, Restore, Duplicate Removal."
        ]
    }
];

export function PatchNotes() {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col h-full bg-[var(--bg-app)] text-[var(--text-primary)] relative overflow-y-auto">
            {/* Toolbar */}
            <div className="h-14 border-b border-[var(--border-subtle)] flex items-center px-6 bg-[var(--bg-app)] justify-between shrink-0 sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-1 -ml-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-full hover:bg-[var(--bg-hover)] transition-colors"
                        title="Go Back"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <h1 className="text-xl font-bold tracking-tight">Patch Notes</h1>
                </div>
            </div>

            <div className="flex-1 p-8 max-w-4xl mx-auto w-full space-y-8">
                {PATCH_NOTES.map((note, index) => (
                    <div key={note.version} className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-panel)] flex items-center justify-between">
                            <h2 className="text-lg font-bold">v{note.version} <span className="font-normal text-[var(--text-tertiary)] mx-2">|</span> {note.title}</h2>
                            <span className="text-sm text-[var(--text-secondary)] font-mono">{note.date}</span>
                        </div>
                        <div className="p-6">
                            <ul className="list-disc list-inside space-y-2 text-[var(--text-secondary)]">
                                {note.changes.map((change, i) => (
                                    <li key={i}>{change}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                ))}

                <div className="text-center text-sm text-[var(--text-tertiary)] pt-8 pb-4">
                    End of Patch Notes
                </div>
            </div>
        </div>
    );
}
