import React from 'react';
import classNames from 'classnames';
import { formatAddress } from '../utils/addressFormatter';
import { ColorSwatch } from './ColorSwatch';
import { useVirtualizer } from '@tanstack/react-virtual';

export function InstrumentCardList({ 
    parentRef,
    instruments, 
    selectedIds, 
    onToggleSelection, 
    onRowClick, 
    onContextMenu,
    addressMode,
    showUniverse1,
    universeSeparator,
    addressCounts,
    channelCounts
}) {
    const virtualizer = useVirtualizer({
        count: instruments?.length || 0,
        getScrollElement: () => parentRef?.current,
        estimateSize: () => 140, // estimated height of card + padding
        overscan: 5,
    });

    if (!instruments || instruments.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-[var(--text-tertiary)] gap-2">
                <svg className="w-12 h-12 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <div className="text-sm font-medium">No instruments found</div>
            </div>
        );
    }

    return (
        <div style={{ height: `${virtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }} className="pb-24">
            {virtualizer.getVirtualItems().map((virtualRow) => {
                const inst = instruments[virtualRow.index];
                const isSelected = selectedIds.has(inst.id);
                const hasAddrError = inst.address && inst.address !== '0:0' && inst.address !== '0' && addressCounts[inst.address] > 1;
                const hasChanError = inst.channel && channelCounts[String(inst.channel)] > 1;
                const isMissingAddr = !inst.address || inst.address === '0:0' || inst.address === '0';
                const isMissingChan = !inst.channel;

                return (
                    <div
                        key={virtualRow.key}
                        data-index={virtualRow.index}
                        ref={virtualizer.measureElement}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            transform: `translateY(${virtualRow.start}px)`,
                            padding: '4px 8px' // emulates gap-2 (8px vertical) and p-2 (8px horizontal)
                        }}
                    >
                        <div
                            onClick={(e) => {
                                // If already in multiselect mode, tapping anything toggles selection
                                if (selectedIds.size > 0) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onToggleSelection(inst.id, e);
                                } else {
                                    onRowClick(e, inst);
                                }
                            }}
                            onContextMenu={(e) => onContextMenu(e, inst)}
                            className={classNames(
                                "relative overflow-hidden flex flex-col gap-2 p-4 rounded-xl border transition-all active:scale-[0.98]",
                                {
                                    "bg-[var(--accent-primary)] border-[var(--accent-primary)] text-white shadow-lg shadow-indigo-500/20": isSelected,
                                    "bg-[var(--bg-card)] border-[var(--border-subtle)]": !isSelected,
                                    "ring-2 ring-red-500 ring-offset-2 ring-offset-[var(--bg-app)]": (hasAddrError || hasChanError) && !isSelected
                                }
                            )}
                        >
                        {/* Header Row */}
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className={classNames(
                                    "w-12 h-12 rounded-lg flex items-center justify-center text-lg font-black shrink-0",
                                    isSelected ? "bg-white/20" : "bg-[var(--bg-app)] text-[var(--text-primary)] border border-[var(--border-subtle)]",
                                    isMissingChan && !isSelected ? "border-yellow-500 text-yellow-500" : ""
                                )}>
                                    {inst.channel || '?'}
                                </div>
                                <div className="min-w-0">
                                    <div className="text-sm font-bold truncate leading-tight">
                                        {inst.type || 'Generic Light'}
                                    </div>
                                    <div className={classNames(
                                        "text-xs font-medium truncate",
                                        isSelected ? "text-white/70" : "text-[var(--text-secondary)]"
                                    )}>
                                        {inst.position || 'No Position'} {inst.unit ? `• Unit ${inst.unit}` : ''}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col items-end gap-1">
                                <div className={classNames(
                                    "px-2 py-1 rounded text-[10px] font-black tracking-widest uppercase",
                                    isSelected ? "bg-white/20" : "bg-[var(--bg-app)] border border-[var(--border-subtle)]",
                                    isMissingAddr && !isSelected ? "text-yellow-500 border-yellow-500/50" : "",
                                    hasAddrError && !isSelected ? "text-red-500 border-red-500/50" : ""
                                )}>
                                    {inst.address && inst.address !== '0:0' && inst.address !== '0' 
                                        ? formatAddress(inst.address, addressMode, showUniverse1, universeSeparator)
                                        : 'UNPATCHED'}
                                </div>
                                {inst.purpose && (
                                    <div className={classNames(
                                        "text-[10px] italic truncate max-w-[100px]",
                                        isSelected ? "text-white/80" : "text-[var(--text-tertiary)]"
                                    )}>
                                        {inst.purpose}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Badges Row */}
                        <div className="flex flex-wrap gap-1.5 mt-1">
                            {inst.color && (
                                <div className={classNames(
                                    "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border",
                                    isSelected ? "bg-white/10 border-white/20" : "bg-[var(--bg-panel)] border-[var(--border-subtle)]"
                                )}>
                                    <ColorSwatch color={inst.color} size="w-3 h-3" />
                                    {inst.color}
                                </div>
                            )}
                            {inst.gobo && (
                                <div className={classNames(
                                    "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                                    isSelected ? "bg-white/10 border-white/20" : "bg-[var(--bg-panel)] border-[var(--border-subtle)]"
                                )}>
                                    Gobo: {inst.gobo}
                                </div>
                            )}
                            {inst.accessory && (
                                <div className={classNames(
                                    "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                                    isSelected ? "bg-white/10 border-white/20" : "bg-[var(--bg-panel)] border-[var(--border-subtle)]"
                                )}>
                                    {inst.accessory}
                                </div>
                            )}
                        </div>

                        {/* Selection Checkbox (Always visible target) */}
                        <div 
                            className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer z-10"
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleSelection(inst.id, e);
                            }}
                        >
                            <div className={classNames(
                                "w-6 h-6 rounded-md border flex items-center justify-center transition-colors",
                                isSelected ? "bg-white border-white text-[var(--accent-primary)]" : "border-[var(--border-subtle)] bg-[var(--bg-panel)] opacity-50 text-transparent"
                            )}>
                                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            </div>
                        </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
