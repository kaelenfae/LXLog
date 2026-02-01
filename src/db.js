import Dexie from 'dexie';

export const db = new Dexie('LightingDB');

// Bump version to add fixtureLibrary for GDTF support
// Bump version to add table for Notes
db.version(14).stores({
    instruments: '++id, channel, [channel+part], address, position, type, purpose, watt, color, part, unit, gobo, accessory, proportion, curve, notes, fixtureTypeId, text1, text2, text3, text4, text5, text6, text7, text8, text9, text10',
    showMetadata: '++id, name',
    eosTargets: '++id, targetType, targetId, label, channels',
    fixtureLibrary: '++id, fixtureTypeId, name, manufacturer, shortName',
    instrumentNotes: '++id, instrumentId, timestamp, type' // type: 'user' | 'system'
}).upgrade(tx => {
    // No migration needed
});

export const addNote = async (instrumentId, text, type = 'user') => {
    return await db.instrumentNotes.add({
        instrumentId: Number(instrumentId),
        text,
        type,
        timestamp: Date.now()
    });
};

export const getInstrumentNotes = async (instrumentId) => {
    return await db.instrumentNotes
        .where('instrumentId')
        .equals(Number(instrumentId))
        .reverse()
        .sortBy('timestamp');
};

/**
 * Shared helper to save or merge instruments into the database
 * @param {Array} instruments - Array of instrument objects
 * @param {boolean} merge - Whether to merge with existing data or clear first
 */
export const saveInstruments = async (instruments, merge = false) => {
    return await db.transaction('rw', db.instruments, async () => {
        if (!merge) {
            await db.instruments.clear();
            await db.instruments.bulkAdd(instruments);
        } else {
            for (const inst of instruments) {
                // Match by Channel AND Part if available, otherwise just Channel
                // This ensures we update the correct part if multi-part instruments are being merged
                const query = inst.part
                    ? db.instruments.where('[channel+part]').equals([inst.channel, inst.part])
                    : db.instruments.where('channel').equals(inst.channel);

                const existing = await query.first();
                if (existing) {
                    await db.instruments.update(existing.id, inst);
                } else {
                    await db.instruments.add(inst);
                }
            }
        }
        return true;
    });
};

/**
 * Update multiple instruments by ID
 * @param {Array<number>} ids - Array of instrument IDs
 * @param {Object} updates - Object of fields to update
 */
export const bulkUpdateInstruments = async (ids, updates, noteText = null) => {
    return await db.transaction('rw', db.instruments, db.instrumentNotes, async () => {
        // 1. Apply Updates
        await db.instruments.where('id').anyOf(ids).modify(updates);

        // 2. Log System and User Notes
        const timestamp = Date.now();
        const notes = [];

        // Determine what changed for the log
        let changeSummary = "";
        if (Object.keys(updates).length > 0) {
            changeSummary = Object.entries(updates)
                .map(([key, val]) => `${key}: ${val}`)
                .join(', ');
        }

        if (changeSummary) {
            const sysText = `Bulk Update: ${changeSummary}`;
            ids.forEach(id => {
                notes.push({ instrumentId: id, text: sysText, type: 'system', timestamp });
            });
        }

        if (noteText) {
            ids.forEach(id => {
                notes.push({ instrumentId: id, text: noteText, type: 'user', timestamp: timestamp + 1 }); // +1 to ensure it appears after/above system note if same time
            });
        }

        if (notes.length > 0) {
            await db.instrumentNotes.bulkAdd(notes);
        }
    });
};

/**
 * Renumber units in a specific position
 * @param {string} position - Position name to renumber
 * @param {Array<number>} sortedIds - IDs in the desired order
 */
export const renumberPosition = async (position, sortedIds) => {
    return await db.transaction('rw', db.instruments, async () => {
        let unit = 1;
        for (const id of sortedIds) {
            await db.instruments.update(id, { unit: String(unit++) });
        }
    });
};

// Helper to seed data if empty
export const seedDatabase = async () => {
    // Disabled for production/manual save-load workflow
};

export const exportShow = async () => {
    const instruments = await db.instruments.toArray();
    const metadata = await db.showMetadata.toArray();
    const showData = {
        version: 1,
        date: new Date().toISOString(),
        metadata: metadata[0] || {},
        instruments
    };
    return JSON.stringify(showData, null, 2);
};

