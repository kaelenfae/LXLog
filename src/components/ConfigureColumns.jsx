import React from 'react';

/**
 * Shared Configure Columns button and panel component
 * Used by Channel Hookup and Hanging Schedule reports
 */
export function ConfigureColumnsButton({
    isOpen,
    onToggle,
    children
}) {
    return (
        <div className="relative">
            <button
                onClick={onToggle}
                className={`px-3 py-1 border border-gray-300 rounded font-semibold focus:outline-none ${isOpen
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-300 hover:border-indigo-400'
                    : 'bg-white text-black hover:border-indigo-500 focus:border-indigo-500'
                    }`}
            >
                {isOpen ? 'Configure' : 'Configure'} Columns
            </button>

            {isOpen && (
                <div className="absolute top-16 right-8 bg-white border-2 border-gray-300 rounded-lg shadow-2xl p-4 z-50 w-80">
                    {children}
                </div>
            )}
        </div>
    );
}

/**
 * Panel header for Configure Columns
 */
export function ConfigureColumnsHeader({ onReset }) {
    return (
        <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-300">
            <h3 className="font-bold text-sm">Column Configuration</h3>
            {onReset && (
                <button
                    onClick={onReset}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                >
                    Reset to Default
                </button>
            )}
        </div>
    );
}

/**
 * Draggable column item for reordering
 */
export function DraggableColumnItem({
    columnId,
    label,
    isVisible,
    isDragging,
    isLocked,
    onToggle,
    onDragStart,
    onDragOver,
    onDrop
}) {
    return (
        <div
            draggable={!isLocked}
            onDragStart={(e) => !isLocked && onDragStart(e, columnId)}
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, columnId)}
            className={`flex items-center gap-2 p-2 rounded border ${isLocked ? 'bg-gray-100 border-gray-200 cursor-not-allowed' :
                isDragging ? 'bg-indigo-100 border-indigo-400' :
                    'bg-white border-gray-300 cursor-move hover:border-gray-400'
                }`}
        >
            {!isLocked && (
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                </svg>
            )}
            <input
                type="checkbox"
                checked={isVisible}
                onChange={onToggle}
                disabled={isLocked}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className={`flex-1 text-sm ${isLocked ? 'text-gray-500' : 'text-gray-800'}`}>
                {label}
                {isLocked && <span className="ml-2 text-[10px] text-gray-400">(locked)</span>}
            </span>
        </div>
    );
}
