import fs from 'fs';
import path from 'path';

// Setup paths
const svgDir = 'd:/CEKA/ceka v010/CEKA/context/SVG Images';
const publicImgDir = 'd:/CEKA/ceka v010/CEKA/public/images';

// Ensure public images directory exists
if (!fs.existsSync(publicImgDir)) {
  fs.mkdirSync(publicImgDir, { recursive: true });
}

console.log('--- Loading Source SVG files ---');

const afroProfilePath = path.join(svgDir, 'afroProfile.svg');
const afroWithFlowerPath = path.join(svgDir, 'afroWithFlower.svg');
const facelessAfroPuffsPath = path.join(svgDir, 'facelessAfroPuffs.svg');
const partnersSrcPath = path.join(svgDir, 'partners.svg');
const loginSrcPath = path.join(svgDir, 'login.svg');
const signupSrcPath = path.join(publicImgDir, 'undraw_group-selfie_uih0.svg');

// Helper to extract path d attribute by start of string or class
function extractPathD(svgContent, startPattern) {
  const regex = new RegExp(`d=["'](${startPattern}[^"']+)["']`, 'i');
  const match = svgContent.match(regex);
  if (match) {
    return match[1];
  }
  return null;
}

// 1. Read files
const afroProfileSvg = fs.readFileSync(afroProfilePath, 'utf8');
const afroWithFlowerSvg = fs.readFileSync(afroWithFlowerPath, 'utf8');
const facelessAfroPuffsSvg = fs.readFileSync(facelessAfroPuffsPath, 'utf8');
let partnersSvg = fs.readFileSync(partnersSrcPath, 'utf8');
let loginSvg = fs.readFileSync(loginSrcPath, 'utf8');
let signupSvg = fs.readFileSync(signupSrcPath, 'utf8');

// 2. Extract the Transplant Hair Paths
console.log('--- Performing Hair Transplant Extractions ---');

// Male Afro from afroProfile.svg (starts with M854.6,457.4)
const maleAfroD = extractPathD(afroProfileSvg, 'M854.6,457.4');
if (!maleAfroD) {
  console.error('Error: Could not extract male Afro path');
  process.exit(1);
}

// Female Afro Hair with Flower from afroWithFlower.svg:
// Main Hair (starts with M473.2,261.6)
const femaleHairD = extractPathD(afroWithFlowerSvg, 'M473.2,261.6');
// Gold Highlights/Bangs (starts with M221.7,386.6)
const femaleBangsD = extractPathD(afroWithFlowerSvg, 'M221.7,386.6');
// Flower (starts with M153.5,163.7)
const flowerD = extractPathD(afroWithFlowerSvg, 'M153.5,163.7');
// Flower center (starts with M132,130.7)
const flowerCenterD = extractPathD(afroWithFlowerSvg, 'M132,130.7');

if (!femaleHairD || !femaleBangsD || !flowerD || !flowerCenterD) {
  console.error('Error: Could not extract female hair or flower paths from afroWithFlower.svg');
  process.exit(1);
}

// Female Puffs from facelessAfroPuffs.svg (starts with M443.3,291.3)
const femalePuffsD = extractPathD(facelessAfroPuffsSvg, 'M443.3,291.3');
if (!femalePuffsD) {
  console.error('Error: Could not extract female Afro puffs path');
  process.exit(1);
}