export const importShow = async (jsonString) => {
    try {
        const data = JSON.parse(jsonString);
        if (!data.instruments || !Array.isArray(data.instruments)) {
            throw new Error("Invalid show file format");
        }

        await db.transaction('rw', db.instruments, db.showMetadata, async () => {
            await db.instruments.clear();
            await db.instruments.bulkAdd(data.instruments);

            if (data.metadata) {
                await db.showMetadata.clear();
                await db.showMetadata.add(data.metadata);
            }
        });
        return true;
    } catch (error) {
        console.error("Import failed:", error);
        return false;
    }
};

export const resetShow = async () => {
    await db.transaction('rw', db.instruments, async () => {
        await db.instruments.clear();
    });
};

export const createNewShow = async (metadata) => {
    await db.transaction('rw', db.instruments, db.showMetadata, async () => {
        await db.instruments.clear();
        await db.showMetadata.clear();
        await db.showMetadata.add(metadata);
    });
};

export const importEosCsv = async (csvString, merge = false) => {
    try {
        const lines = csvString.split(/\r?\n/);

        // === Parse CHANNELS Section (optional - may not exist in all exports) ===
        const startIndex = lines.findIndex(line => line.includes('START_CHANNELS'));
        const endIndex = lines.findIndex(line => line.includes('END_CHANNELS'));

        const instruments = [];
        const channelCounts = {};

        // Only parse channels if the section exists
        if (startIndex !== -1 && endIndex !== -1) {
            const headerLine = lines[startIndex + 1];
            const headers = headerLine.split(',').map(h => h.trim());

            for (let i = startIndex + 2; i < endIndex; i++) {
                const line = lines[i];
                if (!line.trim()) continue;

                const values = line.split(',');
                const datum = {};
                headers.forEach((header, index) => {
                    datum[header] = values[index];
                });

                const channelStr = datum['CHANNEL'];
                const channelNum = parseInt(channelStr, 10);
                const channelVal = isNaN(channelNum) ? channelStr : channelNum;

                const invalidKey = `channel_${channelVal}`;
                let part = 0;
                if (!channelCounts[invalidKey]) {
                    channelCounts[invalidKey] = 1;
                    part = 1;
                } else {
                    channelCounts[invalidKey]++;
                    part = channelCounts[invalidKey];
                }

                instruments.push({
                    channel: channelVal,
                    address: datum['ADDRESS'],
                    type: datum['FIXTURE_TYPE'],
                    position: '',
                    purpose: datum['LABEL'],
                    color: datum['GEL'],
                    watt: parseInt(datum['WATT']) || '',
                    part: part,
                    proportion: datum['PROPORTION'],
                    curve: datum['CURVE'],
                    notes: datum['NOTES'],
                    text1: datum['TEXT1'],
                    text2: datum['TEXT2'],
                    text3: datum['TEXT3'],
                    text4: datum['TEXT4'],
                    text5: datum['TEXT5'],
                    text6: datum['TEXT6'],
                    text7: datum['TEXT7'],
                    text8: datum['TEXT8'],
                    text9: datum['TEXT9'],
                    text10: datum['TEXT10']
                });
            }
        }

        // === Parse TARGETS Section (Groups, Presets, Subs) ===
        const eosTargets = [];

        // UUID regex pattern (8-4-4-4-12 hex format)
        const uuidPattern = /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i;

        // Look for lines that match the TARGETS format: TYPE,TypeName,EMPTY,ID,UUID,EMPTY,LABEL,...
        // Types: 2=Sub, 4=Preset, 5=Group
        // IMPORTANT: The START_LEVELS section also has lines starting with 2,Sub but those are level data,
        // not definitions. We distinguish them by checking if column 4 contains a UUID.
        for (const line of lines) {
            if (!line.trim()) continue;
            const parts = line.split(',');

            // Check if this is a target definition line (has target type in column 0)
            const targetTypeNum = parseInt(parts[0], 10);
            const targetTypeName = parts[1]?.trim();
            const potentialUuid = parts[4]?.trim() || '';

            // Only process if it matches the expected types AND has a valid UUID in column 4
            if (((targetTypeNum === 2 && targetTypeName === 'Sub') ||
                (targetTypeNum === 4 && targetTypeName === 'Preset') ||
                (targetTypeNum === 5 && targetTypeName === 'Group')) &&
                uuidPattern.test(potentialUuid)) {

                // Format: TYPE,TypeName,EMPTY,ID,UUID,EMPTY,LABEL,CHANNELS,...
                // Indices:  0     1       2    3   4    5     6      7
                const targetId = parts[3]?.trim() || '';
                const label = parts[6]?.trim() || '';
                const channels = parts[7]?.trim() || '';

                // Only add if there's an ID (skip header rows)
                if (targetId && !isNaN(parseFloat(targetId))) {
                    eosTargets.push({
                        targetType: targetTypeName,
                        targetId: targetId,
                        label: label,
                        channels: channels
                    });
                }
            }
        }

        // === Save to Database ===
        await db.transaction('rw', db.instruments, db.eosTargets, async () => {
            if (!merge) {
                await db.instruments.clear();
                await db.eosTargets.clear();
            }

            // Save instruments
            if (!merge) {
                await db.instruments.bulkAdd(instruments);
            } else {
                for (const inst of instruments) {
                    const query = inst.part
                        ? db.instruments.where('[channel+part]').equals([inst.channel, inst.part])
                        : db.instruments.where('channel').equals(inst.channel);

                    const existing = await query.first();
                    if (existing) {
                        await db.instruments.update(existing.id, inst);
                    } else {
                        await db.instruments.add(inst);
                    }
                }
            }

            // Save EOS targets (always replace, no merge logic for targets)
            if (eosTargets.length > 0) {
                await db.eosTargets.bulkAdd(eosTargets);
            }
        });

        return true;
    } catch (e) {
        console.error("CSV Import Failed", e);
        return false;
    }
};

