import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

/**
 * Provides autocomplete suggestions for instrument fields using indexed queries.
 * Uses Dexie's orderBy().uniqueKeys() to avoid full-table scans.
 *
 * @param {Array} fixtureLibrary - Current fixture library array for type suggestions.
 * @returns {{ position: string[], purpose: string[], type: Array<{name: string, isLibrary: boolean, fixture?: object}> } | undefined}
 */
export function useSuggestions(fixtureLibrary = []) {
    // Use indexed unique key queries instead of loading all instruments
    const positions = useLiveQuery(
        () => db.instruments.orderBy('position').uniqueKeys(),
        []
    );
    const purposes = useLiveQuery(
        () => db.instruments.orderBy('purpose').uniqueKeys(),
        []
    );
    const typesInUse = useLiveQuery(
        () => db.instruments.orderBy('type').uniqueKeys(),
        []
    );

    if (!positions || !purposes || !typesInUse) return undefined;

    // Filter out empty strings and build sorted arrays
    const positionList = positions.filter(Boolean).sort();
    const purposeList = purposes.filter(Boolean).sort();

    const typeSet = new Set(typesInUse.filter(Boolean));

    // Merge library fixtures that aren't already in use
    const libraryTypes = fixtureLibrary
        .filter(f => !typeSet.has(f.name))
        .map(f => ({ name: f.name, isLibrary: true, fixture: f }));

    const typeList = [
        ...Array.from(typeSet).sort().map(t => ({ name: t, isLibrary: false })),
        ...libraryTypes.sort((a, b) => a.name.localeCompare(b.name))
    ];

    return {
        position: positionList,
        purpose: purposeList,
        type: typeList
    };
}
