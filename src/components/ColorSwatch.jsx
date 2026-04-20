import React from 'react';
import { getGelColor } from '../utils/gelData';

export function ColorSwatch({ color, className = "w-6 h-6", rounded = "rounded-full" }) {
    if (!color) {
        return <div className={`${className} ${rounded} border border-[var(--border-subtle)] bg-transparent`}></div>;
    }

    // Identify separators and colors
    // Supports: R11/R21, R11+R21, R11,R21, R11;R21
    const separators = /[\/+,;]/;
    const parts = color.split(separators).map(p => p.trim()).filter(Boolean);

    if (parts.length > 1) {
        const colors = parts.map(p => getGelColor(p));

        // Use overlap mode (+) if specified
        const isOverlap = color.includes('+');

        if (isOverlap && parts.length === 2) {
            // Overlapping squares for + (usually implies two gels in one frame)
            return (
                <div className={`${className} ${rounded} border border-[var(--border-subtle)] relative overflow-hidden`} title={color}>
                    <div className="absolute inset-0" style={{ backgroundColor: colors[0] }}></div>
                    <div
                        className="absolute bottom-0 right-0 w-2/3 h-2/3 z-10 border-l border-t border-[var(--bg-panel)] shadow-sm"
                        style={{ backgroundColor: colors[1] }}
                    ></div>
                </div>
            );
        }

        // Multi-stop gradient for everything else (/, ,, ;)
        const stops = colors.map((c, i) => {
            const start = (i / colors.length) * 100;
            const end = ((i + 1) / colors.length) * 100;
            return `${c} ${start}%, ${c} ${end}%`;
        }).join(', ');

        return (
            <div
                className={`${className} ${rounded} border border-[var(--border-subtle)] overflow-hidden`}
                style={{
                    background: `linear-gradient(to right, ${stops})`
                }}
                title={color}
            ></div>
        );
    }

    // Single Color
    return (
        <div
            className={`${className} ${rounded} border border-[var(--border-subtle)]`}
            style={{ backgroundColor: getGelColor(color) }}
            title={color}
        ></div>
    );
}
