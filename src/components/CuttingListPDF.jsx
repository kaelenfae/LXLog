import React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { PDFCoverPage } from './PDFCoverPage';
import { PDFHeader, PDFFooter, pdfStyles } from './PDFReportLayout';

const styles = StyleSheet.create({
    groupHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: '#000',
        paddingBottom: 4,
        marginTop: 16,
        marginBottom: 4,
    },
    tableHeader: {
        flexDirection: 'row',
        borderBottomWidth: 0.5,
        borderBottomColor: '#9ca3af',
        paddingBottom: 2,
        marginBottom: 2,
    },
    row: {
        flexDirection: 'row',
        borderBottomWidth: 0.5,
        borderBottomColor: '#f3f4f6',
        minHeight: 14,
        alignItems: 'center',
    },
});

export const CuttingListPDF = ({ showInfo, summary, sortBy, totalGroups, totalCuts, includeCover = true, orientation = 'portrait', standalone = true }) => {
    const pages = (
        <>
            {standalone && includeCover && <PDFCoverPage showInfo={showInfo} reportTitle="Cutting List" />}
            <Page size="A4" orientation={orientation} style={pdfStyles.page}>
                <PDFHeader title="CUTTING LIST" showInfo={showInfo} />

                {/* Summary line */}
                <View style={{ flexDirection: 'row', marginBottom: 12, paddingBottom: 6, borderBottomWidth: 0.5, borderBottomColor: '#d1d5db' }}>
                    <Text style={{ fontSize: 8, color: '#4b5563' }}>
                        Total {sortBy === 'color' ? 'Colors' : 'Types'}: {totalGroups}  •  Total Cuts: {totalCuts}
                    </Text>
                </View>

                {summary.map((group) => (
                    <View key={group.groupName} style={{ marginBottom: 12 }} wrap={false}>
                        <View style={styles.groupHeader}>
                            <Text style={{ fontSize: 14, fontWeight: 'bold', fontFamily: 'Courier' }}>{group.groupName}</Text>
                            <Text style={{ fontSize: 8, color: '#6b7280', marginLeft: 12 }}>
                                {group.count} cut{group.count !== 1 ? 's' : ''} required
                            </Text>
                        </View>

                        {/* Sub-table header */}
                        <View style={styles.tableHeader}>
                            <Text style={{ width: '50%', fontSize: 7, color: '#6b7280', textTransform: 'uppercase' }}>
                                {group.groupType === 'color' ? 'Instrument Type' : 'Color'}
                            </Text>
                            <Text style={{ width: '25%', fontSize: 7, color: '#6b7280', textTransform: 'uppercase', textAlign: 'center' }}>Frame Size</Text>
                            <Text style={{ width: '25%', fontSize: 7, color: '#6b7280', textTransform: 'uppercase', textAlign: 'right' }}>Quantity</Text>
                        </View>

                        {group.items.map((item, idx) => (
                            <View key={idx} style={styles.row}>
                                <Text style={{ width: '50%', fontSize: 8 }}>{item.type || item.color}</Text>
                                <Text style={{ width: '25%', fontSize: 8, textAlign: 'center', fontFamily: 'Courier', color: '#6b7280' }}>{item.frameSize || '—'}</Text>
                                <Text style={{ width: '25%', fontSize: 9, textAlign: 'right', fontWeight: 'bold', fontFamily: 'Courier' }}>{item.count}</Text>
                            </View>
                        ))}
                    </View>
                ))}

                <PDFFooter showInfo={showInfo} />
            </Page>
        </>
    );

    return standalone ? <Document>{pages}</Document> : pages;
};
