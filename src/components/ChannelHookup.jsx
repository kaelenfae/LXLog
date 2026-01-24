import React, { useState, useRef, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import { db } from '../db';
import { getGelColor } from '../utils/gelData';
import { formatAddress } from '../utils/addressFormatter';
import { useSettings } from '../hooks/useSettings';
import classNames from 'classnames';

export function ChannelHookup() {
    const navigate = useNavigate();
    const parentRef = useRef(null);
    const [sortField, setSortField] = useState('channel');
    const [sortDirection, setSortDirection] = useState('asc');

    const { addressMode, showUniverse1 } = useSettings();

    const instruments = useLiveQuery(async () => {
        const all = await db.instruments.toArray();

        // Calculate Multi-Part Channels for display logic
        const multiParts = new Set();
        // Calculate Address Duplicates
        const addressCounts = {};

        all.forEach(inst => {
            if (inst.part && inst.part > 1 && inst.channel) {
                multiParts.add(inst.channel);
            }
            if (inst.address && inst.address !== '0:0' && inst.address !== '0') {
                addressCounts[inst.address] = (addressCounts[inst.address] || 0) + 1;
            }
        });

        const enhanced = all.map(i => ({
            ...i,
            hasMultiParts: multiParts.has(i.channel),
            isDuplicate: i.address && addressCounts[i.address] > 1
        }));

        return enhanced.sort((a, b) => {
            let valA = a[sortField];
            let valB = b[sortField];

            // Handle null/undefined
            if (valA === undefined || valA === null) valA = '';
            if (valB === undefined || valB === null) valB = '';

            let result = 0;

            if (sortField === 'address') {
                // Address: "1:1" vs "1:10"
                const splitA = String(valA).split(':').map(Number);
                const splitB = String(valB).split(':').map(Number);

                // If invalid numbers, fallback to string
                if (splitA.some(isNaN) || splitB.some(isNaN)) {
                    result = String(valA).localeCompare(String(valB), undefined, { numeric: true });
                } else {
                    if (splitA[0] !== splitB[0]) result = splitA[0] - splitB[0];
                    else result = (splitA[1] || 0) - (splitB[1] || 0);
                }
            } else if (sortField === 'channel' || sortField === 'watt' || sortField === 'unit' || sortField === 'dimmer') {
                // Numeric Sort
                const numA = parseFloat(valA);
                const numB = parseFloat(valB);
                if (!isNaN(numA) && !isNaN(numB)) {
                    result = numA - numB;
                } else {
                    result = String(valA).localeCompare(String(valB), undefined, { numeric: true });
                }
            } else {
                // Default String Sort
                result = String(valA).localeCompare(String(valB), undefined, { numeric: true });
            }

            return sortDirection === 'asc' ? result : -result;
        });
    }, [sortField, sortDirection]);

    // Flatten data for Virtualizer
    const rowItems = useMemo(() => {
        if (!instruments) return [];
        const items = [];
        instruments.forEach((inst, index) => {
            const prev = index > 0 ? instruments[index - 1] : null;
            const isGroupStart = !prev || prev.channel !== inst.channel;
            const isMultiPartGroup = inst.hasMultiParts;
            // Show Header if grouping by channel and multipart
            const showHeader = isGroupStart && isMultiPartGroup && sortField === 'channel';

            if (showHeader) {
                items.push({ type: 'header', value: inst.channel, id: `header-${inst.channel}-${index}` });
            }

            if (sortField === 'position' && (!prev || prev.position !== inst.position)) {
                items.push({ type: 'spacer', id: `spacer-${index}` });
            }

            items.push({ type: 'instrument', data: inst, id: inst.id });
        });
        return items;
    }, [instruments, sortField]);


    const rowVirtualizer = useVirtualizer({
        count: rowItems.length,
        getScrollElement: () => parentRef.current,
        estimateSize: (i) => {
            const item = rowItems[i];
            if (item.type === 'header') return 32;
            if (item.type === 'spacer') return 32;
            return 48; // Standard row height
        },
        overscan: 20,
    });

    const handleCellClick = (e, inst, field) => {
        e.stopPropagation();
        navigate(`instrument/${inst.id}`, { state: { focusField: field } });
    };

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const SortIcon = ({ field }) => {
        if (sortField !== field) return null;
        return <span className="ml-1 text-[10px]">{sortDirection === 'asc' ? '▲' : '▼'}</span>;
    };

    if (!instruments) return <div className="p-4 text-[#666]">Loading...</div>;

    // Grid Template
    // Address(96 or 64) | Channel(64 or 96) | Type(1fr) | Watt(64) | Purpose(1fr) | Position(1fr) | Color(64)
    const gridTemplate = sortField === 'address'
        ? "96px 64px 1fr 64px 1fr 1fr 64px"
        : "64px 96px 1fr 64px 1fr 1fr 64px";

    return (
        <div className="flex flex-col h-full bg-[var(--bg-app)]">
            {/* Toolbar */}
            <div className="h-14 border-b border-[var(--border-subtle)] flex items-center px-6 bg-[var(--bg-app)] justify-between shrink-0">
                <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">Channel Hookup</h1>
            </div>

            {/* Header */}
            <div className="flex-none border-b border-[var(--border-subtle)] bg-[var(--bg-panel)] z-10 text-xs font-semibold uppercase text-[var(--text-secondary)]">
                <div style={{ display: 'grid', gridTemplateColumns: gridTemplate, alignItems: 'center' }}>
                    {sortField === 'address' ? (
                        <>
                            <div onClick={() => handleSort('address')} className="p-3 border-r border-[var(--border-subtle)] text-[var(--success)] hover:text-[var(--text-primary)] transition-colors cursor-pointer flex items-center">Address<SortIcon field="address" /></div>
                            <div onClick={() => handleSort('channel')} className="p-3 border-r border-[var(--border-subtle)] hover:text-[var(--text-primary)] transition-colors cursor-pointer flex items-center">Ch<SortIcon field="channel" /></div>
                        </>
                    ) : (
                        <>
                            <div onClick={() => handleSort('channel')} className="p-3 border-r border-[var(--border-subtle)] text-[var(--success)] hover:text-[var(--text-primary)] transition-colors cursor-pointer flex items-center">Ch<SortIcon field="channel" /></div>
                            <div onClick={() => handleSort('address')} className="p-3 border-r border-[var(--border-subtle)] hover:text-[var(--text-primary)] transition-colors cursor-pointer flex items-center">Address<SortIcon field="address" /></div>
                        </>
                    )}
                    <div onClick={() => handleSort('type')} className="p-3 border-r border-[var(--border-subtle)] hover:text-[var(--text-primary)] transition-colors cursor-pointer flex items-center">Type<SortIcon field="type" /></div>
                    <div onClick={() => handleSort('watt')} className="p-3 border-r border-[var(--border-subtle)] hover:text-[var(--text-primary)] transition-colors cursor-pointer flex items-center">Watt<SortIcon field="watt" /></div>
                    <div onClick={() => handleSort('purpose')} className="p-3 border-r border-[var(--border-subtle)] hover:text-[var(--text-primary)] transition-colors cursor-pointer flex items-center">Purpose<SortIcon field="purpose" /></div>
                    <div onClick={() => handleSort('position')} className="p-3 border-r border-[var(--border-subtle)] hover:text-[var(--text-primary)] transition-colors cursor-pointer flex items-center">Position<SortIcon field="position" /></div>
                    <div onClick={() => handleSort('color')} className="p-3 border-r border-[var(--border-subtle)] hover:text-[var(--text-primary)] transition-colors cursor-pointer flex items-center">Color<SortIcon field="color" /></div>
                </div>
            </div>

            {/* Data Grid */}
            <div ref={parentRef} className="flex-1 overflow-auto bg-[var(--bg-app)] min-h-0 relative select-none">
                <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                        const item = rowItems[virtualRow.index];

                        if (item.type === 'header') {
                            return (
                                <div
                                    key={virtualRow.key}
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: `${virtualRow.size}px`,
                                        transform: `translateY(${virtualRow.start}px)`,
                                    }}
                                    className="bg-[var(--bg-panel)]/50 border-b border-[var(--border-subtle)] flex items-center px-4 font-bold text-[var(--success)]"
                                >
                                    {item.value}
                                </div>
                            );
                        }

                        if (item.type === 'spacer') {
                            return (
                                <div
                                    key={virtualRow.key}
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: `${virtualRow.size}px`,
                                        transform: `translateY(${virtualRow.start}px)`,
                                    }}
                                    className="bg-[var(--bg-app)] border-b border-[var(--border-subtle)]"
                                ></div>
                            );
                        }

                        const inst = item.data;
                        const formattedAddress = formatAddress(inst.address, addressMode, showUniverse1);
                        const isMultiPartGroup = inst.hasMultiParts; // Calculated in hooks
                        // But wait, the hook calculated it on 'all' array, passed in 'enhanced'.
                        // Yes, 'inst' is from 'instruments' which is 'enhanced'.

                        let channelDisplay;
                        if (isMultiPartGroup && sortField === 'channel') {
                            channelDisplay = <span className="ml-4 font-bold text-[var(--accent-primary)] text-xs tracking-wider">.{inst.part || 0}</span>;
                        } else {
                            const showPart = inst.part && (inst.part > 1 || (isMultiPartGroup));
                            channelDisplay = (
                                <>
                                    {inst.channel}
                                    {showPart && <span className="text-[var(--text-tertiary)] text-xs ml-1">.{inst.part}</span>}
                                </>
                            );
                        }

                        const addressCell = (
                            <div className={classNames("h-full flex items-center px-3 border-r border-[var(--border-subtle)] font-mono overflow-hidden whitespace-nowrap", {
                                "text-[var(--error)] font-bold bg-red-500/10": inst.isDuplicate,
                                "text-yellow-500 font-bold bg-yellow-500/10": !inst.address || inst.address === '0:0' || inst.address === '0'
                            })} onClick={(e) => handleCellClick(e, inst, 'address')}>
                                {formattedAddress}
                            </div>
                        );

                        const channelCell = (
                            <div className="h-full flex items-center px-3 border-r border-[var(--border-subtle)] font-mono text-[var(--success)] font-bold overflow-hidden whitespace-nowrap">
                                {channelDisplay}
                            </div>
                        );

                        return (
                            <div
                                key={virtualRow.key}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: `${virtualRow.size}px`,
                                    transform: `translateY(${virtualRow.start}px)`,
                                    display: 'grid',
                                    gridTemplateColumns: gridTemplate,
                                    alignItems: 'center'
                                }}
                                onClick={() => navigate(`instrument/${inst.id}`)}
                                className="cursor-pointer border-b border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] transition-colors group text-[var(--text-primary)] text-sm"
                            >
                                {sortField === 'address' ? (
                                    <>
                                        {addressCell}
                                        {channelCell}
                                    </>
                                ) : (
                                    <>
                                        {channelCell}
                                        {addressCell}
                                    </>
                                )}
                                <div className="h-full flex items-center px-3 border-r border-[var(--border-subtle)] text-[var(--text-secondary)] overflow-hidden whitespace-nowrap" onClick={(e) => handleCellClick(e, inst, 'type')}>{inst.type}</div>
                                <div className="h-full flex items-center px-3 border-r border-[var(--border-subtle)] text-right font-mono text-xs overflow-hidden whitespace-nowrap" onClick={(e) => handleCellClick(e, inst, 'watt')}>{inst.watt}</div>
                                <div className="h-full flex items-center px-3 border-r border-[var(--border-subtle)] overflow-hidden whitespace-nowrap" onClick={(e) => handleCellClick(e, inst, 'purpose')}>{inst.purpose}</div>
                                <div className="h-full flex items-center px-3 border-r border-[var(--border-subtle)] overflow-hidden whitespace-nowrap" onClick={(e) => handleCellClick(e, inst, 'position')}>{inst.position}</div>
                                <div className="h-full flex items-center px-3 border-r border-[var(--border-subtle)] group-hover:text-[var(--text-primary)] overflow-hidden whitespace-nowrap" onClick={(e) => handleCellClick(e, inst, 'color')}>
                                    <span className="inline-block w-3 h-3 rounded-full mr-2 align-middle border border-[var(--border-subtle)] ring-1 ring-white/10 shrink-0" style={{ backgroundColor: getGelColor(inst.color) }}></span>
                                    {inst.color}
                                </div>
                            </div>
                        );
                    })}
                    {instruments.length === 0 && (
                        <div className="p-8 text-center text-[#666]">
                            No instruments found. Try adding one or importing.
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
}
