import React, { createContext, useContext, useState, useCallback } from 'react';
import PropTypes from 'prop-types';

const ToastContext = createContext(null);

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
}

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'info', duration = 4000) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, message, type }]);
        if (duration > 0) {
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
            }, duration);
        }
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const toast = {
        success: (msg) => addToast(msg, 'success'),
        error: (msg) => addToast(msg, 'error', 6000),
        info: (msg) => addToast(msg, 'info'),
        warn: (msg) => addToast(msg, 'warning', 5000),
    };

    return (
        <ToastContext.Provider value={toast}>
            {children}
            <ToastContainer toasts={toasts} onDismiss={removeToast} />
        </ToastContext.Provider>
    );
}



ToastProvider.propTypes = {
    children: PropTypes.node.isRequired,
};

const TOAST_STYLES = {
    success: {
        bg: 'rgba(16, 185, 129, 0.15)',
        border: 'rgba(16, 185, 129, 0.3)',
        icon: '✓',
        iconColor: '#10b981',
    },
    error: {
        bg: 'rgba(239, 68, 68, 0.15)',
        border: 'rgba(239, 68, 68, 0.3)',
        icon: '✕',
        iconColor: '#ef4444',
    },
    info: {
        bg: 'rgba(99, 102, 241, 0.15)',
        border: 'rgba(99, 102, 241, 0.3)',
        icon: 'ℹ',
        iconColor: '#6366f1',
    },
    warning: {
        bg: 'rgba(245, 158, 11, 0.15)',
        border: 'rgba(245, 158, 11, 0.3)',
        icon: '⚠',
        iconColor: '#f59e0b',
    },
};

function ToastContainer({ toasts, onDismiss }) {
    if (toasts.length === 0) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: '1.5rem',
            right: '1.5rem',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column-reverse',
            gap: '0.5rem',
            maxWidth: '380px',
            pointerEvents: 'none',
        }}>
            {toasts.map(toast => {
                const style = TOAST_STYLES[toast.type] || TOAST_STYLES.info;
                return (
                    <div
                        key={toast.id}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.75rem 1rem',
                            background: style.bg,
                            backdropFilter: 'blur(12px)',
                            border: `1px solid ${style.border}`,
                            borderRadius: '10px',
                            color: 'var(--text-primary, #f4f4f5)',
                            fontSize: '0.875rem',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                            pointerEvents: 'auto',
                            animation: 'toast-slide-in 0.3s ease-out',
                        }}
                    >
                        <span style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '1.5rem',
                            height: '1.5rem',
                            borderRadius: '50%',
                            background: style.iconColor + '22',
                            color: style.iconColor,
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            flexShrink: 0,
                        }}>
                            {style.icon}
                        </span>
                        <span style={{ flex: 1 }}>{toast.message}</span>
                        <button
                            onClick={() => onDismiss(toast.id)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-tertiary, #71717a)',
                                cursor: 'pointer',
                                padding: '0.25rem',
                                fontSize: '1rem',
                                lineHeight: 1,
                                flexShrink: 0,
                            }}
                        >
                            ×
                        </button>
                    </div>
                );
            })}
        </div>
    );
}

ToastContainer.propTypes = {
    toasts: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        message: PropTypes.string.isRequired,
        type: PropTypes.string.isRequired,
    })).isRequired,
    onDismiss: PropTypes.func.isRequired,
};
