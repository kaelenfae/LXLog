/**
 * Sorts an array of instruments by channel numerically, then by part.
 */
export const sortInstrumentsByChannel = (instruments) => {
    return instruments.sort((a, b) => {
        const chanA = parseFloat(a.channel) || 0;
        const chanB = parseFloat(b.channel) || 0;
        if (chanA !== chanB) return chanA - chanB;
        return (a.part || 1) - (b.part || 1);
    });
};

/**
 * Formats a single channel's display string based on part and display mode.
 * 
 * @param {string|number} channel - The main channel number
 * @param {string|number} part - The part number
 * @param {string} channelDisplayMode - 'parts', 'dots', 'hide', or 'none' (show duplicates)
 * @param {boolean} isSecondary - Whether this is a secondary part (i.e. part > 1 or a duplicate)
 */
export const formatChannelDisplay = (channel, part, channelDisplayMode, isSecondary) => {
    if (!isSecondary) return channel || '-';
    
    if (channelDisplayMode === 'parts') return `P${part || 1}`;
    if (channelDisplayMode === 'dots') return `.${part || 1}`;
    if (channelDisplayMode === 'hide') return '';
    return channel; // Show Dups
};

/**
 * Processes an array of sorted instruments, adding 'isSecondaryPart' and 'displayChannel'
 * based on the channelDisplayMode.
 * Requires the instruments to be pre-sorted by channel.
 */
export const processChannelDisplayOptions = (sortedInstruments, channelDisplayMode) => {
    let lastChannel = null;
    return sortedInstruments.map(inst => {
        const item = { ...inst };
        const isSecondary = item.channel === lastChannel;
        item.isSecondaryPart = isSecondary;
        item.displayChannel = formatChannelDisplay(item.channel, item.part, channelDisplayMode, isSecondary);
        lastChannel = item.channel;
        return item;
    });
};
