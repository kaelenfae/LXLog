import JSZip from 'jszip';

/**
 * GDTF SPEC-COMPLIANT PARSER (v3 Architecture)
 * Focuses on physical DMX address resolution and split-channel grouping.
 */

const getEl = (parent, tagName) => {
    if (!parent) return null;
    const children = parent.childNodes;
    for (let i = 0; i < children.length; i++) {
        const node = children[i];
        if (node.nodeType === 1 && (node.nodeName === tagName || node.localName === tagName)) return node;
    }
    return null;
};

const getEls = (parent, tagName) => {
    if (!parent) return [];
    const result = [];
    const children = parent.childNodes;
    for (let i = 0; i < children.length; i++) {
        const node = children[i];
        if (node.nodeType === 1 && (tagName === '*' || node.nodeName === tagName || node.localName === tagName)) result.push(node);
    }
    return result;
};

const findElDeep = (parent, tagName) => {
    if (!parent) return null;
    const direct = getEl(parent, tagName);
    if (direct) return direct;
    const children = parent.childNodes;
    for (let i = 0; i < children.length; i++) {
        const node = children[i];
        if (node.nodeType === 1) {
            const found = findElDeep(node, tagName);
            if (found) return found;
        }
    }
    return null;
};

export async function parseGdtfFile(gdtfFile) {
    try {
        const zip = new JSZip();
        const contents = await zip.loadAsync(gdtfFile);

        const descriptionEntry = Object.keys(contents.files).find(name => name.toLowerCase().endsWith('description.xml'));
        if (!descriptionEntry) throw new Error('Invalid GDTF: missing description.xml');

        const xmlString = await contents.file(descriptionEntry).async('string');
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
        const root = xmlDoc.documentElement;

        const fixtureType = findElDeep(root, 'FixtureType');
        if (!fixtureType) throw new Error('Invalid GDTF: missing FixtureType node');

        const fixtureData = {
            id: fixtureType.getAttribute('FixtureTypeID') || root.getAttribute('FixtureTypeID') || '',
            name: fixtureType.getAttribute('Name') || '',
            shortName: fixtureType.getAttribute('ShortName') || '',
            manufacturer: fixtureType.getAttribute('Manufacturer') || '',
            description: fixtureType.getAttribute('Description') || '',
            thumbnail: fixtureType.getAttribute('Thumbnail') || '',
            wattage: 0,
            weight: 0,
            dmxModes: [],
            wheels: [],
            rawXml: xmlString
        };

        // 1. Map Geometries
        const geometryMap = {};
        const geometries = findElDeep(fixtureType, 'Geometries');
        if (geometries) {
            const traverse = (parent) => {
                getEls(parent, '*').forEach(node => {
                    const name = node.getAttribute('Name');
                    if (name) geometryMap[name] = { type: node.localName || node.nodeName };
                    traverse(node);
                });
            };
            traverse(geometries);
        }

        // 2. Parse DMX Modes (Address-First Resolution)
        const modesContainer = getEl(fixtureType, 'DMXModes');
        const modes = getEls(modesContainer, 'DMXMode');

        modes.forEach(modeNode => {
            const modeName = modeNode.getAttribute('Name');
            if (!modeName) return; // Skip unnamed/virtual modes

            const mode = {
                name: modeName,
                description: modeNode.getAttribute('Description') || '',
                footprint: 0,
                channels: []
            };

            const channelsContainer = getEl(modeNode, 'DMXChannels');
            const dmxChannels = getEls(channelsContainer, 'DMXChannel');

            // We use a map to group logical channels by their starting DMX address
            // This prevents duplicate rows for Split Channels (e.g. Dimmer/Shutter on same address)
            const resolvedAddresses = new Map();

            dmxChannels.forEach(chanNode => {
                const offsetAttr = chanNode.getAttribute('Offset');
                if (!offsetAttr) return;

                const offsets = offsetAttr.split(',').map(o => parseInt(o.trim())).filter(o => !isNaN(o));
                if (offsets.length === 0) return;

                const maxOffset = Math.max(...offsets);
                if (maxOffset > mode.footprint) mode.footprint = maxOffset;

                const geometryName = chanNode.getAttribute('Geometry');
                const logicalChannels = getEls(chanNode, 'LogicalChannel');
                
                // GDTF Rule: The first LogicalChannel is typically the primary one
                // for display purposes, but all non-NoFeature channels are functional.
                logicalChannels.forEach(lcNode => {
                    const primaryAttr = lcNode.getAttribute('Attribute');
                    if (primaryAttr === 'NoFeature') return;

                    const channelFunctions = getEls(lcNode, 'ChannelFunction')
                        .filter(cf => cf.getAttribute('Attribute') !== 'NoFeature')
                        .map(cf => ({
                            name: cf.getAttribute('Name'),
                            attr: cf.getAttribute('Attribute'),
                            from: cf.getAttribute('DMXFrom') || '0',
                            to: cf.getAttribute('DMXTo') || '0'
                        }));

                    // We store data based on the Coarse (first) offset
                    const primaryAddr = offsets[0];
                    if (!resolvedAddresses.has(primaryAddr)) {
                        resolvedAddresses.set(primaryAddr, {
                            index: primaryAddr,
                            attribute: primaryAttr,
                            geometry: geometryName,
                            resolution: offsets.length > 1 ? (offsets.length === 2 ? '16bit' : '24bit') : '8bit',
                            allOffsets: offsets,
                            splitChannels: [], // For storing other logical channels sharing this address
                            functions: channelFunctions
                        });
                    } else {
                        // This is a split channel! Add to the existing address entry
                        const entry = resolvedAddresses.get(primaryAddr);
                        entry.splitChannels.push({
                            attribute: primaryAttr,
                            functions: channelFunctions
                        });
                    }
                });
            });

            // Flatten the map and sort by address
            mode.channels = Array.from(resolvedAddresses.values()).sort((a, b) => a.index - b.index);

            // Only push modes that have a footprint
            if (mode.footprint > 0) {
                fixtureData.dmxModes.push(mode);
            }
        });

        // 3. Handle Assets (Thumbnail, Wheels) as before but with cleaned loop
        if (fixtureData.thumbnail) {
            const thumbFile = contents.file(fixtureData.thumbnail) || contents.file(`thumbnails/${fixtureData.thumbnail}`);
            if (thumbFile) fixtureData.thumbnailBlob = await thumbFile.async('blob');
        }

        return fixtureData;
    } catch (err) {
        console.error('GDTF Parse Failed:', err);
        throw err;
    }
}

export async function importGdtfToLibrary(db, fixtureData) {
    const fixtureTypeId = fixtureData.id || `${fixtureData.manufacturer}_${fixtureData.name}`.replace(/\s+/g, '_');
    const record = {
        fixtureTypeId,
        name: fixtureData.name,
        shortName: fixtureData.shortName,
        manufacturer: fixtureData.manufacturer,
        description: fixtureData.description,
        wattage: fixtureData.wattage,
        weight: fixtureData.weight,
        dmxModes: fixtureData.dmxModes,
        wheels: fixtureData.wheels,
        thumbnailBlob: fixtureData.thumbnailBlob || null,
        rawXml: fixtureData.rawXml,
        parserVersion: '3.0.0',
        importedAt: new Date().toISOString()
    };

    const existing = await db.fixtureLibrary.where('fixtureTypeId').equals(fixtureTypeId).first();
    if (existing) {
        await db.fixtureLibrary.update(existing.id, record);
        return existing.id;
    }
    return await db.fixtureLibrary.add(record);
}

export async function deleteFixtureFromLibrary(db, fixtureId) {
    return await db.fixtureLibrary.delete(fixtureId);
}
