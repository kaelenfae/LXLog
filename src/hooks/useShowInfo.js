import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

/**
 * Shared hook to fetch show metadata.
 * Returns { showInfo, metadata } where showInfo is the first metadata record
 * with sensible defaults, and metadata is the raw array.
 */
export function useShowInfo() {
    const metadata = useLiveQuery(() => db.showMetadata.toArray());
    const showInfo = metadata && metadata[0]
        ? metadata[0]
        : { name: 'Untitled Show', venue: '', designer: '' };
    return { showInfo, metadata };
}
