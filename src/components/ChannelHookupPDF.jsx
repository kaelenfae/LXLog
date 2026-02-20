import React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { PDFCoverPage } from './PDFCoverPage';
import { PDFHeader, PDFFooter, pdfStyles } from './PDFReportLayout';

const styles = StyleSheet.create({
    section: { marginBottom: 10 },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 0.5,
        borderBottomColor: '#e5e7eb',
        minHeight: 16,
        alignItems: 'center',
    },
    tableHeader: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#000000',
        backgroundColor: '#f9fafb',
        minHeight: 18,
        alignItems: 'center',
    },
    cell: { fontSize: 8, padding: 3 },
    headerCell: { fontSize: 7, fontWeight: 'bold', textTransform: 'uppercase', padding: 3 },
    spacer: { height: 6 },
});

const COL_WIDTHS = {
    channel: '10%', address: '12%', type: '25%', watt: '8%',
    purpose: '20%', position: '15%', color: '10%',
};

export const ChannelHookupPDF = ({ showInfo, processedData, visibleColumnOrder, columnLabels, includeCover = true, orientation = 'portrait', standalone = true }) => {
    const getLabel = (id) => {
        const labels = { channel: 'Ch', address: 'Addr', type: 'Type', watt: 'Watt', purpose: 'Purpose', position: 'Position', color: 'Color' };
        return labels[id] || id;
    };

    const getCellValue = (inst, colId) => {
        if (colId === 'channel') return inst.displayChannel || inst.channel || '-';
        if (colId === 'address') return inst.address || '';
        return inst[colId] || '';
    };

    const pages = (
        <>
            {standalone && includeCover && <PDFCoverPage showInfo={showInfo} reportTitle="Channel Hookup" />}
            <Page size="A4" orientation={orientation} style={pdfStyles.page}>
                <PDFHeader title="CHANNEL HOOKUP" showInfo={showInfo} />

                {/* Table Header */}
                <View style={styles.tableHeader} fixed>
                    {visibleColumnOrder.map(colId => (
                        <View key={colId} style={[styles.headerCell, { width: COL_WIDTHS[colId] || '10%' }]}>
                            <Text>{getLabel(colId)}</Text>
                        </View>
                    ))}
                </View>

                {/* Rows */}
                {processedData.map((inst, idx) => {
                    const isNewChannel = !inst.isSecondaryPart;
                    const prev = idx > 0 ? processedData[idx - 1] : null;
                    const needsSpacing = isNewChannel && prev;

                    return (
                        <React.Fragment key={inst.id || idx}>
                            {needsSpacing && <View style={styles.spacer} />}
                            <View style={[styles.tableRow, { backgroundColor: idx % 2 === 1 ? '#f9fafb' : '#fff' }]}>
                                {visibleColumnOrder.map(colId => (
                                    <View key={colId} style={[styles.cell, { width: COL_WIDTHS[colId] || '10%' }]}>
                                        <Text style={colId === 'channel' && isNewChannel ? { fontWeight: 'bold', fontSize: 10 } : {}}>
                                            {getCellValue(inst, colId)}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </React.Fragment>
                    );
                })}

                <PDFFooter showInfo={showInfo} />
            </Page>
        </>
    );

    return standalone ? <Document>{pages}</Document> : pages;
};
