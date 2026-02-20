import React from 'react';
import { StyleSheet, View, Text, Page } from '@react-pdf/renderer';

const styles = StyleSheet.create({
    page: {
        padding: 60,
        backgroundColor: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
    },
    topBar: {
        position: 'absolute',
        top: 40,
        left: 0,
        right: 0,
        height: 10,
        backgroundColor: '#6366f1',
    },
    bottomBar: {
        position: 'absolute',
        bottom: 40,
        left: 0,
        right: 0,
        height: 10,
        backgroundColor: '#6366f1',
    },
    venue: {
        fontSize: 14,
        textTransform: 'uppercase',
        letterSpacing: 2,
        color: '#666666',
        marginBottom: 8,
    },
    showTitle: {
        fontSize: 42,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        textAlign: 'center',
        marginBottom: 20,
    },
    reportTitle: {
        fontSize: 18,
        textTransform: 'uppercase',
        letterSpacing: 4,
        color: '#333333',
        paddingVertical: 10,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#000000',
        marginBottom: 30,
        textAlign: 'center',
    },
    infoGrid: {
        marginTop: 20,
        alignItems: 'center',
    },
    infoText: {
        fontSize: 14,
        color: '#444444',
        marginBottom: 6,
    },
    customFields: {
        marginTop: 20,
        borderTopWidth: 0.5,
        borderColor: '#e5e7eb',
        paddingTop: 15,
        alignItems: 'center',
    },
    reportList: {
        marginTop: 40,
        alignItems: 'center',
    },
    reportListItem: {
        fontSize: 10,
        color: '#666666',
        marginBottom: 3,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    date: {
        fontSize: 12,
        color: '#888888',
        marginTop: 40,
    }
});

export const PDFCoverPage = ({ showInfo, reportTitle, includedReports = [] }) => {
    // Show Info Fields to display if present
    const fields = [
        { label: 'Designer', value: showInfo.designer },
        { label: 'Assistant', value: showInfo.assistant },
        { label: 'Director', value: showInfo.director },
        { label: 'Producer', value: showInfo.producer },
        { label: 'Company', value: showInfo.company },
    ].filter(f => f.value && f.value.trim() !== '');

    // Custom data fields (from showMetadata.customFields if any)
    const customData = showInfo.customFields || {};
    const customEntries = Object.entries(customData)
        .filter(([_, val]) => val && String(val).trim() !== '');

    return (
        <Page size="A4" style={styles.page}>
            <View style={styles.topBar} />

            {showInfo.venue && <Text style={styles.venue}>{showInfo.venue}</Text>}
            <Text style={styles.showTitle}>{showInfo.name || 'Untitled Show'}</Text>

            <View style={{ width: '100%', alignItems: 'center' }}>
                <Text style={styles.reportTitle}>{reportTitle}</Text>
            </View>

            <View style={styles.infoGrid}>
                {fields.map(f => (
                    <Text key={f.label} style={styles.infoText}>{f.label}: {f.value}</Text>
                ))}
            </View>

            {customEntries.length > 0 && (
                <View style={styles.customFields}>
                    {customEntries.map(([key, val]) => (
                        <Text key={key} style={styles.infoText}>{key}: {val}</Text>
                    ))}
                </View>
            )}

            {includedReports.length > 0 && (
                <View style={styles.reportList}>
                    <Text style={[styles.reportListItem, { fontWeight: 'bold', color: '#333', marginBottom: 6 }]}>Included Reports:</Text>
                    {includedReports.map(report => (
                        <Text key={report} style={styles.reportListItem}>• {report}</Text>
                    ))}
                </View>
            )}

            <Text style={styles.date}>{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</Text>

            <View style={styles.bottomBar} />
        </Page>
    );
};
