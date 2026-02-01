import React from 'react';
import { NavLink } from 'react-router-dom';
import classNames from 'classnames';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

export function Sidebar() {
    const metadata = useLiveQuery(() => db.showMetadata.toArray());
    const eosTargetsCount = useLiveQuery(() => db.eosTargets.count());
    const showInfo = metadata && metadata[0] ? metadata[0] : { name: 'Untitled Show', venue: '', designer: '' };

    const navItemClass = ({ isActive }) =>
        classNames(
            'px-3 py-2 rounded-md transition-all text-sm font-medium flex items-center',
            {
                'bg-[var(--accent-primary)] text-white shadow-md shadow-indigo-500/20': isActive,
                'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]': !isActive
            }
        );

    return (
        <aside className="w-full h-full flex flex-col p-3 gap-1">
            <div className="px-3 py-2 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
                Views
            </div>
            <nav className="flex-1 flex flex-col gap-1 overflow-y-auto">
                <NavLink to="/app" end className={navItemClass}>
                    Instrument Schedule
                </NavLink>
                <NavLink to="/app/fixture-library" className={navItemClass}>
                    Fixture Library
                </NavLink>
                <NavLink to="/app/dmx-view" className={navItemClass}>
                    DMX Universe
                </NavLink>
            </nav>

            <div className="px-3 py-2 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
                Reports
            </div>
            <nav className="flex-none flex flex-col gap-1 overflow-y-auto mb-4">
                <NavLink to="/app/reports/channel-hookup" className={navItemClass}>
                    Channel Hookup
                </NavLink>
                <NavLink to="/app/reports/hanging-schedule" className={navItemClass}>
                    Hanging Schedule
                </NavLink>
                <NavLink to="/app/reports/magic-sheet" className={navItemClass}>
                    Magic Sheet
                </NavLink>
                <NavLink to="/app/reports/patch" className={navItemClass}>
                    Patch
                </NavLink>
                <NavLink to="/app/reports/equipment-list" className={navItemClass}>
                    Equipment List
                </NavLink>
                <NavLink to="/app/reports/cutting-list" className={navItemClass}>
                    Cutting List
                </NavLink>
                <NavLink to="/app/reports/power" className={navItemClass}>
                    Power Report
                </NavLink>
                {eosTargetsCount > 0 && (
                    <NavLink to="/app/reports/eos-targets" className={navItemClass}>
                        EOS Targets
                    </NavLink>
                )}
            </nav>

            <div className="mt-auto pt-4 border-t border-[var(--border-subtle)] px-2 pb-2">
                <div className="flex flex-col gap-0.5">
                    <div className="text-xs text-[var(--text-secondary)]">Show</div>
                    <div className="text-sm font-medium text-[var(--text-primary)] truncate" title={showInfo.name}>{showInfo.name}</div>
                    {(showInfo.venue || showInfo.designer) && (
                        <div className="text-xs text-[var(--text-tertiary)] mt-1 truncate">
                            {showInfo.venue && <span>{showInfo.venue}</span>}
                            {showInfo.venue && showInfo.designer && <span className="mx-1">•</span>}
                            {showInfo.designer && <span>{showInfo.designer}</span>}
                        </div>
                    )}
                </div>
            </div>

            <div className="px-2 pb-2">
                <NavLink to="/app/about" className={classNames(navItemClass({ isActive: false }), "text-xs justify-center border border-[var(--border-subtle)] hover:border-[var(--text-secondary)]")}>
                    About LXLog
                </NavLink>
                <a
                    href="https://forms.gle/NP78wTLUVGCgq3Jy8"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={classNames(navItemClass({ isActive: false }), "text-xs justify-center border border-[var(--border-subtle)] hover:border-[var(--text-secondary)] mt-1")}
                >
                    Give Feedback
                </a>
            </div>
        </aside>
    );
}