export const importLightwrightTxt = async (txtString, merge = false, selectedFields = null) => {
    try {
        const lines = txtString.split(/\r?\n/);
        if (lines.length < 2) throw new Error("File too short");

        const headers = lines[0].split('\t').map(h => h.trim());

        // Define mapping from LW headers to internal DB fields
        // Includes common aliases (e.g. Dimmer/Address, Load/Wattage)
        const FIELD_MAP = {
            'Channel': 'channel',
            'Dimmer': 'address',
            'Address': 'address',
            'Instrument Type': 'type',
            'Device Type': 'type',
            'Wattage': 'watt',
            'Load': 'watt',
            'Purpose': 'purpose',
            'Use': 'purpose',
            'Position': 'position',
            'Unit#': 'unit',
            'Color': 'color',
            'Gobo': 'gobo',
            'Template': 'gobo',
            'Accessories': 'accessory',
            'Accessory': 'accessory',
            'Focus Note': 'notes',
            'Focus Notes': 'notes',
            'Circuit Name': 'text3', // Preserving existing mapping preference
            'Circuit#': 'text4'      // Preserving existing mapping preference
        };

        const instruments = [];
        const channelCounts = {};
        const newCustomFieldDefs = new Set();

        // Identify which headers are "Custom Fields" (not in FIELD_MAP)
        // Filter by selectedFields if provided
        const headerMap = headers.map(h => {
            if (!h) return null; // Skip empty headers

            // If selectedFields is provided, skip unselected fields (except Channel which is always required)
            if (selectedFields && !selectedFields.includes(h) && h !== 'Channel') {
                return null;
            }

            const mapped = FIELD_MAP[h];
            if (mapped) return { type: 'standard', key: mapped };

            // It's a custom field
            newCustomFieldDefs.add(h);
            return { type: 'custom', key: h };
        });

        // Update Show Metadata with new Custom Field Definitions
        if (newCustomFieldDefs.size > 0) {
            await db.transaction('rw', db.showMetadata, async () => {
                const metadata = await db.showMetadata.toArray();
                const currentData = metadata[0] || {};
                const currentDefs = currentData.customFieldDefinitions || [];

                // Merge new definitions with existing ones
                const mergedDefs = Array.from(new Set([...currentDefs, ...newCustomFieldDefs]));

                if (metadata.length === 0) {
                    await db.showMetadata.add({ customFieldDefinitions: mergedDefs });
                } else {
                    await db.showMetadata.update(currentData.id, { customFieldDefinitions: mergedDefs });
                }
            });
        }

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;

            const values = line.split('\t');
            const datum = { customFields: {} };

            headers.forEach((header, index) => {
                const mapInfo = headerMap[index];
                if (!mapInfo) return;

                const val = values[index] ? values[index].trim() : '';
                if (!val) return;

                if (mapInfo.type === 'standard') {
                    if (mapInfo.key === 'channel') {
                        // Special handling for Channel to strip parentheses if present
                        datum[mapInfo.key] = val.replace(/[()]/g, '');
                    } else if (mapInfo.key === 'watt') {
                        datum[mapInfo.key] = parseInt(val) || val;
                    } else {
                        datum[mapInfo.key] = val;
                    }
                } else {
                    // Custom Field
                    datum.customFields[mapInfo.key] = val;
                }
            });

            // Clean up Channel number
            const channelStr = datum['channel'] || '';
            const channelNum = parseInt(channelStr, 10);
            const channelVal = isNaN(channelNum) ? channelStr : channelNum;

            // Skip invalid rows without minimal info? Or just keep them? 
            // Existing logic kept everything with a channel or even without?
            // Let's assume everything needs a generic structure

            const invalidKey = `channel_${channelVal}`;
            let part = 0;
            if (!channelCounts[invalidKey]) {
                channelCounts[invalidKey] = 1;
                part = 1;
            } else {
                channelCounts[invalidKey]++;
                part = channelCounts[invalidKey];
            }

            instruments.push({
                // Defaults
                channel: '',
                address: '',
                type: '',
                position: '',
                purpose: '',
                color: '',
                watt: '',
                unit: '',
                gobo: '',
                accessory: '',
                notes: '',
                text3: '',
                text4: '',
                // Overwrites
                ...datum,
                // Enforced logic
                channel: channelVal,
                part: part,
                // Ensure customFields is present even if empty
                customFields: datum.customFields || {}
            });
        }

        return await saveInstruments(instruments, merge);
    } catch (e) {
        console.error("LW Import Failed", e);
        return false;
    }
};

