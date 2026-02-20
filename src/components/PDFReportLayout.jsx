import React from 'react';
import { StyleSheet, Document, Page, View, Text } from '@react-pdf/renderer';

export const pdfStyles = StyleSheet.create({
    page: {
        padding: 40,
        paddingBottom: 60,
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        borderBottomWidth: 2,
        borderBottomColor: '#000000',
        paddingBottom: 8,
        marginBottom: 20,
    },
    headerSide: {
        width: '33%',
    },
    headerCenter: {
        width: '33%',
        textAlign: 'center',
    },
    headerLabel: {
        fontSize: 7,
        textTransform: 'uppercase',
        color: '#666666',
        fontWeight: 'bold',
    },
    headerValue: {
        fontSize: 9,
        fontWeight: 'bold',
    },
    showTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    reportTitle: {
        fontSize: 7,
        textTransform: 'uppercase',
        marginTop: 2,
        color: '#333333',
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 40,
        right: 40,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#000000',
        flexDirection: 'row',
        justifyContent: 'space-between',
        fontSize: 7,
        color: '#666666',
    },
    pageNumber: {
        textAlign: 'right',
    },
});

/**
 * Shared PDF page header. Renders Venue | Show Name + Report Title | Designer/Info.
 * Used as a `fixed` element so it repeats on every page.
 */
export const PDFHeader = ({ title, showInfo }) => {
    // Collect all present show info fields
    const designStaff = [
        { label: 'Designer', value: showInfo.designer },
        { label: 'Assistant', value: showInfo.assistant },
        { label: 'Director', value: showInfo.director },
        { label: 'Producer', value: showInfo.producer },
    ].filter(f => f.value && f.value.trim() !== '');

    return (
        <View style={pdfStyles.header} fixed>
            <View style={pdfStyles.headerSide}>
                <Text style={pdfStyles.headerLabel}>VENUE</Text>
                <Text style={pdfStyles.headerValue}>{showInfo.venue || ' '}</Text>
            </View>
            <View style={pdfStyles.headerCenter}>
                <Text style={pdfStyles.showTitle}>{showInfo.name || 'Untitled Show'}</Text>
                <Text style={pdfStyles.reportTitle}>{title}</Text>
            </View>
            <View style={[pdfStyles.headerSide, { textAlign: 'right' }]}>
                {designStaff.map((staff, idx) => (
                    <View key={staff.label} style={{ marginBottom: idx < designStaff.length - 1 ? 2 : 0 }}>
                        <Text style={[pdfStyles.headerLabel, { textAlign: 'right' }]}>{staff.label}</Text>
                        <Text style={[pdfStyles.headerValue, { textAlign: 'right' }]}>{staff.value}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
};

/**
 * Shared PDF page footer. Renders report footer text, date, and page numbers.
 * Used as a `fixed` element so it repeats on every page.
 */
export const PDFFooter = ({ showInfo }) => (
    <View style={pdfStyles.footer} fixed>
        <Text>{showInfo.reportFooter || 'Made in LXLog'}</Text>
        <Text>{new Date().toLocaleDateString()}</Text>
        <Text
            style={pdfStyles.pageNumber}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
        />
    </View>
);

/**
 * Full PDF Report Layout wrapping a Document > Page with shared header/footer.
 * Use this when the PDF is a single-page-style document (content auto-flows).
 */
export const PDFReportLayout = ({ title, showInfo, children, orientation = 'landscape' }) => (
    <Document>
        <Page size="A4" orientation={orientation} style={pdfStyles.page}>
            <PDFHeader title={title} showInfo={showInfo} />
            <View style={{ flex: 1 }}>
                {children}
            </View>
            <PDFFooter showInfo={showInfo} />
        </Page>
    </Document>
);
