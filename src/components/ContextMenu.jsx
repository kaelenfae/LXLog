import React, { useEffect, useRef } from 'react';

export function ContextMenu({ x, y, onClose, actions }) {
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                onClose();
            }
        };

        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onClose]);

    // Adjust position to stay within viewport
    const adjustedStyle = {
        position: 'fixed',
        top: y,
        left: x,
        zIndex: 9999
    };

    return (
        <div
            ref={menuRef}
            style={adjustedStyle}
            className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg shadow-2xl py-1 min-w-[180px] animate-in fade-in zoom-in-95 duration-100"
        >
            {actions.map((action, index) => {
                if (action.separator) {
                    return (
                        <div
                            key={`sep-${index}`}
                            className="h-px bg-[var(--border-subtle)] my-1"
                        />
                    );
                }

                return (
                    <button
                        key={action.label}
                        onClick={() => {
                            action.onClick();
                            onClose();
                        }}
                        disabled={action.disabled}
                        className={`w-full text-left px-4 py-2 text-sm flex items-center gap-3 transition-colors ${action.disabled
                                ? 'text-[var(--text-tertiary)] cursor-not-allowed'
                                : action.danger
                                    ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
                                    : 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                            }`}
                    >
                        {action.icon && (
                            <span className="w-4 h-4 flex items-center justify-center opacity-70">
                                {action.icon}
                            </span>
                        )}
                        <span>{action.label}</span>
                        {action.shortcut && (
                            <span className="ml-auto text-xs text-[var(--text-tertiary)]">
                                {action.shortcut}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
