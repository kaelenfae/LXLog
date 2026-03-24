import React from 'react';

export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100vh',
                    background: 'var(--bg-app, #0f0f12)',
                    color: 'var(--text-primary, #f4f4f5)',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    padding: '2rem',
                    textAlign: 'center'
                }}>
                    <div style={{
                        background: 'var(--bg-panel, #16161a)',
                        border: '1px solid var(--border-subtle, #2a2a30)',
                        borderRadius: '12px',
                        padding: '2rem',
                        maxWidth: '480px',
                        width: '100%'
                    }}>
                        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚡</div>
                        <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                            Something went wrong
                        </h1>
                        <p style={{
                            color: 'var(--text-secondary, #a1a1aa)',
                            fontSize: '0.875rem',
                            marginBottom: '1.5rem'
                        }}>
                            LXLog encountered an unexpected error. Your data is safe in the browser's database.
                        </p>
                        <details style={{
                            textAlign: 'left',
                            fontSize: '0.75rem',
                            color: 'var(--text-tertiary, #71717a)',
                            marginBottom: '1.5rem',
                            background: 'var(--bg-card, #1e1e24)',
                            padding: '0.75rem',
                            borderRadius: '6px',
                            border: '1px solid var(--border-subtle, #2a2a30)'
                        }}>
                            <summary style={{ cursor: 'pointer', marginBottom: '0.5rem' }}>Error Details</summary>
                            <pre style={{
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                fontFamily: 'monospace',
                                margin: 0
                            }}>
                                {this.state.error?.message || 'Unknown error'}
                            </pre>
                        </details>
                        <button
                            onClick={() => window.location.reload()}
                            style={{
                                background: 'var(--accent-primary, #6366f1)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '0.625rem 1.5rem',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                cursor: 'pointer'
                            }}
                        >
                            Reload LXLog
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
