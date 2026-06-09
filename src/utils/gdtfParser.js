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

const parseWattageFromName = (name) => {
    if (!name) return 0;
    // Look for patterns like "750W", "750 W", "750w"
    const match = name.match(/(\d+)\s*[Ww](?!\w)/);
    return match ? parseInt(match[1]) : 0;
};

function gdtfColorToCss(colorStr) {
    if (!colorStr) return null;
    const parts = colorStr.split(',').map(p => parseFloat(p.trim()));
    if (parts.length !== 3) return null;

    // Check if it looks like RGB (0-255) - Vectorworks often does this
    if (parts.some(p => p > 1.01 && p <= 255)) {
        return `rgb(${Math.round(parts[0])}, ${Math.round(parts[1])}, ${Math.round(parts[2])})`;
    }

    // Treat as CIE xyY (GDTF Spec)
    const [x, y, Y] = parts;
    if (y === 0) return Y > 0 ? '#ffffff' : '#000000';
    
    // Convert to XYZ
    const X = (x * Y) / y;
    const Z = ((1 - x - y) * Y) / y;
    
    // XYZ to sRGB (D65)
    let r = X *  3.2406 + Y * -1.5372 + Z * -0.4986;
    let g = X * -0.9689 + Y *  1.8758 + Z *  0.0415;
    let b = X *  0.0557 + Y * -0.2040 + Z *  1.0570;

    // Scaling (Y is 0-100)
    r /= 100; g /= 100; b /= 100;

    // Gamma correction
    const f = (c) => c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1/2.4) - 0.055;
    
    r = Math.max(0, Math.min(1, f(r)));
    g = Math.max(0, Math.min(1, f(g)));
    b = Math.max(0, Math.min(1, f(b)));

    return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
}

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
            fixtureTypeId: fixtureType.getAttribute('FixtureTypeID') || crypto.randomUUID(),
            name: fixtureType.getAttribute('Name') || 'Unknown Fixture',
            shortName: fixtureType.getAttribute('ShortName') || '',
            manufacturer: fixtureType.getAttribute('Manufacturer') || 'Unknown',
            description: fixtureType.getAttribute('Description') || '',
            wattage: parseFloat(fixtureType.getAttribute('Wattage')) || 0,
            weight: parseFloat(fixtureType.getAttribute('Weight')) || 0,
            dmxModes: [],
            wheels: [],
            geometryMap: {},
            footprint: 0,
            rawXml: xmlString // Store raw XML for source viewing
        };

        // Fallback: Parse wattage from name if missing
        if (fixtureData.wattage === 0) {
            fixtureData.wattage = parseWattageFromName(fixtureData.name) || parseWattageFromName(fixtureData.shortName);
        }

        // Fallback for Wattage/Weight if they are in PhysicalDescriptions or Beam nodes
        if (fixtureData.wattage === 0 || fixtureData.weight === 0) {
            const physical = findElDeep(fixtureType, 'PhysicalDescriptions');
            if (physical) {
                // Some GDTFs put these in properties
                getEls(physical, 'Properties').forEach(props => {
                    getEls(props, 'Property').forEach(prop => {
                        const pName = prop.getAttribute('Name');
                        if (pName === 'Wattage' && fixtureData.wattage === 0) fixtureData.wattage = parseFloat(prop.getAttribute('Value')) || 0;
                        if (pName === 'Weight' && fixtureData.weight === 0) fixtureData.weight = parseFloat(prop.getAttribute('Value')) || 0;
                    });
                });
            }

            // Still 0 or generic 1000? Check Beam nodes for PowerConsumption
            if (fixtureData.wattage === 0 || fixtureData.wattage === 1000) {
                const geometries = findElDeep(fixtureType, 'Geometries');
                if (geometries) {
                    let beamWattage = 0;
                    const findBeams = (parent) => {
                        getEls(parent, 'Beam').forEach(beam => {
                            const power = parseFloat(beam.getAttribute('PowerConsumption'));
                            if (power > beamWattage) beamWattage = power;
                        });
                        getEls(parent, '*').forEach(child => findBeams(child));
                    };
                    findBeams(geometries);
                    
                    // Only use Beam wattage if we haven't found a better one via name parsing
                    // or if the name parsing also gave us 0.
                    if (fixtureData.wattage === 0 || (fixtureData.wattage === 1000 && beamWattage > 0 && beamWattage !== 1000)) {
                        fixtureData.wattage = beamWattage;
                    }
                }
            }
        }

        // 0. Map Attribute Definitions (for pretty names)
        const attrMap = {};
        const attrContainer = findElDeep(fixtureType, 'AttributeDefinitions');
        if (attrContainer) {
            const attributes = findElDeep(attrContainer, 'Attributes');
            if (attributes) {
                getEls(attributes, 'Attribute').forEach(node => {
                    const name = node.getAttribute('Name');
                    if (name) {
                        attrMap[name] = {
                            pretty: node.getAttribute('Pretty') || name,
                            group: node.getAttribute('ActivationGroup') || ''
                        };
                    }
                });
            }
        }

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
                            prettyAttr: attrMap[cf.getAttribute('Attribute')]?.pretty || cf.getAttribute('Attribute'),
                            from: cf.getAttribute('DMXFrom') || '0',
                            to: cf.getAttribute('DMXTo') || '0'
                        }));

                    // We 'unroll' multi-byte channels so each address gets its own row
                    offsets.forEach((offset, i) => {
                        const suffix = i === 1 ? ' Fine' : (i === 2 ? ' Ultra' : '');
                        
                        if (!resolvedAddresses.has(offset)) {
                            resolvedAddresses.set(offset, {
                                index: offset,
                                attribute: primaryAttr,
                                prettyAttribute: (attrMap[primaryAttr]?.pretty || primaryAttr) + suffix,
                                geometry: geometryName,
                                geometryType: geometryMap[geometryName]?.type || 'Geometry',
                                resolution: offsets.length > 1 ? (offsets.length === 2 ? '16bit' : '24bit') : '8bit',
                                allOffsets: offsets,
                                splitChannels: [], 
                                functions: channelFunctions
                            });
                        } else {
                            const existing = resolvedAddresses.get(offset);
                            existing.splitChannels.push({
                                attribute: primaryAttr,
                                prettyAttribute: (attrMap[primaryAttr]?.pretty || primaryAttr) + suffix,
                                functions: channelFunctions
                            });
                        }
                    });
                });
            });

            // Convert map to array and sort by address
            mode.channels = Array.from(resolvedAddresses.values()).sort((a, b) => a.index - b.index);

            // GDTF Spec Check: If footprint is 0 but we have channels, 
            // the footprint is at least the highest address used.
            if (mode.footprint === 0 && mode.channels.length > 0) {
                mode.footprint = Math.max(...mode.channels.map(c => Math.max(...c.allOffsets)));
            }

            // Only push modes that have a footprint
            if (mode.footprint > 0) {
                fixtureData.dmxModes.push(mode);
            }
        });

        // 3. Parse Wheels (Gobo/Color Slots)
        const wheelsContainer = getEl(fixtureType, 'Wheels');
        if (wheelsContainer) {
            const wheels = getEls(wheelsContainer, 'Wheel');
            for (const wNode of wheels) {
                const wheel = {
                    name: wNode.getAttribute('Name') || 'Unnamed Wheel',
                    slots: []
                };
                const slots = getEls(wNode, 'Slot');
                for (const sNode of slots) {
                    const colorRaw = sNode.getAttribute('Color');
                    const slot = {
                        name: sNode.getAttribute('Name') || sNode.getAttribute('MediaFileName') || `Slot ${fixtureData.wheels.length + 1}`,
                        color: colorRaw,
                        cssColor: gdtfColorToCss(colorRaw),
                        png: sNode.getAttribute('MediaFileName') || sNode.getAttribute('PNG') || null,
                        imageData: null
                    };
                    
                    // Load PNG as base64 for DB storage
                    if (slot.png) {
                        const pngFile = contents.file(slot.png) || contents.file(`wheels/${slot.png}`) || contents.file(`png/${slot.png}`);
                        if (pngFile) {
                            const base64 = await pngFile.async('base64');
                            slot.imageData = `data:image/png;base64,${base64}`;
                        }
                    }
                    wheel.slots.push(slot);
                }
                fixtureData.wheels.push(wheel);
            }
        }

        // 4. Handle Assets (Thumbnail)
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
    const fixtureTypeId = fixtureData.fixtureTypeId || `${fixtureData.manufacturer}_${fixtureData.name}`.replace(/\s+/g, '_');
    
    let cleanedModes = fixtureData.dmxModes || [];
    if (cleanedModes.length > 1) {
        cleanedModes = cleanedModes.filter(m => (m.name || '').toLowerCase() !== 'default');
    }

    const record = {
        fixtureTypeId,
        name: fixtureData.name,
        shortName: fixtureData.shortName,
        manufacturer: fixtureData.manufacturer,
        description: fixtureData.description,
        wattage: fixtureData.wattage,
        weight: fixtureData.weight,
        dmxModes: cleanedModes,
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
