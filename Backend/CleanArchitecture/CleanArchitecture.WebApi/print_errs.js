const fs = require('fs');
const txt = fs.readFileSync('build_errors_stats.txt', 'utf8');
const lines = txt.split('\n');
for (const line of lines) {
    if (line.includes('error')) {
        console.log(line);
    }
}
