const { JSDOM } = require('jsdom');
const fs = require('fs');

const xml = fs.readFileSync('source4_750w_xml.txt', 'utf-8');
const dom = new JSDOM(xml, { contentType: 'text/xml' });
const xmlDoc = dom.window.document;

const getEl = (parent, tagName) => {
    if (!parent) return null;
    const children = parent.childNodes;
    for (let i = 0; i < children.length; i++) {
        const node = children[i];
        if (node.nodeType === 1 && (node.nodeName === tagName || node.localName === tagName)) return node;
    }
    return null;
};

const getEls = (parent, tagName) => {
    if (!parent) return [];
    const result = [];
    const children = parent.childNodes;
    for (let i = 0; i < children.length; i++) {
        const node = children[i];
        if (node.nodeType === 1 && (tagName === '*' || node.nodeName === tagName || node.localName === tagName)) result.push(node);
    }
    return result;
};

const findElDeep = (parent, tagName) => {
    if (!parent) return null;
    const direct = getEl(parent, tagName);
    if (direct) return direct;
    const children = parent.childNodes;
    for (let i = 0; i < children.length; i++) {
        const node = children[i];
        if (node.nodeType === 1) {
            const found = findElDeep(node, tagName);
            if (found) return found;
        }
    }
    return null;
};

const fixtureType = findElDeep(xmlDoc, 'FixtureType');
const dmxModes = findElDeep(fixtureType, 'DMXModes');
const modes = getEls(dmxModes, 'DMXMode');

modes.forEach(mode => {
    console.log(`Mode: ${mode.getAttribute('Name')}`);
    const dmxChannels = findElDeep(mode, 'DMXChannels');
    const channels = getEls(dmxChannels, 'DMXChannel');
    channels.forEach(dmxChannel => {
        const offsetAttr = dmxChannel.getAttribute('Offset') || '';
        const offsets = offsetAttr.split(',').map(o => parseInt(o.trim())).filter(o => !isNaN(o));
        console.log(`  Channel: ${dmxChannel.getAttribute('Geometry')}, Offset: "${offsetAttr}", Parsed Offsets: ${JSON.stringify(offsets)}`);
    });
});
