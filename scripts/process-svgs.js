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

// 2. Extract the Transplant Hair Paths
console.log('--- Performing Hair Transplant Extractions ---');

// Male Afro from afroProfile.svg (starts with M854.6,457.4)
const maleAfroD = extractPathD(afroProfileSvg, 'M854.6,457.4');
if (!maleAfroD) {
  console.error('Error: Could not extract male Afro path');
  process.exit(1);
}
console.log('Extracted Male Afro path length:', maleAfroD.length);

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
console.log('Extracted Female Hair with Flower paths');

// Female Puffs from facelessAfroPuffs.svg (starts with M443.3,291.3)
const femalePuffsD = extractPathD(facelessAfroPuffsSvg, 'M443.3,291.3');
if (!femalePuffsD) {
  console.error('Error: Could not extract female Afro puffs path');
  process.exit(1);
}
console.log('Extracted Female Afro puffs path length:', femalePuffsD.length);


// 3. Process partners.svg
console.log('--- Processing partners.svg ---');

// We need to remove the old hair paths. Let's do this by filtering out paths starting with specific coordinates.
// We can use a regex to match and remove entire <path> elements that contain the old hair paths.
const pathsToRemove = [
  'M818.913,219.8102',
  'M791.9668,223.65966',
  'M810.43534,197.849',
  'M358.51608,190.97871',
  'M192.892,282.153',
  'M408.09722,280.95294',
  'M693.70022,186.178'
];

for (const oldPathStart of pathsToRemove) {
  // Match a path tag containing this d attribute value
  const pathRegex = new RegExp(`<path[^>]+d=["']${oldPathStart}[^"']+["'][^>]*\\/?>`, 'gi');
  partnersSvg = partnersSvg.replace(pathRegex, '');
}

// Let's build the transplanted hair groups
const maleAfroGroup = `
  <!-- Transplanted Male Afro (from afroProfile.svg) -->
  <g transform="translate(24, -39) scale(0.267)">
    <path d="${maleAfroD}" fill="#2f2e41" />
  </g>
`;

const femaleFlowerHairGroup = `
  <!-- Transplanted Female Hair with Flower (from afroWithFlower.svg) -->
  <g transform="translate(315.8, -89.0) scale(0.715)">
    <path d="${femaleHairD}" fill="#2f2e41" />
    <path d="${femaleBangsD}" fill="#2f2e41" />
    <path d="${flowerD}" fill="#ce1519" /> <!-- Kenya Red Flower -->
    <path d="${flowerCenterD}" fill="#006400" /> <!-- Kenya Green Flower Center -->
  </g>
`;

const femalePuffsGroup = `
  <!-- Transplanted Female Afro Puffs (from facelessAfroPuffs.svg) -->
  <g transform="translate(583.4, 5.2) scale(0.199)">
    <path d="${femalePuffsD}" fill="#2f2e41" />
  </g>
`;

// Insert the new hair groups right before the closing </svg> tag
partnersSvg = partnersSvg.replace('</svg>', `${maleAfroGroup}${femaleFlowerHairGroup}${femalePuffsGroup}</svg>`);

// Recolor skin tones from #ffb6b6 to chocolate skin tones
// Let's do it precisely by replacing specific elements:
// For Character 2 (left, male):
// <circle cx="191.538" cy="82.50891" r="46.81885" fill="#ffb6b6"/> -> #8c583a
// <path d="M379.05672..." fill="#ffb6b6"/> -> #8c583a
// <polygon points="..." fill="#ffb6b6"/> -> #8c583a
// <path d="M476.36329..." fill="#ffb6b6"/> -> #8c583a