export const importMa2Xml = async (xmlString, merge = false) => {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "text/xml");

        const layers = xmlDoc.getElementsByTagName("Layer");
        const instruments = [];

        for (let i = 0; i < layers.length; i++) {
            const layer = layers[i];
            const layerName = layer.getAttribute("name") || "Unknown Layer";
            const fixtures = layer.getElementsByTagName("Fixture");
            for (let j = 0; j < fixtures.length; j++) {
                const fixture = fixtures[j];
                const channelId = fixture.getAttribute("channel_id") || "";
                const fixtureName = fixture.getAttribute("name") || "";
                const fixtureTypeNode = fixture.getElementsByTagName("FixtureType")[0];
                const fixtureStatsType = fixtureTypeNode ? fixtureTypeNode.getAttribute("name") : "";
                const subFixtures = fixture.getElementsByTagName("SubFixture");
                let address = "";

                if (subFixtures.length > 0) {
                    const sub = subFixtures[0];
                    const patchNode = sub.getElementsByTagName("Patch")[0];
                    if (patchNode) {
                        const addressNode = patchNode.getElementsByTagName("Address")[0];
                        if (addressNode) address = addressNode.textContent;
                    }
                }

                if (channelId) {
                    instruments.push({
                        channel: parseInt(channelId) || channelId,
                        address: address,
                        type: fixtureStatsType,
                        position: layerName,
                        purpose: fixtureName,
                        color: '',
                        watt: '',
                        notes: '',
                        part: 1,
                        proportion: 100,
                        curve: '',
                        text1: '',
                        text2: '',
                        text3: '',
                        text4: '',
                        text5: '',
                        text6: '',
                        text7: '',
                        text8: '',
                        text9: '',
                        text10: ''
                    });
                }
            }
        }

        if (instruments.length === 0) throw new Error("No fixtures found in XML");

        return await saveInstruments(instruments, merge);
    } catch (e) {
        console.error("MA2 XML Import Failed", e);
        return false;
    }
};

export const removeDuplicates = async () => {
    return await db.transaction('rw', db.instruments, async () => {
        const all = await db.instruments.toArray();
        const seen = new Set();
        const duplicates = [];

        for (const inst of all) {
            const { id, ...rest } = inst;
            const signature = JSON.stringify(rest, Object.keys(rest).sort());

            if (seen.has(signature)) {
                duplicates.push(id);
            } else {
                seen.add(signature);
            }
        }

        if (duplicates.length > 0) {
            await db.instruments.bulkDelete(duplicates);
        }

        return duplicates.length;
    });
};
