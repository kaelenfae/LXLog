import React from 'react';
import { getGelColor } from '../utils/gelData';

export function ColorSwatch({ color, className = "w-6 h-6", rounded = "rounded-full" }) {
    if (!color) {
        return <div className={`${className} ${rounded} border border-[var(--border-subtle)] bg-transparent`}></div>;
    }

    // Handle Split Colors (/)
    if (color.includes('/')) {
        const parts = color.split('/');
        const c1 = getGelColor(parts[0]);
        const c2 = getGelColor(parts[1]);

        return (
            <div
                className={`${className} ${rounded} border border-[var(--border-subtle)] overflow-hidden`}
                style={{
                    background: `linear-gradient(to right, ${c1} 50%, ${c2} 50%)`
                }}
                title={color}
            ></div>
        );
    }

    // Handle Overlapping Colors (+)
    if (color.includes('+')) {
        const parts = color.split('+');
        const c1 = getGelColor(parts[0]);
        const c2 = getGelColor(parts[1]);

        return (
            <div className={`${className} ${rounded} border border-[var(--border-subtle)] relative overflow-hidden`} title={color}>
                {/* Base Layer */}
                <div className="absolute inset-0" style={{ backgroundColor: c1 }}></div>

                {/* Overlap Layer - Offset square concept */}
                {/* User asked for "overlapping squares". 
                    Let's visualize this as a smaller square overlapping the main one, 
                    or split diagonal, or just alpha blend?
                    "Overlapping squares" implies distinct shapes.
                    Let's try: Main color full, second color as a smaller square in bottom right?
                    Or: Two partially transparent layers to show the mix result? 
                    But "Show them as overlapping squares" suggests seeing the individual colors AND the mix.
                */}
                <div
                    className="absolute top-0 left-0 w-2/3 h-2/3 z-0"
                    style={{ backgroundColor: c1 }}
                ></div>
                <div
                    className="absolute bottom-0 right-0 w-2/3 h-2/3 z-10 border-l border-t border-[var(--bg-panel)] shadow-sm"
                    style={{ backgroundColor: c2 }} // Opacity to show mix? User said "overlapping squares", usually implies physical stacking.
                // If we want to simulate gel mixing, we'd use mix-blend-mode: multiply.
                // But seeing the distinct colors is helpful.
                // Let's do partial overlap.
                ></div>
            </div>
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