partnersSvg = partnersSvg.replace('cx="191.538" cy="82.50891" r="46.81885" fill="#ffb6b6"', 'cx="191.538" cy="82.50891" r="46.81885" fill="#8c583a"');
partnersSvg = partnersSvg.replace('d="M379.05672,311.42954a23.4277,23.4277,0,0,0-35.49309,13.858L300.57777,437.29108,226.69,395.34309a22.87524,22.87524,0,1,0-14.27186,22.7523c15.56013,16.60716,83.01892,84.69637,110.94639,58.09227,23.47441-22.362,57.3508-109.02911,65.50546-138.957A23.43014,23.43014,0,0,0,379.05672,311.42954Z" transform="translate(-181 -130.99812)" fill="#ffb6b6"', 'd="M379.05672,311.42954a23.4277,23.4277,0,0,0-35.49309,13.858L300.57777,437.29108,226.69,395.34309a22.87524,22.87524,0,1,0-14.27186,22.7523c15.56013,16.60716,83.01892,84.69637,110.94639,58.09227,23.47441-22.362,57.3508-109.02911,65.50546-138.957A23.43014,23.43014,0,0,0,379.05672,311.42954Z" transform="translate(-181 -130.99812)" fill="#8c583a"');
partnersSvg = partnersSvg.replace('points="117.341 349.883 130.906 411.195 230.098 420.167 239.214 366.781 117.341 349.883" fill="#ffb6b6"', 'points="117.341 349.883 130.906 411.195 230.098 420.167 239.214 366.781 117.341 349.883" fill="#8c583a"');
partnersSvg = partnersSvg.replace('d="M476.36329,502.76855l-1.84316-143.55284a23.17268,23.17268,0,0,0-23.16985-22.80657h-.00007a23.17271,23.17271,0,0,0-23.14009,24.40154l6.486,149.05754.12313,90.73906a20.22151,20.22151,0,1,0,24.8266,7.56106Z" transform="translate(-181 -130.99812)" fill="#ffb6b6"', 'd="M476.36329,502.76855l-1.84316-143.55284a23.17268,23.17268,0,0,0-23.16985-22.80657h-.00007a23.17271,23.17271,0,0,0-23.14009,24.40154l6.486,149.05754.12313,90.73906a20.22151,20.22151,0,1,0,24.8266,7.56106Z" transform="translate(-181 -130.99812)" fill="#8c583a"');

// For Character 3 (center, female):
// <circle cx="450.21597" cy="72.59881" r="53.60692" fill="#ffb6b6"/> -> #7f481e
// <path d="M528.18594..." fill="#ffb6b6"/> -> #7f481e
// <path d="M692.58051..." fill="#ffb6b6"/> -> #7f481e

partnersSvg = partnersSvg.replace('cx="450.21597" cy="72.59881" r="53.60692" fill="#ffb6b6"', 'cx="450.21597" cy="72.59881" r="53.60692" fill="#7f481e"');
partnersSvg = partnersSvg.replace('d="M528.18594,713.43646l7.61052-54.22065-30.36735-8.66909-6.00663,57.61172a18.32876,18.32876,0,1,0,28.76346,5.278Z" transform="translate(-181 -130.99812)" fill="#ffb6b6"', 'd="M528.18594,713.43646l7.61052-54.22065-30.36735-8.66909-6.00663,57.61172a18.32876,18.32876,0,1,0,28.76346,5.278Z" transform="translate(-181 -130.99812)" fill="#7f481e"');
partnersSvg = partnersSvg.replace('d="M692.58051,710.565l-4.05011-54.60215,30.86907-6.66559,2.228,57.88114a18.32876,18.32876,0,1,1-29.047,3.3866Z" transform="translate(-181 -130.99812)" fill="#ffb6b6"', 'd="M692.58051,710.565l-4.05011-54.60215,30.86907-6.66559,2.228,57.88114a18.32876,18.32876,0,1,1-29.047,3.3866Z" transform="translate(-181 -130.99812)" fill="#7f481e"');

