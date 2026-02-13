/**
 * Format dmx address based on mode
 * @param {string|number} address - The address to format (e.g. "513", "2:1", "2/1")
 * @param {string} mode - 'universe' (1:1) or 'absolute' (513)
 * @param {boolean} showUniverse1 - If true, displays "1:1" instead of "1" for universe 1
 * @param {string} separator - The separator to use between universe and address (':' or '/')
 * @returns {string} Formatted address
 */
export const formatAddress = (address, mode = 'universe', showUniverse1 = false, separator = ':') => {
    if (!address) return '';

    const strAddr = String(address).trim();
    if (!strAddr) return '';

    // Check if it's universe format already (contains : or /)
    const isUniverseFormat = /[:/]/.test(strAddr);
    let universe = 1;
    let channel = 0;

    if (isUniverseFormat) {
        const parts = strAddr.split(/[:/]/);
        universe = parseInt(parts[0], 10) || 1;
        channel = parseInt(parts[1], 10) || 0;
    } else {
        const abs = parseInt(strAddr, 10);
        if (isNaN(abs)) return strAddr; // Return original if not a number

        // Convert Absolute to Universe
        universe = Math.floor((abs - 1) / 512) + 1;
        channel = ((abs - 1) % 512) + 1;
    }

    if (mode === 'absolute') {
        const absAddr = ((universe - 1) * 512) + channel;
        return String(absAddr);
    } else {
        // Universe Mode
        if (universe === 1 && !showUniverse1) return String(channel);
        return `${universe}${separator}${channel}`;
    }
};

