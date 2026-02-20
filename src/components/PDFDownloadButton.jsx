import React, { useState, useCallback, useEffect } from 'react';
import { pdf } from '@react-pdf/renderer';

/**
 * Shared PDF download button — lazy generation.
 * PDF is NOT generated until the user clicks the button.
 * Uses the pdf() factory directly to avoid stale caching.
 *
 * @param {object} props
 * @param {React.ReactElement} props.document - The react-pdf Document element
 * @param {string} props.fileName - The filename for the downloaded PDF
 */
export const PDFDownloadButton = ({ document: pdfDocument, fileName }) => {
    const [status, setStatus] = useState('idle'); // idle | loading | error

    const handleClick = useCallback(async () => {
        if (status === 'loading') return;
        setStatus('loading');

        try {
            const blob = await pdf(pdfDocument).toBlob();
            const url = URL.createObjectURL(blob);
            const link = window.document.createElement('a');
            link.href = url;
            link.download = fileName;
            window.document.body.appendChild(link);
            link.click();
            window.document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 100);
            setStatus('idle');
        } catch (err) {
            console.error('[PDFDownloadButton] PDF generation error:', err);
            setStatus('error');
        }
    }, [pdfDocument, fileName, status]);

    return (
        <button
            onClick={handleClick}
            disabled={status === 'loading'}
            className={`${status === 'loading' ? 'bg-indigo-400 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-700 cursor-pointer'} text-white px-3 py-1.5 rounded text-xs font-bold shadow-sm transition-colors flex items-center gap-2`}
        >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {status === 'error' ? 'PDF Error — Retry'
                : status === 'loading' ? 'Preparing PDF…'
                    : 'Download PDF'}
        </button>
    );
};