// Recolor clothes from #6c63ff to CEKA brand colors:
// Character 2 (left) shirt -> Kenya Green (#006400)
partnersSvg = partnersSvg.replace('d="M360.25006,281.71589l49.37257-2.54338,22.93226,36.23574s43.14762,7.21373,40.15679,58.05785-52.49777,95.46007-52.49777,95.46007l2.11627-7.25542-3.67543,10.502.47132,5.89689,5.014,6.245.51621,6.4585-4.44235,10.21851v0a5.83891,5.83891,0,0,1-5.53624,8.90024l-71.33958-7.14938c-1.62421-4.468-2.92741-9.81387-9.43789-.91444l-6.72031-.65106-27.93639-2.7066-1.6443-5.98994a23.20469,23.20469,0,0,1,3.77511-20.01465v0a30.60736,30.60736,0,0,1,1.77136-22.98081l.13362-.2677,2.96669-2.47279s-32.45673-48.76167,4.80261-85.48825l14.95415-25.42206,16.73241-20.41434Z" transform="translate(-181 -130.99812)" fill="#6c63ff"', 'd="M360.25006,281.71589l49.37257-2.54338,22.93226,36.23574s43.14762,7.21373,40.15679,58.05785-52.49777,95.46007-52.49777,95.46007l2.11627-7.25542-3.67543,10.502.47132,5.89689,5.014,6.245.51621,6.4585-4.44235,10.21851v0a5.83891,5.83891,0,0,1-5.53624,8.90024l-71.33958-7.14938c-1.62421-4.468-2.92741-9.81387-9.43789-.91444l-6.72031-.65106-27.93639-2.7066-1.6443-5.98994a23.20469,23.20469,0,0,1,3.77511-20.01465v0a30.60736,30.60736,0,0,1,1.77136-22.98081l.13362-.2677,2.96669-2.47279s-32.45673-48.76167,4.80261-85.48825l14.95415-25.42206,16.73241-20.41434Z" transform="translate(-181 -130.99812)" fill="#006400"');

// Character 3 (center) shirt paths -> Kenya Red (#ce1519)
partnersSvg = partnersSvg.replace('d="M508.6679,635.777c45.65079-53.43516,30.23132-121.4003,12.11288-190.00758l3.44756-101.35372a31.00393,31.00393,0,0,1,14.02907-24.90184L584.861,289.0678,603,262.84191l50,5,27.72649,29.322,30.69062,23.42985a50.84312,50.84312,0,0,1,18.79205,51.39009L700.83948,504.80436s12.28383,68.85522,4.78852,76.45969-26.80842.00387-11.49291,8.54042c18.37976,10.24451,35.09164,8.35414,25.79051,17.65527s2.47025,22.23225,2.47025,22.23225Z" transform="translate(-181 -130.99812)" fill="#6c63ff"', 'd="M508.6679,635.777c45.65079-53.43516,30.23132-121.4003,12.11288-190.00758l3.44756-101.35372a31.00393,31.00393,0,0,1,14.02907-24.90184L584.861,289.0678,603,262.84191l50,5,27.72649,29.322,30.69062,23.42985a50.84312,50.84312,0,0,1,18.79205,51.39009L700.83948,504.80436s12.28383,68.85522,4.78852,76.45969-26.80842.00387-11.49291,8.54042c18.37976,10.24451,35.09164,8.35414,25.79051,17.65527s2.47025,22.23225,2.47025,22.23225Z" transform="translate(-181 -130.99812)" fill="#ce1519"');
partnersSvg = partnersSvg.replace('d="M586,298.84191s-86.4384,28.13284-88.4995,48.71733S496.12293,380.74489,487,463.11505l.48061,221.88319s57.95172,12.40752,52.0085-.8585-3.86948-19.50742-3.86948-19.50742,12.42491-4.90311,9.31468-20.47947,12.48716-92.76777,12.48716-92.76777L567.266,412.94623Z" transform="translate(-181 -130.99812)" fill="#6c63ff"', 'd="M586,298.84191s-86.4384,28.13284-88.4995,48.71733S496.12293,380.74489,487,463.11505l.48061,221.88319s57.95172,12.40752,52.0085-.8585-3.86948-19.50742-3.86948-19.50742,12.42491-4.90311,9.31468-20.47947,12.48716-92.76777,12.48716-92.76777L567.266,412.94623Z" transform="translate(-181 -130.99812)" fill="#ce1519"');
partnersSvg = partnersSvg.replace('d="M661.99007,293.07805s84.41465,33.72272,85.12583,54.39792-.79456,33.20472,2.92474,115.99505l-14.983,221.37726s-58.63881,8.593-51.84116-4.2562,5.1363-19.21278,5.1363-19.21278-12.07784-5.70478-7.95612-21.04453S674,546.94918,674,546.94918l-.77441-138.78628Z" transform="translate(-181 -130.99812)" fill="#6c63ff"', 'd="M661.99007,293.07805s84.41465,33.72272,85.12583,54.39792-.79456,33.20472,2.92474,115.99505l-14.983,221.37726s-58.63881,8.593-51.84116-4.2562,5.1363-19.21278,5.1363-19.21278-12.07784-5.70478-7.95612-21.04453S674,546.94918,674,546.94918l-.77441-138.78628Z" transform="translate(-181 -130.99812)" fill="#ce1519"');

