import React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { PDFCoverPage } from './PDFCoverPage';
import { PDFHeader, PDFFooter, pdfStyles } from './PDFReportLayout';

const styles = StyleSheet.create({
    sectionHeader: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        marginTop: 12,
        marginBottom: 6,
        borderRadius: 4,
    },
    card: {
        borderWidth: 1.5,
        borderRadius: 4,
        padding: 6,
        width: 70,
        alignItems: 'center',
        marginRight: 6,
        marginBottom: 6,
    },
});

const SECTION_STYLES = {
    Group: { bg: '#059669', border: '#10b981' },
    Preset: { bg: '#7c3aed', border: '#8b5cf6' },
    Sub: { bg: '#d97706', border: '#f59e0b' },
};

export const EosTargetsPDF = ({ showInfo, groups, presets, subs, includeCover = true, orientation = 'portrait', standalone = true }) => {
    const TargetSection = ({ title, items, type }) => {
        if (!items || items.length === 0) return null;
        const palette = SECTION_STYLES[type];
        return (
            <View style={{ marginBottom: 12 }}>
                <View style={[styles.sectionHeader, { backgroundColor: palette.bg }]}>
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#fff', textTransform: 'uppercase', letterSpacing: 1 }}>
                        {title}  ({items.length})
                    </Text>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {items.map((target, idx) => (
                        <View key={`${type}-${target.targetId}-${idx}`} style={[styles.card, { borderColor: palette.border }]}>
                            <Text style={{ fontSize: 12, fontWeight: 'bold' }}>{target.targetId}</Text>
                            {target.label ? (
                                <Text style={{ fontSize: 6, color: '#4b5563', marginTop: 2, textAlign: 'center' }}>{target.label}</Text>
                            ) : null}
                        </View>
                    ))}
                </View>
            </View>
        );
    };

    const pages = (
        <>
            {standalone && includeCover && <PDFCoverPage showInfo={showInfo} reportTitle="EOS Targets" />}
            <Page size="A4" orientation={orientation} style={pdfStyles.page}>
                <PDFHeader title="EOS TARGETS" showInfo={showInfo} />

                <TargetSection title="Groups" items={groups} type="Group" />
                <TargetSection title="Presets" items={presets} type="Preset" />
                <TargetSection title="Subs" items={subs} type="Sub" />

                <PDFFooter showInfo={showInfo} />
            </Page>
        </>
    );

    return standalone ? <Document>{pages}</Document> : pages;
};
