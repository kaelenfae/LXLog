const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Find all files
const files = execSync('grep -rl "localStorage" src/').toString().trim().split('\n');

const keys = new Set();
const regex = /localStorage\.(?:get|set|remove)Item\(\s*['"]([^'"]+)['"]/g;

files.forEach(file => {
    if (!file) return;
    const content = fs.readFileSync(file, 'utf8');
    let match;
    while ((match = regex.exec(content)) !== null) {
        keys.add(match[1]);
    }
});

const keyArray = Array.from(keys).sort();

// Generate constants
let constantsAdd = '\nexport const STORAGE_KEYS = {\n';
keyArray.forEach(key => {
    // create a constant name like CHANNEL_HOOKUP_COLUMN_ORDER
    const constName = key.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase().replace(/-/g, '_');
    constantsAdd += `    ${constName}: '${key}',\n`;
});
constantsAdd += '};\n';

fs.appendFileSync('src/constants.js', constantsAdd);

// Create a map for replacement
const keyMap = {};
keyArray.forEach(key => {
    const constName = key.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase().replace(/-/g, '_');
    keyMap[key] = `STORAGE_KEYS.${constName}`;
});

files.forEach(file => {
    if (!file) return;
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;

    // Add import statement if we are replacing something
    if (content.includes('localStorage.')) {
        // Need to add import
        // Determine relative path to constants
        const depth = file.split('/').length - 2;
        let importPath = depth === 0 ? './constants' : '../'.repeat(depth) + 'constants';
        if (file === 'src/theme/themeScript.js') {
             // Let's manually handle themeScript.js or just hardcode string replacement?
             // Actually, themeScript.js is vanilla JS that is injected in index.html, it can't import ES6 modules!
             // Wait, themeScript.js is built by vite? No, it's just copied or injected.
             // Let's check themeScript.js first. 
        }

        if (file !== 'src/theme/themeScript.js') {
            // Check if already imports from constants
            if (content.includes('from \'../constants\'') || content.includes('from \'./constants\'')) {
                content = content.replace(/import\s+\{([^}]+)\}\s+from\s+['"]([^'"]*constants)['"];?/, (match, p1, p2) => {
                    if (!p1.includes('STORAGE_KEYS')) {
                        return `import { ${p1.trim()}, STORAGE_KEYS } from '${p2}';`;
                    }
                    return match;
                });
            } else {
                // Add import to top
                const lines = content.split('\n');
                let insertIndex = 0;
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].startsWith('import ')) {
                        insertIndex = i + 1;
                    } else if (lines[i].trim() !== '') {
                        break;
                    }
                }
                lines.splice(insertIndex, 0, `import { STORAGE_KEYS } from '${importPath}';`);
                content = lines.join('\n');
            }

            // Replace strings
            keyArray.forEach(key => {
                const constName = keyMap[key];
                // Replace localStorage.getItem('key') with localStorage.getItem(STORAGE_KEYS.KEY)
                const getRe = new RegExp(`localStorage\\.getItem\\(\\s*['"]${key}['"]\\s*\\)`, 'g');
                const setRe = new RegExp(`localStorage\\.setItem\\(\\s*['"]${key}['"]\\s*,`, 'g');
                const rmRe = new RegExp(`localStorage\\.removeItem\\(\\s*['"]${key}['"]\\s*\\)`, 'g');

                content = content.replace(getRe, `localStorage.getItem(${constName})`);
                content = content.replace(setRe, `localStorage.setItem(${constName},`);
                content = content.replace(rmRe, `localStorage.removeItem(${constName})`);
            });

            fs.writeFileSync(file, content);
            console.log('Updated ' + file);
        }
    }
});

console.log('Done.');
