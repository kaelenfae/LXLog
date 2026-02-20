import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

export const ReportLayout = ({ title, children, controls, orientation = 'landscape', pdfButton }) => {
    const metadata = useLiveQuery(() => db.showMetadata.toArray());
    const showInfo = metadata && metadata[0] ? metadata[0] : { name: 'Untitled Show', venue: '', designer: '' };

    return (
        <div className="report-theme flex flex-col absolute inset-0 bg-white text-black print:block print:static print:h-auto print:overflow-visible print:pb-16 overflow-auto p-8 print:p-0">
            {/* Print Styles */}
            <style>{`
                @media print {
                    @page { margin: 0.5cm 1cm; size: ${orientation}; }
                    body { -webkit-print-color-adjust: exact; }
                    .no-print { display: none !important; }
                    .print-break-inside { break-inside: avoid; }
                    .print-break-before { break-before: page; }
                }
            `}</style>
            {/* Toolbar - Screen Only */}
            <div className="flex justify-end mb-4 print:hidden gap-4 items-center">
                {controls && <div className="flex gap-4 items-center text-sm">{controls}</div>}
                {pdfButton || (
                    <button
                        onClick={() => window.print()}
                        className="!bg-[#6366f1] !text-white px-4 py-2 rounded text-sm font-medium shadow-sm hover:!bg-[#4f46e5] transition-colors flex items-center gap-2 border-none outline-none cursor-pointer"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                        Print / Export PDF
                    </button>
                )}
            </div>

            {/* Header */}
            <header className="flex justify-between items-end border-b-2 border-black pb-2 print:pb-1 mb-4 print:mb-2 shrink-0">
                <div className="text-left w-1/3">
                    <div className="font-bold uppercase text-xs text-gray-500">Venue</div>
                    <div className="text-sm font-semibold">{showInfo.venue}</div>
                </div>
                <div className="text-center w-1/3">
                    <div className="text-xl font-bold uppercase tracking-widest leading-tight">{showInfo.name}</div>
                    <div className="text-xs uppercase tracking-wide mt-1">{title}</div>
                </div>
                <div className="text-right w-1/3 flex flex-col gap-1">
                    {[
                        { label: 'Designer', value: showInfo.designer },
                        { label: 'Assistant', value: showInfo.assistant },
                        { label: 'Director', value: showInfo.director },
                        { label: 'Producer', value: showInfo.producer }
                    ].filter(f => f.value && f.value.trim() !== '').map((f, idx) => (
                        <div key={f.label} className={idx > 0 ? 'mt-0.5' : ''}>
                            <div className="font-bold uppercase text-[9px] leading-none text-gray-500">{f.label}</div>
                            <div className="text-xs font-semibold leading-tight">{f.value}</div>
                        </div>
                    ))}
                </div>
            </header>

            {/* Content */}
            <main className="flex-1 min-h-0 print:min-h-0">
                {children}
            </main>

            {/* Footer */}
            <footer className="mt-8 print:mt-2 pt-2 border-t border-black flex justify-between text-[10px] text-gray-500 shrink-0 print:fixed print:bottom-0 print:left-0 print:right-0 print:border-t-0 print:bg-white">
                <div>{showInfo.reportFooter || 'Made in LXLog'}</div>
                <div>{showInfo.showDateInFooter !== false ? new Date().toLocaleDateString() : ''}</div>
                <div>{showInfo.showPageNumbers !== false ? <span>Page <span className="pageNumber"></span></span> : ''}</div>
            </footer>
        </div>
    );
};
