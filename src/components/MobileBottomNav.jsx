import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import classNames from 'classnames';

export function MobileBottomNav() {
    const location = useLocation();
    const navigate = useNavigate();

    const getNavItemClass = (to, end = false) => {
        const isActive = end 
            ? location.pathname === to 
            : location.pathname.startsWith(to);

        return classNames(
            'flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-all border-none bg-transparent cursor-pointer outline-none',
            {
                'text-[var(--accent-primary)]': isActive,
                'text-[var(--text-secondary)]': !isActive
            }
        );
    };

    // List of tabs
    const tabs = [
        {
            label: 'Schedule',
            to: '/app',
            end: true,
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
            )
        },
        {
            label: 'Magic',
            to: '/app/reports/magic-sheet',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
            )
        },
        {
            label: 'Patch',
            to: '/app/reports/patch',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
            )
        },
        {
            label: 'Print',
            to: '/app/reports/print-center',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
            )
        }
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[var(--bg-panel)] border-t border-[var(--border-subtle)] flex items-center justify-around z-[100] safe-area-bottom md:hidden pointer-events-auto">
            {tabs.map((tab) => (
                <button 
                    key={tab.to} 
                    onClick={() => navigate(tab.to)} 
                    className={getNavItemClass(tab.to, tab.end)}
                >
                    {tab.icon}
                    <span className="text-[10px] font-bold uppercase tracking-tighter">{tab.label}</span>
                </button>
            ))}
        </nav>
    );
}
