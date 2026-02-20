import React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { PDFCoverPage } from './PDFCoverPage';
import { PDFHeader, PDFFooter, pdfStyles } from './PDFReportLayout';

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        borderBottomWidth: 0.5,
        borderBottomColor: '#e5e7eb',
        minHeight: 14,
        alignItems: 'center',
        paddingVertical: 1,
    },
    headerRow: {
        backgroundColor: '#f3f4f6',
        borderBottomWidth: 1,
        borderBottomColor: '#000',
        paddingVertical: 2,
        marginTop: 8,
        marginBottom: 2,
    },
    columnContainer: {
        flexDirection: 'row',
        gap: 12,
        flex: 1,
    },
    columnRule: {
        borderRightWidth: 0.5,
        borderRightColor: '#d1d5db',
        paddingRight: 6,
    },
});

// Approximate rows that fit in one column of a page
const ROWS_PER_COL_PORTRAIT = 42;
const ROWS_PER_COL_LANDSCAPE = 28;

/**
 * Paginate-then-columnize: splits items into page-sized groups first,
 * then splits each page group into N columns. This ensures channels
 * flow sequentially across columns on the same page.
 */
function paginateAndColumnize(items, colCount, rowsPerCol) {
    const itemsPerPage = rowsPerCol * colCount;
    const pages = [];

    for (let i = 0; i < items.length; i += itemsPerPage) {
        const pageItems = items.slice(i, i + itemsPerPage);
        // Split this page's items into columns
        const columns = [];
        for (let c = 0; c < colCount; c++) {
            const start = c * rowsPerCol;
            const end = start + rowsPerCol;
            const col = pageItems.slice(start, end);
            if (col.length > 0) columns.push(col);
        }
        pages.push(columns);
    }

    return pages;
}

export const PatchPDF = ({ showInfo, processedData, includeCover = true, orientation = 'portrait', colCount = 3, standalone = true }) => {
    const rowsPerCol = orientation === 'landscape' ? ROWS_PER_COL_LANDSCAPE : ROWS_PER_COL_PORTRAIT;
    const pageData = paginateAndColumnize(processedData, colCount, rowsPerCol);

    const content = (
        <>
            {standalone && includeCover && <PDFCoverPage showInfo={showInfo} reportTitle="Patch" />}
            {pageData.map((pageColumns, pageIdx) => {
                const colWidth = `${Math.floor(100 / colCount)}%`;
                return (
                    <Page key={pageIdx} size="A4" orientation={orientation} style={pdfStyles.page}>
                        <PDFHeader title="PATCH" showInfo={showInfo} />

                        <View style={styles.columnContainer}>
                            {pageColumns.map((colItems, colIdx) => (
                                <View key={colIdx} style={[
                                    { width: colWidth },
                                    colIdx < pageColumns.length - 1 ? styles.columnRule : {}
                                ]}>
                                    {/* Per-column header */}
                                    <View style={{ flexDirection: 'row', borderBottomWidth: 1.5, borderBottomColor: '#000', paddingBottom: 3, marginBottom: 3 }}>
                                        <Text style={{ width: '25%', fontSize: 7, fontWeight: 'bold', textAlign: 'right', paddingRight: 4 }}>Ch</Text>
                                        <Text style={{ width: '30%', fontSize: 7, fontWeight: 'bold', paddingLeft: 2 }}>Addr</Text>
                                        <Text style={{ width: '45%', fontSize: 7, fontWeight: 'bold' }}>Type</Text>
                                    </View>

                                    {colItems.map((item, idx) => {
                                        if (item.isHeader) {
                                            return (
                                                <View key={item.id} style={styles.headerRow}>
                                                    <Text style={{ fontSize: 7, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 }}>{item.title}</Text>
                                                </View>
                                            );
                                        }
                                        const isPartDisplay = String(item.displayChannel || '').startsWith('.') ||
                                            String(item.displayChannel || '').startsWith('P');
                                        return (
                                            <View key={item.id || idx} style={styles.row}>
                                                <Text style={{ width: '25%', fontSize: isPartDisplay ? 7 : 9, fontWeight: isPartDisplay ? 'normal' : 'bold', textAlign: 'right', paddingRight: 4, color: isPartDisplay ? '#6b7280' : '#000' }}>
                                                    {item.displayChannel || item.channel || '-'}
                                                </Text>
                                                <Text style={{ width: '30%', fontSize: 8, fontWeight: 'bold', fontFamily: 'Courier', paddingLeft: 2 }}>
                                                    {item.address || '-'}
                                                </Text>
                                                <Text style={{ width: '45%', fontSize: 7, color: '#4b5563' }}>
                                                    {item.type || ''}
                                                </Text>
                                            </View>
                                        );
                                    })}
                                </View>
                            ))}
                        </View>

                        <PDFFooter showInfo={showInfo} />
                    </Page>
                );
            })}
        </>
    );

    return standalone ? <Document>{content}</Document> : content;
};
