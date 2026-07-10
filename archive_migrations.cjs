const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'supabase', 'migrations');
const destDir = path.join(__dirname, 'supabase', 'migrations_archive');

if (!fs.existsSync(destDir)) fs.mkdirSync(destDir);

const files = fs.readdirSync(srcDir);
for (const file of files) {
    if (file.endsWith('.sql') && file !== '20260710_02_curated_grid.sql') {
        fs.renameSync(path.join(srcDir, file), path.join(destDir, file));
    }
}
console.log('Archived all broken legacy migrations.');
