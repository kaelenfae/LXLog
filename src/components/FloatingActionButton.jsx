import React from 'react';
import { useNavigate } from 'react-router-dom';

export function FloatingActionButton() {
    const navigate = useNavigate();

    return (
        <button
            onClick={() => navigate('/app/instrument/new')}
            className="fixed bottom-20 right-6 w-14 h-14 bg-[var(--accent-primary)] text-white rounded-full shadow-2xl flex items-center justify-center z-[100] transition-transform active:scale-90 md:hidden pointer-events-auto"
            aria-label="Add Instrument"
        >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
            </svg>
        </button>
    );
}