// 3. Process partners.svg
console.log('--- Processing partner-final.svg as partners.svg ---');
const partnerFinalPath = path.join(svgDir, 'partner-final.svg');
if (fs.existsSync(partnerFinalPath)) {
  let partnerFinalSvg = fs.readFileSync(partnerFinalPath, 'utf8');
  
  // Recolor skin tone: #ed9da0 -> #8c583a (chocolate skin tone)
  partnerFinalSvg = partnerFinalSvg.replaceAll('fill="#ed9da0"', 'fill="#8c583a"');
  
  // Replace purple (#6c63ff) clothes with Kenya Green (#006600)
  partnerFinalSvg = partnerFinalSvg.replace(
    'd="M94.488,354.7c-18.53,52.76,5.079,94.327.18,67.513-4.095-22.409,65.677-90.6,86.679-76.538-.44-2.275-17.24-47.809-17.344-50.171-.4-9.124,3.145-18.932,7.276-28.679,2.707-7.531,2.755-14,.131-19.218a19.238,19.238,0,0,0-10.62-9.179l-13.762-16.621c-3.585-4.326-8.872-13.661-14.49-13.626l-30.156-1.077c-.862-.518-11.451,8.588-21.761,13.056-11.182,4.851-8.875,18.089-8.847,18.258l.026.158.123.113L88.36,287.074l14.851,13.918c-.752,2.182-.564,3.82.845,4.759-2.023,1.5-11.02,46.258-9.567,47.826V354.7h0Z" transform="translate(-61.265 -143.534)" fill="#6c63ff"',
    'd="M94.488,354.7c-18.53,52.76,5.079,94.327.18,67.513-4.095-22.409,65.677-90.6,86.679-76.538-.44-2.275-17.24-47.809-17.344-50.171-.4-9.124,3.145-18.932,7.276-28.679,2.707-7.531,2.755-14,.131-19.218a19.238,19.238,0,0,0-10.62-9.179l-13.762-16.621c-3.585-4.326-8.872-13.661-14.49-13.626l-30.156-1.077c-.862-.518-11.451,8.588-21.761,13.056-11.182,4.851-8.875,18.089-8.847,18.258l.026.158.123.113L88.36,287.074l14.851,13.918c-.752,2.182-.564,3.82.845,4.759-2.023,1.5-11.02,46.258-9.567,47.826V354.7h0Z" transform="translate(-61.265 -143.534)" fill="#006600"'
  );
  partnerFinalSvg = partnerFinalSvg.replace(
    'transform="translate(-116.321 -213.527)" fill="#6c63ff"',
    'transform="translate(-116.321 -213.527)" fill="#006600"'
  );
  partnerFinalSvg = partnerFinalSvg.replace(
    'transform="translate(-62.434 -225.681)" fill="#6c63ff"',
    'transform="translate(-62.434 -225.681)" fill="#006600"'
  );

  // 1. Dots in a line: leftmost green, middle red, rightmost green
  partnerFinalSvg = partnerFinalSvg.replace(
    'transform="translate(885.512 421.934)" fill="#6c63ff"',
    'transform="translate(885.512 421.934)" fill="#006600"'
  );
  partnerFinalSvg = partnerFinalSvg.replace(
    'transform="translate(939.616 422.212)" fill="#6c63ff"',
    'transform="translate(939.616 422.212)" fill="#CC0000"'
  );
  partnerFinalSvg = partnerFinalSvg.replace(
    'transform="translate(994.564 400.952)" fill="#6c63ff"',
    'transform="translate(994.564 400.952)" fill="#006600"'
  );

  // 2. Larger circle and lines in card: all green
  partnerFinalSvg = partnerFinalSvg.replace(
    'transform="translate(20.164 17.541)" fill="#6c63ff"',
    'transform="translate(20.164 17.541)" fill="#006600"'
  );
  partnerFinalSvg = partnerFinalSvg.replace(
    'd="M335.9,264.656a2.508,2.508,0,0,0,0,5.014H454.1a2.508,2.508,0,1,0,.192-5.012H335.9Z" transform="translate(-272.509 -247.119)" fill="#6c63ff"',
    'd="M335.9,264.656a2.508,2.508,0,0,0,0,5.014H454.1a2.508,2.508,0,1,0,.192-5.012H335.9Z" transform="translate(-272.509 -247.119)" fill="#006600"'
  );
  partnerFinalSvg = partnerFinalSvg.replace(
    'd="M335.9,277.995a2.508,2.508,0,0,0,0,5.014H454.1a2.508,2.508,0,1,0,.192-5.012H335.9Z" transform="translate(-272.509 -245.411)" fill="#6c63ff"',
    'd="M335.9,277.995a2.508,2.508,0,0,0,0,5.014H454.1a2.508,2.508,0,1,0,.192-5.012H335.9Z" transform="translate(-272.509 -245.411)" fill="#006600"'
  );

  // 3. Footnote icon: green
  partnerFinalSvg = partnerFinalSvg.replace(
    'd="M467.329,555.809H442.468a7.883,7.883,0,0,1-7.874-7.874c-4.713-12.8-5.307-24.29,0-33.885a7.883,7.883,0,0,1,7.874-7.874c7.351-5.333,15.922-3.713,24.861,0a7.883,7.883,0,0,1,7.874,7.874c-3.017,10.856-2.8,22.183,0,33.885A7.883,7.883,0,0,1,467.329,555.809Z" transform="translate(-430.833 -502.756)" fill="#6c63ff"',
    'd="M467.329,555.809H442.468a7.883,7.883,0,0,1-7.874-7.874c-4.713-12.8-5.307-24.29,0-33.885a7.883,7.883,0,0,1,7.874-7.874c7.351-5.333,15.922-3.713,24.861,0a7.883,7.883,0,0,1,7.874,7.874c-3.017,10.856-2.8,22.183,0,33.885A7.883,7.883,0,0,1,467.329,555.809Z" transform="translate(-430.833 -502.756)" fill="#006600"'
  );
  
  // Replace remaining purple hues (circles, document accents, etc.) with Kenya Red (#CC0000)
  partnerFinalSvg = partnerFinalSvg.replaceAll('fill="#6c63ff"', 'fill="#CC0000"');
  
  fs.writeFileSync(path.join(publicImgDir, 'partners.svg'), partnerFinalSvg, 'utf8');
  console.log('Saved partners.svg to public/images');
} else {
  console.error(`Error: partner-final.svg not found at ${partnerFinalPath}`);
  process.exit(1);
}


