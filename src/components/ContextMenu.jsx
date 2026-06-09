import React, { useEffect, useLayoutEffect, useRef } from 'react';
import PropTypes from 'prop-types';

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

    useLayoutEffect(() => {
        if (menuRef.current) {
            const rect = menuRef.current.getBoundingClientRect();
            let finalX = x;
            let finalY = y;

            if (x + rect.width > window.innerWidth) {
                finalX = window.innerWidth - rect.width - 8;
            }
            if (y + rect.height > window.innerHeight) {
                finalY = window.innerHeight - rect.height - 8;
            }

            menuRef.current.style.left = `${Math.max(8, finalX)}px`;
            menuRef.current.style.top = `${Math.max(8, finalY)}px`;
        }
    }, [x, y]);

    // Initial position style
    const adjustedStyle = {
        position: 'fixed',
        top: `${y}px`,
        left: `${x}px`,
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

ContextMenu.propTypes = {
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
    onClose: PropTypes.func.isRequired,
    actions: PropTypes.arrayOf(PropTypes.shape({
        label: PropTypes.string,
        icon: PropTypes.node,
        onClick: PropTypes.func,
        danger: PropTypes.bool,
        disabled: PropTypes.bool,
        divider: PropTypes.bool,
    })).isRequired,
};
