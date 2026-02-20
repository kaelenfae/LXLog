import React from 'react';

/**
 * Shared orientation selector used in report toolbars.
 *
 * @param {object} props
 * @param {string} props.value - Current orientation ('portrait' or 'landscape')
 * @param {function} props.onChange - Callback with new orientation value
 */
export const OrientationSelect = ({ value, onChange }) => (
    <div className="flex items-center gap-2">
        <span className="font-bold text-gray-600 uppercase tracking-wider text-[10px]">Orientation:</span>
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="bg-white text-black border border-gray-300 rounded px-2 py-1 cursor-pointer hover:border-indigo-500 focus:outline-none focus:border-indigo-500"
        >
            <option value="portrait">Portrait</option>
            <option value="landscape">Landscape</option>
        </select>
    </div>
);