// 4. Process login.svg
console.log('--- Processing login.svg ---');

// Recolor characters' skin tones: #ed9da0 -> #7F481E (chocolate)
loginSvg = loginSvg.replaceAll('fill="#ed9da0"', 'fill="#7F481E"');

// Globe ocean base: M918.894,371.581... -> make it white (#ffffff)
loginSvg = loginSvg.replace(
  /d="M918\.894,371\.581a162\.335,162\.335,0,1,1-10\.278-57\.164c\.354\.953\.7,1\.907,1\.035,2\.869v\.009q2\.247,6\.346,3\.959,12\.929a163\.437,163\.437,0,0,1,5\.284,41\.357Z"([^>]*fill=["'])#3f3d56(["'])/gi,
  'd="M918.894,371.581a162.335,162.335,0,1,1-10.278-57.164c.354.953.7,1.907,1.035,2.869v.009q2.247,6.346,3.959,12.929a163.437,163.437,0,0,1,5.284,41.357Z"$1#ffffff$2'
);

// Globe line circling the globe: M988.44,574.029... and M418.036,564.517... -> make it white (#ffffff)
const whitePaths = [
  'M988.44,574.029',
  'M418.036,564.517'
];

for (const startPath of whitePaths) {
  // Find match (it could have #6c63ff or #ce1519 based on previous state)
  const regex = new RegExp(`d=["'](${startPath}[^"']+)["']([^>]*fill=["']#[a-f0-9]+["'])`, 'i');
  loginSvg = loginSvg.replace(regex, (match, d, fill) => {
    return `d="${d}"${fill.replace(/#[a-f0-9]+/i, '#ffffff')}`;
  });
}

// Americas continents: M726.792,255.071..., M685.911,335.667..., M699.889,393.272..., M655.615,282.015... -> make it green (#006600)
const greenPaths = [
  'M726.792,255.071',
  'M685.911,335.667',
  'M699.889,393.272',
  'M655.615,282.015'
];

for (const startPath of greenPaths) {
  const regex = new RegExp(`d=["'](${startPath}[^"']+)["']([^>]*fill=["']#[a-f0-9]+["'])`, 'i');
  loginSvg = loginSvg.replace(regex, (match, d, fill) => {
    return `d="${d}"${fill.replace(/#[a-f0-9]+/i, '#006600')}`;
  });
}

// Character paths with fill="#6c63ff" -> CEKA Green (#006400)
const charLoginPaths = [
  'M865.167,326.984',
  'M865.249,413.008',
  'M780.536,384.666',
  'M722.063,316.174',
  'M716.136,297.882',
  'M822.488,390.913',
  'M832.315,393.136',
  'M850.665,397.687',
  'M772.61,403.517',
  'M770.285,409.663',
  'M743.462,268.278',
  'M771,258.242',
  'M705.71825,507.325',
  'M739.09813,502.295',
  'M746.69823,503.725',
  'M821.75829,473.515'
];

for (const startPath of charLoginPaths) {
  const regex = new RegExp(`d=["'](${startPath}[^"']+)["']([^>]*fill=["']#[a-f0-9]+["'])`, 'i');
  loginSvg = loginSvg.replace(regex, (match, d, fill) => {
    return `d="${d}"${fill.replace(/#[a-f0-9]+/i, '#006400')}`;
  });
}

// Small circles -> Red, White, and Black
// Circle at 1490.951 -> Red (#ce1519)
loginSvg = loginSvg.replace(
  /transform="translate\(1490\.951 756\.014\)" fill="[^"]*"/gi,
  'transform="translate(1490.951 756.014)" fill="#ce1519"'
);

// Circle at 1039.345 -> White (#ffffff)
loginSvg = loginSvg.replace(
  /transform="translate\(1039\.345 648\.766\)" fill="[^"]*"/gi,
  'transform="translate(1039.345 648.766)" fill="#ffffff"'
);

