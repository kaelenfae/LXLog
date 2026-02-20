import React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { PDFCoverPage } from './PDFCoverPage';
import { PDFHeader, PDFFooter, pdfStyles } from './PDFReportLayout';

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        borderBottomWidth: 0.5,
        borderBottomColor: '#e5e7eb',
        minHeight: 18,
        alignItems: 'center',
    },
});

export const EquipmentListPDF = ({ showInfo, summary, total, includeCover = true, orientation = 'portrait', standalone = true }) => {
    const pages = (
        <>
            {standalone && includeCover && <PDFCoverPage showInfo={showInfo} reportTitle="Equipment List" />}
            <Page size="A4" orientation={orientation} style={pdfStyles.page}>
                <PDFHeader title="EQUIPMENT LIST" showInfo={showInfo} />

                {/* Table Header */}
                <View style={{ flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: '#000', paddingBottom: 4, marginBottom: 4 }} fixed>
                    <Text style={{ width: '70%', fontSize: 8, fontWeight: 'bold', textTransform: 'uppercase' }}>Instrument Type</Text>
                    <Text style={{ width: '30%', fontSize: 8, fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'right' }}>Quantity</Text>
                </View>

                {summary.map((row, idx) => (
                    <View key={row.type} style={[styles.row, { backgroundColor: idx % 2 === 1 ? '#f9fafb' : '#fff' }]}>
                        <Text style={{ width: '70%', fontSize: 9, padding: 4 }}>{row.type}</Text>
                        <Text style={{ width: '30%', fontSize: 10, fontWeight: 'bold', fontFamily: 'Courier', textAlign: 'right', padding: 4 }}>{row.count}</Text>
                    </View>
                ))}

                {/* Total */}
                <View style={{ flexDirection: 'row', borderTopWidth: 2, borderTopColor: '#000', paddingTop: 6, marginTop: 4 }}>
                    <Text style={{ width: '70%', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' }}>Total Instruments</Text>
                    <Text style={{ width: '30%', fontSize: 12, fontWeight: 'bold', textAlign: 'right' }}>{total}</Text>
                </View>

                <PDFFooter showInfo={showInfo} />
            </Page>
        </>
    );

    return standalone ? <Document>{pages}</Document> : pages;
};
