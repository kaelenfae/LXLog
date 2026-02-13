import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { InstrumentSchedule } from './InstrumentSchedule';
import classNames from 'classnames';

export function MasterDetailLayout({ MasterComponent = InstrumentSchedule }) {
    const location = useLocation();
    const isDetailView = location.pathname.includes('/instrument/');

    // Width State
    const [detailWidth, setDetailWidth] = React.useState(() => {
        const saved = localStorage.getItem('detailPanelWidth');
        return saved ? parseInt(saved, 10) : 450;
    });

    // Keep track of the last non-zero width to restore to
    const [lastOpenWidth, setLastOpenWidth] = React.useState(() => {
        const saved = localStorage.getItem('detailPanelLastWidth');
        return saved ? parseInt(saved, 10) : 450;
    });

    const [isResizing, setIsResizing] = React.useState(false);

    // Derived state
    const isCollapsed = detailWidth === 0;

    const startResizing = React.useCallback((mouseDownEvent) => {
        mouseDownEvent.preventDefault();
        setIsResizing(true);
    }, []);

    const stopResizing = React.useCallback(() => {
        setIsResizing(false);
    }, []);

    const resize = React.useCallback((mouseMoveEvent) => {
        if (isResizing) {
            const newWidth = document.body.clientWidth - mouseMoveEvent.clientX;
            const maxWidth = document.body.clientWidth * 0.8; // Allow up to 80%

            // Snap to closed if small
            if (newWidth < 150) {
                setDetailWidth(0); // Collapsed
                localStorage.setItem('detailPanelWidth', 0);
            } else if (newWidth <= maxWidth) {
                setDetailWidth(newWidth);
                setLastOpenWidth(newWidth); // Update last active width
                localStorage.setItem('detailPanelWidth', newWidth);
                localStorage.setItem('detailPanelLastWidth', newWidth);
            }
        }
    }, [isResizing]);

    const toggleCollapse = () => {
        if (isCollapsed) {
            // Restore
            const widthToRestore = lastOpenWidth < 300 ? 450 : lastOpenWidth;
            setDetailWidth(widthToRestore);
            localStorage.setItem('detailPanelWidth', widthToRestore);
        } else {
            // Collapse
            setDetailWidth(0);
            localStorage.setItem('detailPanelWidth', 0);
        }
    };

    React.useEffect(() => {
        window.addEventListener('mousemove', resize);
        window.addEventListener('mouseup', stopResizing);
        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [resize, stopResizing]);

    return (
        <div className="flex h-full w-full overflow-hidden relative selection:bg-none">
            {/* List / Master View */}
            <div
                className={classNames(
                    "h-full flex flex-col transition-all",
                    { "hidden md:flex": isDetailView },
                    { "flex": !isDetailView }
                )}
                style={{
                    flex: 1,
                    minWidth: 0
                }}
            >
                <MasterComponent
                    isMasterView={true}
                    isCollapsed={isCollapsed}
                    onToggleDetail={toggleCollapse}
                />
            </div>

            {/* Resize Handle - Desktop Only */}
            <div
                className={classNames(
                    "hidden md:flex w-1 hover:w-3 hover:bg-indigo-300 cursor-col-resize z-50 transition-all bg-[var(--border-subtle)] hover:opacity-100 items-center justify-center group absolute right-0 top-0 bottom-0 md:static",
                    isResizing ? "w-2 bg-indigo-500 opacity-100" : "opacity-0 hover:opacity-100",
                    { "opacity-100 bg-[var(--border-subtle)]": isCollapsed } // Visible when collapsed
                )}
                onMouseDown={startResizing}
            />

            {/* Detail View */}
            <div
                className={classNames(
                    "h-full bg-[var(--bg-card)] overflow-hidden flex-col relative", // Added relative
                    { "flex fixed inset-0 z-20 md:static": isDetailView },
                    { "hidden md:flex": !isDetailView },
                    { "select-none": isResizing },
                    { "hidden": isCollapsed && !isDetailView } // Completely hide when collapsed on desktop
                )}
                style={{
                    width: (window.innerWidth >= 768) ? detailWidth : '100%',
                    display: (window.innerWidth >= 768 && isCollapsed) ? 'none' : undefined
                }}
            >
                <Outlet context={{ onToggleDetail: toggleCollapse, isCollapsed }} />
            </div>

            {/* Overlay */}
            {isResizing && (
                <div className="fixed inset-0 z-[100] cursor-col-resize" />
            )}
        </div>
    );
}
