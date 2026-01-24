import fs from 'fs';
import readline from 'readline';

const fileStream = fs.createReadStream('d:/DevelopmentAntigravity/ONCE_Export.csv');
const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
});

let lineNum = 0;
rl.on('line', (line) => {
    lineNum++;
    if (line.includes('START_CHANNELS') || line.includes('END_CHANNELS') || line.includes('START_FIXTURES') || line.includes('END_FIXTURES')) {
        console.log(`${lineNum}: ${line.trim()}`);
    }
});
