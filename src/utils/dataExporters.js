/**
 * Export instrument data to various formats.
 */

const downloadFile = (content, fileName, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

/**
 * Export to ETC Eos CSV format.
 */
export const exportToEosCsv = (instruments) => {
    const headers = ['Channel', 'Address', 'Type', 'Fixture_Type', 'Purpose', 'Position', 'Unit', 'Color', 'Gobo', 'Notes'];
    const rows = instruments.map(inst => {
        const addr = inst.address ? inst.address.replace(':', '/') : '';
        return [
            inst.channel || '',
            addr,
            inst.type || '',
            inst.type || '',
            inst.purpose || '',
            inst.position || '',
            inst.unit || '',
            inst.color || '',
            inst.gobo || '',
            inst.notes || ''
        ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(',');
    });
    const csvContent = [headers.join(','), ...rows].join('\n');
    downloadFile(csvContent, `LXLog_Eos_Patch_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;');
};

/**
 * Export to Lightwright Tab-Separated format.
 */
export const exportToLightwright = (instruments) => {
    const headers = ['Channel', 'Position', 'Unit Number', 'Instrument Type', 'Purpose', 'Color', 'Gobo', 'Address', 'Notes'];
    const rows = instruments.map(inst => {
        return [
            inst.channel || '',
            inst.position || '',
            inst.unit || '',
            inst.type || '',
            inst.purpose || '',
            inst.color || '',
            inst.gobo || '',
            inst.address || '',
            inst.notes || ''
        ].map(val => String(val).replace(/\t/g, ' ')).join('\t');
    });
    const tsvContent = [headers.join('\t'), ...rows].join('\n');
    downloadFile(tsvContent, `LXLog_Lightwright_${new Date().toISOString().split('T')[0]}.txt`, 'text/plain;charset=utf-8;');
};

/**
 * Export to Generic CSV (All Fields).
 */
export const exportToGenericCsv = (instruments) => {
    if (instruments.length === 0) return;
    
    // Get all unique keys from all instruments
    const keys = new Set();
    instruments.forEach(inst => Object.keys(inst).forEach(k => keys.add(k)));
    const headers = Array.from(keys);
    
    const rows = instruments.map(inst => {
        return headers.map(header => {
            const val = inst[header];
            if (typeof val === 'object') return JSON.stringify(val);
            return val || '';
        }).map(val => `"${String(val).replace(/"/g, '""')}"`).join(',');
    });
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    downloadFile(csvContent, `LXLog_Full_Export_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;');
};