// Circle at 1471.854 -> Black (#2f2e41)
loginSvg = loginSvg.replace(
  /transform="translate\(1471\.854 341\.933\)" fill="[^"]*"/gi,
  'transform="translate(1471.854 341.933)" fill="#2f2e41"'
);

// Circle at 1404.426 -> White (#ffffff)
loginSvg = loginSvg.replace(
  /transform="translate\(1404\.426 531\.589\)" fill="[^"]*"/gi,
  'transform="translate(1404.426 531.589)" fill="#ffffff"'
);

// Let's replace any leftover #6c63ff or #ce1519 (background curves/dots etc.) with White/Red as desired
// The user said: "REVERT TO WHITE FOR the line scircling the globe, the Americas colour too, small circles can be red, white and black. the globe's oceans can be white."
// All other background curves/waves should be white too to kill the red?
// "KILL THE RED. REVERT TO WHITE FOR the line scircling the globe... small circles can be red, white and black. the globe's oceans can be white."
// Let's change any remaining red (#ce1519) in the background to white (#ffffff) or white-ish, except for the red small circle!
loginSvg = loginSvg.replaceAll('fill="#ce1519"', 'fill="#ffffff"');
// Re-apply the red small circle:
loginSvg = loginSvg.replace('transform="translate(1490.951 756.014)" fill="#ffffff"', 'transform="translate(1490.951 756.014)" fill="#ce1519"');

fs.writeFileSync(path.join(publicImgDir, 'login.svg'), loginSvg, 'utf8');
console.log('Saved login.svg to public/images');


// 5. Process undraw_group-selfie_uih0.svg
console.log('--- Processing undraw_group-selfie_uih0.svg ---');

// Recolor skin tone: #ed9da0 -> #7F481E (chocolate skin tone)
signupSvg = signupSvg.replaceAll('fill="#ed9da0"', 'fill="#7F481E"');

fs.writeFileSync(signupSrcPath, signupSvg, 'utf8');
console.log('Saved undraw_group-selfie_uih0.svg to public/images');

console.log('--- SVG Processing Complete Successfully ---');
