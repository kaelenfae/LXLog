import React from 'react';
import { StyleSheet, View, Text, Document, Page } from '@react-pdf/renderer';
import { PDFCoverPage } from './PDFCoverPage';
import { PDFHeader, PDFFooter, pdfStyles } from './PDFReportLayout';
import { formatAddress } from '../utils/addressFormatter';

const styles = StyleSheet.create({
    section: {
        marginBottom: 15,
        breakInside: 'avoid',
    },
    positionHeader: {
        fontSize: 12,
        fontWeight: 'bold',
        backgroundColor: '#f3f4f6',
        padding: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#000000',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    table: {
        width: '100%',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 0.5,
        borderBottomColor: '#e5e7eb',
        minHeight: 20,
        alignItems: 'center',
    },
    tableHeader: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#000000',
        backgroundColor: '#f9fafb',
        minHeight: 20,
        alignItems: 'center',
    },
    tableCell: {
        fontSize: 8,
        padding: 3,
    },
    tableHeaderCell: {
        fontSize: 8,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        padding: 3,
    },
    // Column widths based on HangingScheduleReport.jsx defaults
    colUnit: { width: '8%' },
    colType: { width: '25%' },
    colWatt: { width: '8%' },
    colPurpose: { width: '25%' },
    colColor: { width: '12%' },
    colGobo: { width: '12%' },
    colChannel: { width: '10%' },
    colAddress: { width: '12%' },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingVertical: 4,
        paddingHorizontal: 10,
        backgroundColor: '#f9fafb',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    summaryText: {
        fontSize: 7,
        color: '#666666',
        marginLeft: 15,
        fontWeight: 'bold',
    }
});

export const HangingSchedulePDF = ({
    showInfo,
    instruments,
    visibleColumns,
    columnLabels,
    includeCover = true,
    orientation = 'landscape',
    channelDisplayMode = 'parts',
    addressMode = 'universe',
    showUniverse1 = false,
    universeSeparator = '/',
    standalone = true
}) => {
    // Group by position
    const positions = [...new Set(instruments.map(inst => inst.position || 'Unassigned'))].sort((a, b) => {
        if (a === 'Unassigned') return 1;
        if (b === 'Unassigned') return -1;
        return a.localeCompare(b, undefined, { numeric: true });
    });

    const grouped = positions.reduce((acc, pos) => {
        acc[pos] = instruments.filter(inst => (inst.position || 'Unassigned') === pos);
        return acc;
    }, {});

    // Column widths mapped to IDs
    const COL_WIDTHS = {
        unit: '8%',
        type: '22%',
        watt: '8%',
        purpose: '20%',
        color: '10%',
        gobo: '10%',
        channel: '10%',
        address: '12%',
        circuit: '10%',
        dimmer: '10%',
        notes: '20%'
    };

    const visibleColumnIds = Object.keys(visibleColumns).filter(id => visibleColumns[id] && id !== 'position');

    const pages = (
        <>
            {standalone && includeCover && (
                <PDFCoverPage showInfo={showInfo} reportTitle="Hanging Schedule" />
            )}

            <Page size="A4" orientation={orientation} style={pdfStyles.page}>
                <PDFHeader title="HANGING SCHEDULE" showInfo={showInfo} />

                {positions.map(position => {
                    const posUnits = grouped[position];
                    const totalWattage = posUnits.reduce((sum, inst) => sum + (parseInt(inst.watt) || 0), 0);

                    return (
                        <View key={position} style={styles.section} wrap={false}>
                            <View style={styles.positionHeader}>
                                <Text>{position}</Text>
                                <Text style={{ fontSize: 9, fontWeight: 'normal' }}>{posUnits.length} Units</Text>
                            </View>

                            <View style={styles.table}>
                                <View style={styles.tableHeader}>
                                    {visibleColumnIds.map(colId => (
                                        <View key={colId} style={[styles.tableHeaderCell, { width: COL_WIDTHS[colId] || '10%' }]}>
                                            <Text>{columnLabels[colId] || colId}</Text>
                                        </View>
                                    ))}
                                </View>

                                {posUnits.map((inst, idx) => (
                                    <View key={inst.id} style={[styles.tableRow, { backgroundColor: idx % 2 === 1 ? '#f9fafb' : '#ffffff' }]}>
                                        {visibleColumnIds.map(colId => (
                                            <View key={colId} style={[styles.tableCell, { width: COL_WIDTHS[colId] || '10%' }]}>
                                                <Text>
                                                    {colId === 'channel' ? (
                                                        inst.part > 1 ? (
                                                            channelDisplayMode === 'parts' ? `P${inst.part}` :
                                                                channelDisplayMode === 'dots' ? `.${inst.part}` :
                                                                    channelDisplayMode === 'hide' ? '' :
                                                                        inst.channel
                                                        ) : inst.channel
                                                    ) : colId === 'address' ? (
                                                        formatAddress(inst.address, inst.universe, addressMode, showUniverse1, universeSeparator)
                                                    ) : inst[colId] || ''}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                ))}

                                {/* Section Summary */}
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryText}>POSITION TOTALS:</Text>
                                    <Text style={styles.summaryText}>{posUnits.length} UNITS</Text>
                                    {totalWattage > 0 && (
                                        <Text style={styles.summaryText}>{totalWattage.toLocaleString()} WATTS</Text>
                                    )}
                                </View>
                            </View>
                        </View>
                    );
                })}

                <PDFFooter showInfo={showInfo} />
            </Page>
        </>
    );

    return standalone ? <Document>{pages}</Document> : pages;
}
