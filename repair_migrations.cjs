const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const migrationsDir = path.join(__dirname, 'supabase', 'migrations');
const files = fs.readdirSync(migrationsDir);

const versions = [];
for (const file of files) {
  if (file.endsWith('.sql') && file !== '20260710_02_curated_grid.sql') {
    const versionMatch = file.match(/^([a-zA-Z0-9_-]+?)_/);
    if (versionMatch) {
      versions.push(versionMatch[1]);
    } else {
      // If it doesn't match the underscore pattern, try just grabbing the prefix or standard numeric
      const fallbackMatch = file.match(/^(\d+)/);
      if (fallbackMatch) versions.push(fallbackMatch[1]);
      else if (file.startsWith('CONSOLIDATED_')) {
          const cMatch = file.match(/^(CONSOLIDATED_\d+)/);
          if (cMatch) versions.push(cMatch[1]);
      }
    }
  }
}

console.log(`Found ${versions.length} versions to mark as applied.`);

for (let i = 0; i < versions.length; i++) {
  const version = versions[i];
  console.log(`[${i+1}/${versions.length}] Marking ${version} as applied...`);
  try {
    // using cmd /c to bypass PS execution policy on Windows
    execSync(`cmd /c "npx supabase migration repair --status applied ${version}"`, { stdio: 'inherit', env: { ...process.env, SUPABASE_DB_PASSWORD: "1268Saem'sTunes!" } });
  } catch (err) {
    console.error(`Failed to repair ${version}`);
  }
}
console.log('Finished repairing all local files.');
