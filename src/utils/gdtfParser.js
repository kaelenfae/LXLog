import JSZip from 'jszip';

/**
 * Parse a GDTF file and extract fixture information
 * GDTF files are ZIP archives containing description.xml and optional resources
 * @param {File|ArrayBuffer} gdtfFile - The .gdtf file
 * @returns {Promise<Object>} Parsed fixture data
 */
export async function parseGdtfFile(gdtfFile) {
    try {
        const zip = new JSZip();
        const contents = await zip.loadAsync(gdtfFile);

        // Find and extract description.xml
        const descriptionFile = contents.file('description.xml');
        if (!descriptionFile) {
            throw new Error('Invalid GDTF file: missing description.xml');
        }

        const xmlString = await descriptionFile.async('string');
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

        // Check for parse errors
        const parseError = xmlDoc.querySelector('parsererror');
        if (parseError) {
            throw new Error('Failed to parse GDTF XML: ' + parseError.textContent);
        }

        // Extract FixtureType node
        const fixtureType = xmlDoc.querySelector('FixtureType');
        if (!fixtureType) {
            throw new Error('Invalid GDTF file: missing FixtureType node');
        }

        // Extract basic fixture info
        const fixtureData = {
            fixtureTypeId: fixtureType.getAttribute('FixtureTypeID') || '',
            name: fixtureType.getAttribute('Name') || '',
            shortName: fixtureType.getAttribute('ShortName') || '',
            longName: fixtureType.getAttribute('LongName') || '',
            manufacturer: fixtureType.getAttribute('Manufacturer') || '',
            description: fixtureType.getAttribute('Description') || '',
            thumbnail: fixtureType.getAttribute('Thumbnail') || '',
            wattage: 0,
            weight: 0,
            dmxModes: [],
            rawXml: xmlString
        };

        // Extract Physical Properties (wattage, weight)
        const properties = xmlDoc.querySelector('PhysicalDescriptions Properties');
        if (properties) {
            // Power consumption
            const powerConsumption = properties.querySelector('PowerConsumption');
            if (powerConsumption) {
                fixtureData.wattage = parseFloat(powerConsumption.getAttribute('Value')) || 0;
            }

            // Weight
            const weight = properties.querySelector('Weight');
            if (weight) {
                fixtureData.weight = parseFloat(weight.getAttribute('Value')) || 0;
            }
        }

        // Alternative: Look for OperatingTemperature parent for power info
        const operatingTemp = xmlDoc.querySelector('OperatingTemperature');
        if (operatingTemp && !fixtureData.wattage) {
            const powerConsumption = operatingTemp.getAttribute('PowerConsumption');
            if (powerConsumption) {
                fixtureData.wattage = parseFloat(powerConsumption) || 0;
            }
        }

        // Extract DMX Modes
        const dmxModes = xmlDoc.querySelectorAll('DMXModes DMXMode');
        dmxModes.forEach(mode => {
            const modeName = mode.getAttribute('Name') || 'Default';
            const description = mode.getAttribute('Description') || '';

            // Count DMX channels in this mode
            const channels = mode.querySelectorAll('DMXChannel');
            const channelCount = channels.length;

            // Calculate footprint and extract channel attributes
            let footprint = 0;
            const channelMap = [];

            channels.forEach(channel => {
                const offset = channel.getAttribute('Offset');
                const geometry = channel.getAttribute('Geometry') || '';

                // Get the LogicalChannel to find the attribute
                const logicalChannel = channel.querySelector('LogicalChannel');
                let attribute = '';
                if (logicalChannel) {
                    attribute = logicalChannel.getAttribute('Attribute') || '';
                }

                // Also try getting from ChannelFunction if LogicalChannel doesn't have it
                if (!attribute) {
                    const channelFunc = channel.querySelector('ChannelFunction');
                    if (channelFunc) {
                        attribute = channelFunc.getAttribute('Attribute') || channelFunc.getAttribute('Name') || '';
                    }
                }

                if (offset) {
                    const offsets = offset.split(',').map(o => parseInt(o.trim()));
                    const minOffset = Math.min(...offsets);
                    const maxOffset = Math.max(...offsets);
                    if (maxOffset + 1 > footprint) {
                        footprint = maxOffset + 1;
                    }

                    // Store each DMX address used
                    offsets.forEach((off, idx) => {
                        channelMap.push({
                            dmxAddress: off + 1, // 1-indexed for display
                            attribute: attribute || geometry || `Channel ${minOffset + 1}`,
                            resolution: offsets.length > 1 ? (idx === 0 ? 'Coarse' : 'Fine') : '',
                            geometry: geometry
                        });
                    });
                }
            });

            // Sort by DMX address
            channelMap.sort((a, b) => a.dmxAddress - b.dmxAddress);

            fixtureData.dmxModes.push({
                name: modeName,
                description: description,
                channelCount: channelCount,
                footprint: footprint || channelCount,
                channels: channelMap
            });
        });

        // Try to extract thumbnail image
        if (fixtureData.thumbnail) {
            const thumbnailFile = contents.file(fixtureData.thumbnail + '.png') ||
                contents.file(fixtureData.thumbnail + '.svg');
            if (thumbnailFile) {
                const thumbnailBlob = await thumbnailFile.async('blob');
                fixtureData.thumbnailBlob = thumbnailBlob;
            }
        }

        // Extract Wheels (gobos, colors, etc.)
        fixtureData.wheels = [];
        const wheels = xmlDoc.querySelectorAll('Wheels Wheel');
        for (const wheel of wheels) {
            const wheelName = wheel.getAttribute('Name') || 'Unknown Wheel';
            const wheelData = {
                name: wheelName,
                slots: []
            };

            const slots = wheel.querySelectorAll('Slot');
            for (const slot of slots) {
                const slotName = slot.getAttribute('Name') || '';
                const mediaFileName = slot.getAttribute('MediaFileName') || '';
                const color = slot.getAttribute('Color') || '';

                const slotData = {
                    name: slotName,
                    color: color,
                    mediaFileName: mediaFileName,
                    imageData: null
                };

                // Try to load the image if mediaFileName exists
                if (mediaFileName) {
                    // GDTF stores wheel images in wheels/ folder
                    const possiblePaths = [
                        `wheels/${mediaFileName}`,
                        `wheels/${mediaFileName}.png`,
                        `wheels/${mediaFileName}.svg`,
                        mediaFileName,
                        `${mediaFileName}.png`,
                        `${mediaFileName}.svg`
                    ];

                    for (const path of possiblePaths) {
                        const imageFile = contents.file(path);
                        if (imageFile) {
                            try {
                                const imageBlob = await imageFile.async('base64');
                                const ext = path.endsWith('.svg') ? 'svg+xml' : 'png';
                                slotData.imageData = `data:image/${ext};base64,${imageBlob}`;
                                break;
                            } catch (e) {
                                console.warn('Failed to load wheel image:', path);
                            }
                        }
                    }
                }

                wheelData.slots.push(slotData);
            }

            // Only add wheels that have slots
            if (wheelData.slots.length > 0) {
                fixtureData.wheels.push(wheelData);
            }
        }

        return fixtureData;
    } catch (error) {
        console.error('GDTF Parse Error:', error);
        throw error;
    }
}

