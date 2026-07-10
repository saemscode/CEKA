const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const oldStr = 'cajrvemigxghnfmyopiy';
const newStr = 'iruahxgkrucidihnfytq';

function replaceInFile(filePath) {
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
        const files = fs.readdirSync(filePath);
        for (const file of files) {
            replaceInFile(path.join(filePath, file));
        }
    } else if (stats.isFile() && (filePath.endsWith('.ts') || filePath.endsWith('.tsx'))) {
        let content = fs.readFileSync(filePath, 'utf8');
        if (content.includes(oldStr)) {
            console.log(`Replacing in ${filePath}`);
            content = content.split(oldStr).join(newStr);
            fs.writeFileSync(filePath, content, 'utf8');
        }
    }
}

replaceInFile(srcDir);
console.log('Global replacement complete.');