// Character 1 (right) shirt -> Dark Royal Blue (#0f3b7c)
partnersSvg = partnersSvg.replace('d="M821.75829,473.515,801.998,435.775a23.47654,23.47654,0,0,0-29.21973-14.54c-.22021.06-.43017.13-.6499.21a23.52681,23.52681,0,0,0-14.46045,29.93l7.93018,41.71a8.44646,8.44646,0,0,0,4.08008,5.74,8.25123,8.25123,0,0,0,3.77978,1.12,8.13863,8.13863,0,0,0,3.23-.45l4.24024-1.48,27.21972-9.48,8.90039-3.1a8.47065,8.47065,0,0,0,4.71-11.92Z" transform="translate(-242.35207 -147.91501)" fill="#6c63ff"', 'd="M821.75829,473.515,801.998,435.775a23.47654,23.47654,0,0,0-29.21973-14.54c-.22021.06-.43017.13-.6499.21a23.52681,23.52681,0,0,0-14.46045,29.93l7.93018,41.71a8.44646,8.44646,0,0,0,4.08008,5.74,8.25123,8.25123,0,0,0,3.77978,1.12,8.13863,8.13863,0,0,0,3.23-.45l4.24024-1.48,27.21972-9.48,8.90039-3.1a8.47065,8.47065,0,0,0,4.71-11.92Z" transform="translate(-242.35207 -147.91501)" fill="#0f3b7c"');

// Other miscellaneous purple shapes (documents on table/background objects)
partnersSvg = partnersSvg.replaceAll('fill="#6c63ff"', 'fill="#ce1519"');

// Write out partners.svg
fs.writeFileSync(path.join(publicImgDir, 'partners.svg'), partnersSvg, 'utf8');
console.log('Saved partners.svg to public/images');


// 4. Process login.svg
console.log('--- Processing login.svg ---');

// In login.svg:
// Skin tone: #ed9da0 -> change to #7F481E (chocolate skin tone)
loginSvg = loginSvg.replaceAll('fill="#ed9da0"', 'fill="#7F481E"');

// Clothes: #6c63ff -> change to CEKA Green (#006400) for the character's paths
// Background waves/dots: #6c63ff -> change to Kenya Red (#ce1519)
// Let's do this by targeting specific path coordinates for background vs character:
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
  const regex = new RegExp(`d=["'](${startPath}[^"']+)["']([^>]*fill=["']#6c63ff["'])`, 'i');
  loginSvg = loginSvg.replace(regex, (match, d, fill) => {
    return `d="${d}"${fill.replace('#6c63ff', '#006400')}`; // Change to CEKA Green
  });
}

// Background curves and dots (remaining #6c63ff) -> Kenya Red (#ce1519)
loginSvg = loginSvg.replaceAll('fill="#6c63ff"', 'fill="#ce1519"');

// Write out login.svg
fs.writeFileSync(path.join(publicImgDir, 'login.svg'), loginSvg, 'utf8');
console.log('Saved login.svg to public/images');

console.log('--- SVG Processing Complete Successfully ---');