/**
 * Import a GDTF fixture into the database
 * @param {Object} db - Dexie database instance
 * @param {Object} fixtureData - Parsed fixture data from parseGdtfFile
 * @returns {Promise<number>} The ID of the imported fixture
 */
export async function importGdtfToLibrary(db, fixtureData) {
    // Check if fixture already exists by fixtureTypeId
    const existing = await db.fixtureLibrary
        .where('fixtureTypeId')
        .equals(fixtureData.fixtureTypeId)
        .first();

    const record = {
        fixtureTypeId: fixtureData.fixtureTypeId,
        name: fixtureData.name,
        shortName: fixtureData.shortName,
        longName: fixtureData.longName,
        manufacturer: fixtureData.manufacturer,
        description: fixtureData.description,
        wattage: fixtureData.wattage,
        weight: fixtureData.weight,
        dmxModes: fixtureData.dmxModes,
        wheels: fixtureData.wheels || [],
        thumbnailBlob: fixtureData.thumbnailBlob || null,
        rawXml: fixtureData.rawXml,
        importedAt: new Date().toISOString()
    };

    if (existing) {
        // Update existing fixture
        await db.fixtureLibrary.update(existing.id, record);
        return existing.id;
    } else {
        // Add new fixture
        return await db.fixtureLibrary.add(record);
    }
}

/**
 * Link an instrument to a GDTF fixture type
 * @param {Object} db - Dexie database instance
 * @param {number} instrumentId - The instrument ID
 * @param {string} fixtureTypeId - The GDTF fixture type ID
 * @param {boolean} populateWattage - Whether to auto-populate wattage from GDTF
 * @returns {Promise<boolean>} Success status
 */
export async function linkInstrumentToFixture(db, instrumentId, fixtureTypeId, populateWattage = true) {
    const fixture = await db.fixtureLibrary
        .where('fixtureTypeId')
        .equals(fixtureTypeId)
        .first();

    if (!fixture) {
        throw new Error('Fixture type not found in library');
    }

    const updates = { fixtureTypeId };

    if (populateWattage && fixture.wattage) {
        updates.watt = fixture.wattage;
    }

    await db.instruments.update(instrumentId, updates);
    return true;
}

/**
 * Get all fixtures from the library
 * @param {Object} db - Dexie database instance
 * @returns {Promise<Array>} Array of fixture records
 */
export async function getFixtureLibrary(db) {
    return await db.fixtureLibrary.toArray();
}

/**
 * Search fixtures by name or manufacturer
 * @param {Object} db - Dexie database instance  
 * @param {string} query - Search query
 * @returns {Promise<Array>} Matching fixtures
 */
export async function searchFixtureLibrary(db, query) {
    const allFixtures = await db.fixtureLibrary.toArray();
    const lowerQuery = query.toLowerCase();

    return allFixtures.filter(f =>
        f.name.toLowerCase().includes(lowerQuery) ||
        f.manufacturer.toLowerCase().includes(lowerQuery) ||
        f.shortName.toLowerCase().includes(lowerQuery)
    );
}

/**
 * Delete a fixture from the library
 * @param {Object} db - Dexie database instance
 * @param {number} fixtureId - The fixture ID to delete
 */
export async function deleteFixtureFromLibrary(db, fixtureId) {
    await db.fixtureLibrary.delete(fixtureId);
}
