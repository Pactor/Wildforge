import * as THREE from 'three';

export const TILE_SIZE = 16;
export const ATLAS_COLUMNS = 8;
export const ATLAS_ROWS = 18;

const palettes = [
  [[102, 170, 67], [87, 151, 56], [123, 183, 76], [72, 130, 47]],
  [[122, 106, 54], [108, 86, 48], [139, 116, 60], [84, 73, 43]],
  [[137, 88, 51], [117, 72, 43], [153, 101, 60], [100, 62, 39]],
  [[132, 139, 139], [111, 118, 119], [151, 156, 155], [91, 99, 101]],
  [[137, 94, 51], [112, 73, 39], [157, 111, 62], [91, 59, 34]],
  [[158, 116, 67], [125, 87, 48], [177, 135, 80], [102, 69, 40]],
  [[57, 126, 55], [44, 108, 47], [72, 145, 65], [33, 89, 40]],
  [[216, 195, 127], [198, 177, 108], [232, 213, 150], [185, 163, 95]],
  [[49, 126, 195], [41, 109, 177], [62, 145, 211], [31, 91, 157]],
  [[105, 111, 111], [78, 83, 84], [42, 46, 47], [133, 137, 135]],
  [[176, 128, 75], [151, 105, 59], [194, 148, 90], [128, 87, 48]],
  [[151, 95, 50], [112, 68, 38], [181, 126, 70], [72, 46, 31]],
  [[169, 119, 67], [108, 70, 40], [202, 151, 90], [74, 48, 30]],
  [[132, 137, 136], [169, 130, 101], [188, 151, 119], [102, 108, 109]],
  [[224, 237, 241], [203, 220, 226], [240, 247, 248], [183, 204, 213]],
  [[221, 235, 239], [102, 137, 77], [129, 159, 95], [126, 88, 52]],
  [[58, 139, 71], [44, 112, 57], [78, 160, 84], [31, 88, 47]],
  [[106, 117, 105], [77, 103, 70], [133, 143, 130], [55, 82, 55]],
  [[112, 119, 120], [83, 90, 92], [42, 47, 49], [142, 147, 145]],
  [[105, 62, 37], [84, 48, 31], [126, 76, 43], [66, 38, 28]],
  [[85, 145, 53], [64, 124, 42], [108, 163, 61], [45, 102, 36]],
  [[104, 151, 55], [77, 127, 42], [130, 170, 66], [58, 105, 35]],
  [[164, 158, 65], [126, 134, 48], [187, 176, 76], [94, 110, 40]],
  [[207, 176, 62], [172, 143, 45], [226, 197, 80], [137, 112, 37]],
  [[151, 94, 47], [116, 68, 36], [181, 122, 65], [72, 45, 28]],
  [[237, 165, 55], [255, 206, 86], [126, 78, 37], [79, 48, 30]],
  [[153, 94, 48], [111, 65, 35], [184, 127, 70], [64, 41, 27]],
  [[190, 226, 232], [163, 210, 219], [220, 242, 245], [112, 174, 187]],
  [[78, 145, 54], [99, 168, 65], [53, 112, 42], [130, 184, 74]],
  [[73, 132, 51], [238, 190, 53], [255, 222, 82], [139, 92, 42]],
  [[65, 125, 50], [200, 61, 48], [233, 93, 57], [118, 44, 38]],
  [[184, 151, 116], [139, 88, 73], [99, 60, 55], [222, 197, 150]],
  [[111, 145, 78], [129, 161, 92], [83, 116, 62], [174, 190, 137]],
  [[71, 42, 32], [58, 34, 29], [86, 51, 38], [45, 27, 24]],
  [[72, 132, 54], [89, 154, 61], [53, 106, 43], [149, 105, 42]],
  [[78, 142, 57], [101, 166, 67], [57, 113, 44], [172, 116, 42]],
  [[88, 151, 61], [115, 176, 71], [62, 121, 47], [198, 128, 43]],
  [[92, 149, 59], [123, 181, 73], [214, 137, 46], [238, 164, 62]],
  [[238, 77, 20], [255, 132, 28], [255, 190, 48], [151, 32, 16]],
  [[103, 119, 121], [83, 93, 96], [89, 232, 218], [184, 255, 244]],
  [[62, 88, 89], [91, 137, 136], [118, 246, 233], [205, 255, 249]],
  [[91, 72, 52], [71, 55, 42], [116, 91, 63], [51, 42, 35]],
  [[36, 85, 68], [29, 69, 58], [49, 107, 82], [24, 55, 49]],
  [[40, 126, 113], [31, 101, 94], [62, 155, 133], [24, 78, 76]],
  [[58, 151, 101], [41, 117, 85], [105, 212, 130], [184, 239, 129]],
  [[91, 82, 70], [69, 63, 55], [113, 102, 83], [72, 91, 67]],
  [[48, 117, 105], [79, 203, 178], [136, 255, 220], [62, 70, 89]],
  [[137, 106, 86], [91, 78, 73], [191, 139, 91], [70, 62, 63]],
  [[106, 107, 108], [193, 105, 52], [239, 155, 73], [75, 77, 80]],
  [[74, 72, 91], [118, 101, 173], [177, 151, 241], [48, 48, 62]],
  [[74, 63, 105], [117, 93, 165], [157, 122, 237], [42, 38, 62]],
  [[55, 48, 66], [80, 67, 94], [111, 84, 128], [32, 30, 39]],
  [[92, 79, 58], [133, 108, 67], [185, 147, 76], [54, 51, 47]],
  [[119, 89, 47], [225, 166, 58], [255, 211, 91], [75, 58, 39]],
  [[86, 67, 42], [117, 87, 45], [151, 112, 52], [50, 45, 38]],
  [[166, 111, 38], [229, 168, 50], [255, 215, 84], [94, 65, 35]],
  [[91, 83, 68], [111, 100, 78], [138, 121, 83], [53, 51, 47]],
  [[183, 129, 43], [241, 183, 62], [255, 225, 127], [112, 82, 43]],
  [[76, 58, 44], [105, 77, 51], [136, 94, 56], [42, 39, 37]],
  [[169, 58, 24], [235, 104, 32], [255, 181, 55], [255, 226, 112]],
  [[77, 94, 103], [61, 75, 84], [105, 123, 130], [43, 55, 63]],
  [[52, 91, 98], [62, 214, 204], [134, 255, 239], [38, 54, 67]],
  [[92, 111, 120], [126, 149, 157], [179, 205, 211], [55, 70, 78]],
  [[75, 57, 94], [124, 91, 157], [181, 135, 224], [45, 40, 61]],
  [[114, 92, 54], [142, 116, 68], [178, 145, 78], [67, 59, 48]],
  [[178, 132, 47], [237, 190, 69], [255, 225, 125], [103, 76, 41]],
  [[67, 84, 89], [83, 106, 111], [113, 142, 146], [45, 56, 63]],
  [[177, 139, 53], [243, 204, 91], [255, 238, 152], [94, 76, 46]],
  [[98, 82, 54], [137, 112, 64], [184, 146, 73], [55, 51, 45]],
  [[175, 126, 35], [233, 178, 52], [255, 222, 105], [96, 69, 35]],
  [[89, 82, 70], [118, 108, 89], [150, 137, 107], [53, 53, 49]],
  [[151, 97, 31], [218, 153, 48], [248, 199, 83], [80, 62, 40]],
  [[126, 120, 99], [99, 94, 79], [155, 146, 116], [72, 69, 62]],
  [[129, 112, 62], [221, 187, 73], [255, 226, 116], [82, 70, 53]],
  [[117, 96, 54], [158, 129, 69], [211, 171, 83], [72, 61, 48]],
  [[104, 82, 48], [151, 119, 62], [192, 151, 72], [58, 52, 45]],
  [[159, 119, 42], [226, 180, 70], [255, 224, 119], [84, 65, 42]],
  [[72, 67, 62], [128, 102, 71], [186, 151, 92], [43, 42, 40]],
  [[76, 68, 61], [135, 105, 73], [196, 157, 91], [45, 42, 39]],
  [[73, 67, 65], [126, 95, 73], [168, 126, 86], [42, 41, 40]],
  [[118, 78, 44], [225, 151, 53], [255, 214, 91], [69, 48, 37]],
  [[77, 70, 64], [139, 108, 73], [205, 164, 96], [44, 42, 40]],
  [[75, 78, 80], [112, 119, 123], [166, 174, 177], [43, 46, 48]],
  [[98, 70, 48], [169, 112, 56], [226, 171, 73], [54, 43, 36]],
  [[113, 80, 43], [221, 153, 48], [255, 218, 86], [62, 46, 35]],
  [[92, 101, 92], [125, 138, 120], [166, 179, 156], [57, 67, 61]],
  [[81, 96, 88], [116, 135, 123], [159, 180, 163], [50, 62, 57]],
  [[73, 125, 96], [104, 164, 127], [151, 198, 165], [49, 89, 72]],
  [[78, 139, 111], [116, 180, 149], [171, 217, 192], [52, 96, 81]],
  [[92, 158, 137], [142, 203, 184], [193, 232, 218], [59, 111, 98]],
  [[105, 174, 161], [166, 220, 210], [218, 247, 241], [65, 119, 111]],
  [[78, 72, 72], [58, 53, 55], [101, 88, 84], [42, 39, 42]],
  [[119, 61, 40], [88, 43, 34], [158, 77, 43], [57, 37, 34]],
  [[83, 72, 71], [238, 92, 44], [255, 164, 70], [49, 44, 47]],
  [[107, 54, 43], [226, 84, 42], [255, 177, 75], [62, 41, 42]],
  [[92, 65, 54], [147, 73, 43], [204, 91, 42], [62, 47, 43]],
  [[105, 68, 49], [177, 82, 42], [229, 111, 45], [70, 48, 40]],
  [[116, 69, 43], [211, 91, 36], [247, 138, 50], [76, 45, 36]],
  [[128, 71, 40], [233, 105, 35], [255, 171, 70], [255, 221, 126]],
  [[132, 126, 121], [105, 101, 99], [158, 151, 144], [78, 76, 75]],
  [[70, 139, 60], [45, 105, 48], [103, 166, 72], [112, 79, 45]],
  [[45, 105, 85], [31, 78, 68], [79, 142, 111], [91, 72, 51]],
  [[126, 55, 43], [85, 40, 36], [194, 93, 54], [217, 171, 83]],
  [[181, 54, 24], [236, 101, 31], [255, 171, 54], [255, 226, 105]],
];

function pixelHash(tile, x, y) {
  let value = Math.imul(tile + 17, 374761393) ^ Math.imul(x + 31, 668265263) ^ Math.imul(y + 47, 1274126177);
  value = Math.imul(value ^ (value >>> 13), 2246822519);
  return (value ^ (value >>> 16)) >>> 0;
}

function chooseColor(tile, x, y) {
  const textilePalettes = [
    [[91, 111, 74], [111, 132, 88], [73, 91, 61], [145, 151, 105]],
    [[196, 157, 55], [224, 187, 74], [154, 116, 42], [244, 215, 120]],
    [[159, 57, 49], [193, 76, 60], [117, 42, 40], [225, 120, 75]],
    [[174, 210, 215], [211, 232, 232], [132, 174, 185], [240, 247, 242]],
    [[91, 65, 119], [120, 83, 151], [60, 45, 83], [103, 207, 188]],
  ];
  const mosaicPalette = [[91, 126, 132], [139, 91, 83], [190, 137, 105], [54, 67, 72]];
  const archivePalette = [[110, 73, 43], [184, 132, 68], [73, 142, 126], [190, 92, 63]];
  const stillPalette = [[68, 78, 78], [111, 136, 137], [76, 199, 180], [194, 230, 218]];
  const anvilPalette = [[55, 59, 61], [97, 104, 107], [224, 112, 49], [246, 181, 85]];
  const grindPalette = [[72, 77, 79], [124, 135, 136], [91, 70, 48], [112, 218, 200]];
  const stonewrightPalettes = {
    121: [[66, 71, 73], [126, 134, 135], [181, 188, 187], [92, 69, 45]],
    122: [[142, 148, 148], [163, 169, 168], [119, 125, 126], [188, 193, 191]],
    123: [[112, 119, 120], [143, 150, 150], [82, 89, 91], [174, 180, 178]],
    124: [[92, 82, 66], [121, 107, 84], [65, 60, 51], [145, 126, 94]],
  };
  const specializedFurnacePalettes = {
    125: [[48, 52, 54], [91, 99, 102], [199, 104, 48], [224, 157, 76]],
    126: [[74, 51, 37], [121, 79, 47], [42, 36, 32], [192, 126, 61]],
  };
  const wayvaultPalette = [[27, 39, 45], [49, 101, 99], [83, 191, 174], [183, 247, 224]];
  const panePalettes = {
    128: [[164, 207, 214], [204, 232, 235], [112, 174, 187], [235, 248, 246]],
    129: [[55, 61, 64], [104, 113, 116], [157, 166, 168], [205, 148, 68]],
  };
  const hearthcakePalette = [[190, 124, 54], [224, 165, 76], [239, 228, 187], [221, 166, 55]];
  const trailbarrelPalette = [[91, 58, 36], [148, 96, 51], [188, 135, 70], [92, 102, 104]];
  const resonancePalette = [[72, 48, 34], [134, 91, 55], [190, 142, 76], [83, 220, 202]];
  const waystarPalette = [[53, 63, 69], [136, 161, 163], [88, 218, 204], [220, 255, 248]];
  const hearthsongPalette = [[62, 40, 29], [126, 82, 48], [191, 139, 73], [72, 203, 188]];
  const funnelPalette = [[48, 53, 56], [91, 101, 105], [151, 162, 164], [205, 153, 69]];
  const ejectorPalette = [[43, 48, 51], [104, 115, 118], [174, 184, 184], [83, 220, 202]];
  const dispenserPalette = [[25, 34, 39], [77, 91, 99], [127, 150, 155], [105, 229, 213]];
  const sentryPalette = [[43, 49, 50], [101, 111, 111], [187, 160, 91], [91, 215, 199]];
  const bindingRamPalette = [[42, 54, 51], [80, 105, 96], [105, 204, 169], [213, 228, 108]];
  const inverterPalette = [[53, 48, 44], [111, 91, 67], [224, 164, 70], [101, 218, 198]];
  const comparatorPalette = [[48, 55, 54], [105, 116, 111], [88, 213, 197], [177, 132, 204]];
  const palette = textilePalettes[tile - 111] || (tile === 116 ? mosaicPalette : null) || (tile === 117 ? archivePalette : null) || (tile === 118 ? stillPalette : null) || (tile === 119 ? anvilPalette : null) || (tile === 120 ? grindPalette : null) || stonewrightPalettes[tile] || specializedFurnacePalettes[tile] || (tile === 127 ? wayvaultPalette : null) || panePalettes[tile] || (tile === 130 ? hearthcakePalette : null) || (tile === 131 ? trailbarrelPalette : null) || (tile === 132 ? resonancePalette : null) || (tile === 133 ? waystarPalette : null) || (tile === 134 ? hearthsongPalette : null) || (tile === 135 ? funnelPalette : null) || (tile === 136 ? ejectorPalette : null) || (tile === 137 ? dispenserPalette : null) || (tile === 138 ? sentryPalette : null) || (tile === 139 ? bindingRamPalette : null) || (tile === 140 ? inverterPalette : null) || (tile === 141 ? comparatorPalette : null) || palettes[tile] || palettes[3];
  const hash = pixelHash(tile, x, y);
  let index = hash % palette.length;
  if (tile === 1) {
    const grassDepth = 3 + ((x * 7 + 3) % 4);
    if (y < grassDepth) return palettes[0][hash % palettes[0].length];
    index = (hash >>> 3) % palettes[2].length;
    return palettes[2][index];
  }
  if (tile === 4 && x % 5 === 0) index = 3;
  if (tile === 5) {
    const dx = x - 7.5;
    const dy = y - 7.5;
    const ring = Math.floor(Math.sqrt(dx * dx + dy * dy) / 2);
    index = (ring + (hash % 2)) % palette.length;
  }
  if (tile === 6 && hash % 11 === 0) return [30, 77, 37];
  if (tile === 8 && (x + y) % 7 === 0) index = 2;
  if (tile === 9) index = hash % 5 < 2 ? 2 : hash % 2;
  if (tile === 125) {
    const frame = x < 2 || x > 13 || y < 2 || y > 13 || x === 4 || x === 11;
    const heatGate = y > 7 && x > 4 && x < 11;
    index = heatGate ? 2 + (hash % 2) : frame ? 1 : hash % 2 ? 0 : 1;
  }
  if (tile === 126) {
    const timberBand = x < 2 || x > 13 || y === 4 || y === 11;
    const smokeVent = y > 5 && y < 11 && x > 4 && x < 11;
    index = smokeVent ? 2 : timberBand ? 1 + (hash % 3 === 0 ? 2 : 0) : hash % 2;
  }
  if (tile === 127) {
    const rim = x < 2 || x > 13 || y < 2 || y > 13 || y === 6 || y === 7;
    const eye = (x - 7.5) ** 2 + (y - 9.5) ** 2 < 10;
    const slit = y === 9 && x > 4 && x < 11;
    index = eye || slit ? 2 + (hash % 2) : rim ? 1 : hash % 2;
  }
  if (tile === 128) {
    const edge = x < 2 || x > 13 || y < 2 || y > 13;
    const glint = x === y || x + y === 15 || (x === 7 && y > 3 && y < 12);
    index = edge ? 2 : glint ? 3 : hash % 2;
  }
  if (tile === 129) {
    const bars = x < 2 || x > 13 || y < 2 || y > 13 || x === 5 || x === 10 || y === 7 || y === 8;
    const rivet = ((x === 5 || x === 10) && (y === 3 || y === 12));
    index = rivet ? 3 : bars ? 1 + (hash % 2) : 0;
  }
  if (tile === 130) {
    const icing = y < 4 || (y < 7 && (x + y) % 5 === 0);
    const suncomb = y < 4 && (Math.abs(x - 3) < 2 || Math.abs(x - 8) < 2 || Math.abs(x - 13) < 2);
    index = suncomb ? 3 : icing ? 2 : hash % 2;
  }
  if (tile === 131) {
    const hoop = y < 2 || y > 13 || y === 5 || y === 10;
    const stave = x === 3 || x === 7 || x === 11;
    const latch = x > 5 && x < 10 && y > 6 && y < 10;
    index = latch ? 2 : hoop ? 3 : stave ? 0 : 1 + (hash % 2);
  }
  if (tile === 132) {
    const rings = x < 2 || x > 13 || y < 2 || y > 13 || x === 5 || x === 10 || y === 5 || y === 10;
    const core = (x - 7.5) ** 2 + (y - 7.5) ** 2 < 8;
    index = core ? 3 : rings ? 2 : hash % 2;
  }
  if (tile === 133) {
    const cage = x < 2 || x > 13 || y < 2 || y > 13 || x === 4 || x === 11;
    const star = Math.abs(x - 7.5) + Math.abs(y - 7.5) < 5 || x === 7 || x === 8 || y === 7 || y === 8;
    index = star ? 2 + (hash % 2) : cage ? 1 : 0;
  }
  if (tile === 134) {
    const frame = x < 2 || x > 13 || y < 2 || y > 13 || y === 5 || y === 11;
    const slot = y > 5 && y < 9 && x > 3 && x < 12;
    const rune = y > 10 && (x === 6 || x === 7 || x === 8 || x === 9);
    index = rune ? 3 : slot ? 0 : frame ? 2 : hash % 2;
  }
  if (tile === 135) {
    const rim = x < 2 || x > 13 || y < 2 || y > 13;
    const rivet = (x === 3 || x === 12) && (y === 3 || y === 12);
    index = rivet ? 3 : rim ? 2 : ((x + y + (hash % 3)) % 5 === 0 ? 1 : 0);
  }
  if (tile === 136) {
    const frame = x < 2 || x > 13 || y < 2 || y > 13 || x === 3 || x === 12;
    const mouth = x > 4 && x < 11 && y > 4 && y < 11;
    const core = x > 6 && x < 9 && y > 6 && y < 9;
    index = core ? 3 : mouth ? 0 : frame ? 2 : hash % 2;
  }
  if (tile === 137) {
    const ring = x < 2 || x > 13 || y < 2 || y > 13 || x === 4 || x === 11 || y === 4 || y === 11;
    const mouth = x > 4 && x < 11 && y > 4 && y < 11;
    const rune = mouth && (x === 7 || x === 8 || y === 7 || y === 8);
    index = rune ? 3 : mouth ? 0 : ring ? 2 : hash % 2;
  }
  if (tile === 138) {
    const frame = x < 2 || x > 13 || y < 2 || y > 13 || y === 4 || y === 11;
    const eye = y > 5 && y < 11 && ((x - 5) ** 2 + (y - 8) ** 2 < 5 || (x - 10) ** 2 + (y - 8) ** 2 < 5);
    const trace = y === 13 && x > 4 && x < 11;
    index = eye ? 2 : trace ? 3 : frame ? 1 : hash % 2;
  }
  if (tile === 139) {
    const frame = x < 2 || x > 13 || y < 2 || y > 13 || x === 4 || x === 11;
    const resin = (x - 7.5) ** 2 + (y - 7.5) ** 2 < 22;
    const grip = resin && (x === 6 || x === 9 || y === 6 || y === 9 || x + y === 15);
    index = grip ? 3 : resin ? 2 : frame ? 1 : hash % 2;
  }
  if (tile === 140) {
    const base = y < 3 || x < 2 || x > 13;
    const torch = Math.abs(x - 7.5) < 1.5 && y > 3 && y < 13;
    const flame = (x - 7.5) ** 2 + (y - 13) ** 2 < 9;
    const trace = y === 4 && x > 2 && x < 13;
    index = flame ? 2 : trace ? 3 : torch ? 1 : base ? 0 : hash % 2;
  }
  if (tile === 141) {
    const base = y < 3 || x < 2 || x > 13;
    const rearPins = y > 5 && y < 11 && ((x - 4) ** 2 + (y - 8) ** 2 < 4 || (x - 11) ** 2 + (y - 8) ** 2 < 4);
    const output = (x - 7.5) ** 2 + (y - 12) ** 2 < 6;
    const compareTrace = y === 4 && x > 2 && x < 13;
    const subtractRune = y === 7 && x > 5 && x < 10;
    index = output ? 2 : subtractRune ? 3 : compareTrace ? 2 : rearPins ? 1 : base ? 0 : hash % 2;
  }
  if (tile === 50 && (x === y || x + y === 15 || (x > 5 && x < 10 && y > 5 && y < 10))) index = 2;
  if (tile === 51 && ((x + y * 3) % 11 < 2 || (x > 4 && x < 11 && y > 5 && y < 12))) index = y > 5 ? 3 : 2;
  if ((tile === 52 || tile === 53) && (x === 7 || x === 8 || y === 7 || y === 8)) index = tile === 53 ? 2 : 1;
  if ((tile === 54 || tile === 55) && (Math.abs(x - 7.5) <= 1 || Math.abs(y - 7.5) <= 1)) index = tile === 55 ? 2 : 1;
  if ((tile === 56 || tile === 57) && (x === 0 || x === 15 || y === 0 || y === 15 || x % 5 === 0 || y % 5 === 0)) index = tile === 57 ? 2 : 3;
  if (tile === 58 && (x % 5 === 0 || y % 6 === 0)) index = 3;
  if (tile === 59) index = y > 9 || Math.abs(x - 7.5) < 2 + (y % 4) ? 2 + (hash % 2) : hash % 2;
  if (tile === 60 && (x % 8 === 0 || y % 5 === 0 || (y % 5 === 1 && x % 8 > 5))) index = 3;
  if (tile === 61) {
    const rune = Math.abs(x - 7.5) <= 1 || Math.abs(y - 7.5) <= 1 || x === y || x + y === 15;
    index = rune ? 1 + (hash % 2) : hash % 2 ? 0 : 3;
  }
  if (tile === 62) index = (x + y) % 5 < 2 ? 2 : hash % 2;
  if (tile === 63) {
    const ring = Math.abs((x - 7.5) ** 2 + (y - 7.5) ** 2 - 34) < 10;
    index = ring || x === y || x + y === 15 ? 2 : hash % 2 ? 0 : 3;
  }
  if ((tile === 64 || tile === 65) && (x < 2 || x > 13 || y < 2 || y > 13)) index = 3;
  if ((tile === 66 || tile === 67) && ((x - 7.5) ** 2 + (y - 7.5) ** 2 < 18)) index = tile === 67 ? 2 : 1;
  if ((tile === 68 || tile === 69) && (x === 3 || x === 12 || y === 7 || y === 8)) index = tile === 69 ? 2 : 1;
  if ((tile === 70 || tile === 71) && (x % 5 === 0 || y % 5 === 0 || (x > 5 && x < 10 && y > 5 && y < 10))) index = tile === 71 ? 2 : 3;
  if (tile === 72 && (x % 6 === 0 || y % 5 === 0 || (y % 5 === 1 && x % 6 > 3))) index = 3;
  if (tile === 73) {
    const sun = (x - 7.5) ** 2 + (y - 7.5) ** 2 < 18 || x === 7 || x === 8 || y === 7 || y === 8;
    index = sun ? 1 + (hash % 2) : hash % 2 ? 0 : 3;
  }
  if (tile === 74) {
    const chevron = Math.abs(y - (Math.abs(x - 7.5) + 3)) < 1.4 || Math.abs(y - (12 - Math.abs(x - 7.5))) < 1.2;
    index = chevron ? 2 : hash % 2 ? 0 : 3;
  }
  if ((tile === 75 || tile === 76) && (x % 4 === 0 || x % 4 === 1 || y < 2 || y > 13)) index = tile === 76 ? 2 : hash % 3;
  if ((tile === 77 || tile === 78) && (x === 2 || x === 7 || x === 12 || y === 7 || y === 8)) index = tile === 78 ? 2 : (x + y) % 2 ? 1 : 3;
  if (tile >= 80 && tile <= 84) {
    const railX = x < 3 || x > 12;
    const railY = y < 3 || y > 12;
    if (tile === 80) index = railX ? 2 : (y % 4 === 0 ? 1 : 3);
    if (tile === 81) index = Math.abs(x - y) < 2 || Math.abs(x + y - 15) < 2 ? 2 : 3;
    if (tile === 82 || tile === 83) index = railX ? (tile === 83 ? 2 : 1) : (y % 4 === 0 ? 0 : 3);
    if (tile === 84) index = railX || railY ? 2 : 3;
  }
  if (tile === 10 && (y % 5 === 0 || x === 0)) index = 3;
  if (tile === 11 && (x % 7 === 0 || y % 7 === 0)) index = 3;
  if (tile === 12 && (x === 2 || x === 13 || y === 2 || y === 13)) index = 3;
  if (tile === 13) index = hash % 6 < 2 ? 1 + (hash % 2) : hash % 2 ? 0 : 3;
  if (tile === 14 && hash % 13 === 0) index = 3;
  if (tile === 15) {
    if (y < 4 + ((x * 5) % 3)) return palettes[14][hash % palettes[14].length];
    return palettes[2][hash % palettes[2].length];
  }
  if (tile === 16 && (x % 5 === 0 || x % 7 === 0)) index = 3;
  if (tile === 17 && hash % 5 < 2) index = 1;
  if (tile === 18 && y > 5 && y < 13 && x > 3 && x < 12) index = 2;
  if (tile === 19 && (x + y) % 5 === 0) index = 3;
  if (tile === 100) index = hash % 7 < 2 ? 3 : hash % 5 < 2 ? 1 : hash % 3 === 0 ? 2 : 0;
  if (tile === 101) index = y < 4 ? 3 : hash % 5 === 0 ? 2 : hash % 2;
  if (tile === 102) index = y < 3 ? 3 : hash % 6 === 0 ? 2 : hash % 2;
  if (tile === 103) {
    const ironBand = y === 2 || y === 3 || y === 12 || y === 13;
    const warning = Math.abs(x - 7.5) + Math.abs(y - 7.5) < 4;
    index = ironBand ? 1 : warning ? 3 : hash % 5 === 0 ? 2 : 0;
  }
  if (tile === 104) index = y < 4 ? 3 : y < 9 ? 2 + (hash % 2) : hash % 3;
  if (tile === 107) {
    const seam = x === 0 || x === 15 || y === 0 || y === 15 || x === 7 || x === 8 || y === 7 || y === 8;
    index = seam ? 3 : hash % 7 === 0 ? 2 : hash % 2;
  }
  if (tile === 108) index = hash % 9 === 0 ? 2 : hash % 5 === 0 ? 1 : 0;
  if (tile === 109) {
    const mortar = y % 6 === 0 || (Math.floor(y / 6) % 2 === 0 ? x % 8 === 0 : (x + 4) % 8 === 0);
    index = mortar ? 3 : hash % 5 === 0 ? 2 : hash % 2;
  }
  if (tile >= 111 && tile <= 115) {
    const thread = (x + Math.floor(y / 2)) % 4 === 0 || (y + Math.floor(x / 3)) % 5 === 0;
    index = thread ? 2 + (hash % 2) : hash % 2;
  }
  if (tile === 116) {
    const ring = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
    const cross = Math.abs(x - 7.5) + Math.abs(y - 7.5) < 3.5;
    index = ring > 6.2 || (ring > 3.3 && ring < 4.5) ? 3 : cross ? 2 : (Math.floor(x / 3) + Math.floor(y / 3) + hash) % 2;
  }
  if (tile === 117) {
    const frame = x < 2 || x > 13 || y < 2 || y > 13 || y === 7 || y === 8;
    index = frame ? (hash % 2) : 2 + ((Math.floor(x / 2) + Math.floor(y / 3)) % 2);
  }
  if (tile === 118) {
    const frame = x < 2 || x > 13 || y < 2 || y > 13 || x === 7 || x === 8;
    const bubble = (x - 5) ** 2 + (y - 6) ** 2 < 5 || (x - 11) ** 2 + (y - 11) ** 2 < 4;
    index = frame ? hash % 2 : bubble ? 2 + (hash % 2) : hash % 3;
  }
  if (tile === 119) {
    const ironBand = y < 3 || y > 12 || x === 2 || x === 13;
    const heart = y > 4 && y < 12 && Math.abs(x - 7.5) < 4 - Math.abs(y - 8) * 0.7;
    index = ironBand ? hash % 2 : heart ? 2 + (hash % 2) : hash % 2;
  }
  if (tile === 120) {
    const dx = x - 7.5; const dy = y - 7.5; const radius = Math.sqrt(dx * dx + dy * dy);
    const rune = Math.abs(dx) < 1.1 || Math.abs(dy) < 1.1 || Math.abs(Math.abs(dx) - Math.abs(dy)) < 0.8;
    index = radius > 6.1 ? 2 : radius > 4.5 || radius < 1.8 ? hash % 2 : rune ? 3 : hash % 2;
  }
  if (tile === 121) {
    const blade = Math.abs(x - 7.5) < 2 || (y > 3 && y < 7 && Math.abs(x - 7.5) < 5);
    index = blade ? 2 : y > 11 ? 3 : hash % 2;
  }
  if (tile === 122) {
    const seam = x === 0 || x === 15 || y === 0 || y === 15 || x === 7 || x === 8 || y === 7 || y === 8;
    index = seam ? 2 : hash % 6 === 0 ? 3 : hash % 2;
  }
  if (tile === 123) {
    const ring = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
    const cross = Math.abs(x - 7.5) < 1.2 || Math.abs(y - 7.5) < 1.2;
    index = ring > 6.2 || (ring > 3.4 && ring < 4.5) ? 2 : cross ? 3 : hash % 2;
  }
  if (tile === 124) {
    const roots = Math.abs(x - 7.5) < 1.2 || y === 3 || y === 12 || Math.abs(x - y) < 1.1 || Math.abs(x + y - 15) < 1.1;
    index = roots ? 3 : hash % 7 === 0 ? 2 : hash % 2;
  }
  if (tile === 110) {
    const ring = Math.abs((x - 7.5) ** 2 + (y - 7.5) ** 2 - 30) < 8;
    const heart = y >= 5 && y <= 11 && Math.abs(x - 7.5) <= 4 - Math.abs(y - 8) * 0.55;
    index = ring || heart ? 2 + (hash % 2) : hash % 2;
  }
  if (tile >= 20 && tile <= 23 && hash % 7 === 0) index = 3;
  if (tile === 24 && (y === 6 || y === 7 || x === 1 || x === 14)) index = 3;
  if (tile === 25) index = y > 10 ? hash % 2 : 2 + (hash % 2);
  if (tile === 26 && (x === 1 || x === 14 || y === 1 || y === 14 || (x > 10 && y > 8 && y < 11))) index = 3;
  if (tile === 27) index = x === 0 || x === 15 || y === 0 || y === 15 || x === y ? 3 : hash % 9 === 0 ? 1 : 2;
  if (tile === 28) index = (x + y + (hash % 2)) % 4;
  if (tile === 29) index = y > 9 ? 1 + (hash % 2) : hash % 2 ? 0 : 3;
  if (tile === 30) index = y > 9 ? 1 + (hash % 2) : hash % 2 ? 0 : 3;
  if (tile === 31) index = y > 8 ? 1 + (hash % 2) : hash % 2 ? 0 : 3;
  if (tile === 32) index = (x % 6 === 0 || y % 6 === 0) ? 2 : hash % 4;
  if (tile === 33 && (x + y) % 5 === 0) index = 3;
  if (tile >= 34 && tile <= 37) index = y > 10 ? hash % 3 : hash % 5 === 0 ? 3 : hash % 3;
  if (tile === 38) index = ((x + Math.floor(y / 2)) % 7 === 0 || hash % 13 === 0) ? 2 : hash % 5 === 0 ? 3 : hash % 2;
  if (tile === 39) index = hash % 7 < 2 ? 2 + (hash % 2) : hash % 2;
  if (tile === 40) index = (x === 0 || x === 15 || y === 0 || y === 15 || hash % 9 === 0) ? hash % 2 : 2 + (hash % 2);
  if (tile === 41 && (x % 5 === 0 || x % 7 === 0)) index = 3;
  if (tile === 42 && hash % 9 === 0) index = 2;
  if (tile === 43) index = (x + y + hash) % 4;
  if (tile === 44) index = hash % 8 === 0 ? 3 : hash % 3;
  if (tile === 45) index = (x % 6 === 0 || y % 7 === 0 || hash % 11 === 0) ? 3 : hash % 3;
  if (tile === 46) index = y > 8 ? 1 + (hash % 2) : hash % 2 ? 0 : 3;
  if (tile === 47) index = y > 8 ? hash % 2 : 2 + (hash % 2);
  if (tile === 48 || tile === 49) index = hash % 7 < 2 ? 1 + (hash % 2) : hash % 2 ? 0 : 3;
  if (tile === 92 && (x % 7 === 0 || y % 6 === 0 || hash % 13 === 0)) index = 3;
  if (tile === 93 && ((x + y) % 7 < 2 || hash % 11 === 0)) index = 2 + (hash % 2);
  if (tile === 94) index = hash % 7 < 2 || x === y || x + y === 15 ? 1 + (hash % 2) : hash % 2 ? 0 : 3;
  if (tile === 95) {
    const ring = Math.abs((x - 7.5) ** 2 + (y - 7.5) ** 2 - 34) < 10;
    index = ring || x === 7 || x === 8 || y === 7 || y === 8 ? 1 + (hash % 2) : hash % 2 ? 0 : 3;
  }
  if (tile >= 96 && tile <= 99) {
    const stage = tile - 96;
    const emberVein = (x + y * 2 + stage) % Math.max(3, 7 - stage) === 0;
    if (emberVein) index = stage >= 2 ? 2 + (hash % 2) : 1 + (hash % 2);
  }
  return palette[index];
}

function plantAlpha(tile, x, y) {
  if (tile >= 20 && tile <= 23) {
    const blade = Math.abs(x - 7.5) <= 1 || Math.abs(x - (3 + Math.floor(y * 0.28))) <= 1 || Math.abs(x - (12 - Math.floor(y * 0.25))) <= 1;
    return blade && y <= 14;
  }
  if (tile === 25) return (x >= 7 && x <= 8 && y <= 12) || (y >= 11 && Math.abs(x - 7.5) <= 2);
  if (tile === 28) {
    return (Math.abs(x - 7.5) <= 1 && y < 15)
      || (Math.abs(x - (3 + Math.floor(y * 0.3))) <= 1 && y < 13)
      || (Math.abs(x - (12 - Math.floor(y * 0.28))) <= 1 && y < 14);
  }
  if (tile === 29 || tile === 30) {
    const stem = x >= 7 && x <= 8 && y <= 11;
    const bloom = (x - 7.5) ** 2 + (y - 11.5) ** 2 <= 14;
    return stem || bloom;
  }
  if (tile === 31) {
    const stem = x >= 7 && x <= 8 && y >= 2 && y <= 9;
    const cap = y >= 8 && y <= 12 && Math.abs(x - 7.5) <= 5 - Math.abs(y - 10);
    return stem || cap;
  }
  if (tile >= 34 && tile <= 37) {
    const stage = tile - 34;
    const height = 7 + stage * 2;
    const stem = Math.abs(x - 7.5) <= 1 && y <= height;
    const leftLeaf = y >= 3 && y <= height && Math.abs(x - (7 - Math.floor(y * 0.45))) <= 1;
    const rightLeaf = y >= 4 && y <= height && Math.abs(x - (8 + Math.floor(y * 0.4))) <= 1;
    const root = stage === 3 && y >= 10 && ((x - 7.5) ** 2 + (y - 12) ** 2 <= 12);
    return stem || leftLeaf || rightLeaf || root;
  }
  if (tile >= 88 && tile <= 91) {
    const stage = tile - 88;
    const height = 6 + stage * 2;
    const stem = Math.abs(x - 7.5) <= 1 && y <= height;
    const leftLeaf = y >= 3 && y <= height && Math.abs(x - (6 - Math.floor(y * 0.28))) <= 1;
    const rightLeaf = y >= 4 && y <= height && Math.abs(x - (9 + Math.floor(y * 0.26))) <= 1;
    const pods = stage >= 2 && y >= 7 && y <= 13 && (Math.abs(x - 4) <= 2 || Math.abs(x - 11) <= 2);
    return stem || leftLeaf || rightLeaf || pods;
  }
  if (tile >= 96 && tile <= 99) {
    const stage = tile - 96;
    const height = 6 + stage * 2;
    const stem = Math.abs(x - 7.5) <= 1 && y <= height;
    const fork = y >= 3 && y <= height && (Math.abs(x - (5 - Math.floor(y * 0.18))) <= 1 || Math.abs(x - (10 + Math.floor(y * 0.16))) <= 1);
    const bulb = stage >= 1 && y >= 8 && ((x - 7.5) ** 2 + (y - (10 + stage)) ** 2 <= 7 + stage * 3);
    return stem || fork || bulb;
  }
  if (tile === 101) {
    const stem = Math.abs(x - 7.5) <= 1 && y <= 12;
    const left = y >= 4 && y <= 12 && Math.abs(x - (7 - Math.floor(y * 0.42))) <= 1;
    const right = y >= 5 && y <= 13 && Math.abs(x - (8 + Math.floor(y * 0.38))) <= 1;
    return stem || left || right;
  }
  if (tile === 102) {
    const trunk = Math.abs(x - 7.5) <= 1 && y <= 14;
    const tier = (y >= 3 && y <= 5 && Math.abs(x - 7.5) <= 5)
      || (y >= 7 && y <= 9 && Math.abs(x - 7.5) <= 4)
      || (y >= 11 && y <= 13 && Math.abs(x - 7.5) <= 2);
    return trunk || tier;
  }
  if (tile === 104) {
    const leftFlame = y <= 14 && Math.abs(x - (5 + Math.sin(y * 0.7) * 1.8)) <= Math.max(1, 3 - y * 0.12);
    const rightFlame = y <= 12 && Math.abs(x - (10 + Math.cos(y * 0.8) * 1.5)) <= Math.max(1, 2.7 - y * 0.11);
    const core = y <= 9 && Math.abs(x - 7.5) <= Math.max(1, 4 - y * 0.28);
    return leftFlame || rightFlame || core;
  }
  if (tile === 43) {
    const bladeA = Math.abs(x - (4 + Math.floor(y * 0.22))) <= 1;
    const bladeB = Math.abs(x - (11 - Math.floor(y * 0.2))) <= 1;
    const center = Math.abs(x - 7.5) <= 1;
    return y <= 13 && (bladeA || bladeB || center);
  }
  if (tile === 44) {
    const wave = 7.5 + Math.sin(y * 0.75) * 2.2;
    const stem = Math.abs(x - wave) <= 1.4;
    const frond = y > 5 && y % 4 <= 1 && Math.abs(x - wave) <= 4;
    return y <= 15 && (stem || frond);
  }
  if (tile === 46) {
    const stem = Math.abs(x - 7.5) <= 1 && y <= 9;
    const bloom = y >= 7 && ((x - 7.5) ** 2 + (y - 10) ** 2 <= 20);
    return stem || bloom;
  }
  if (tile === 47) {
    const stem = Math.abs(x - 7.5) <= 1 && y >= 2 && y <= 9;
    const cap = y >= 7 && y <= 12 && Math.abs(x - 7.5) <= 5 - Math.abs(y - 10);
    return stem || cap;
  }
  return true;
}

export function createBlockAtlas() {
  const width = TILE_SIZE * ATLAS_COLUMNS;
  const height = TILE_SIZE * ATLAS_ROWS;
  const data = new Uint8Array(width * height * 4);
  for (let tile = 0; tile < ATLAS_COLUMNS * ATLAS_ROWS; tile += 1) {
    const tileX = tile % ATLAS_COLUMNS;
    const tileY = Math.floor(tile / ATLAS_COLUMNS);
    for (let y = 0; y < TILE_SIZE; y += 1) {
      for (let x = 0; x < TILE_SIZE; x += 1) {
        const [r, g, b] = chooseColor(tile, x, y);
        const px = tileX * TILE_SIZE + x;
        const py = tileY * TILE_SIZE + y;
        const offset = (py * width + px) * 4;
        data[offset] = r;
        data[offset + 1] = g;
        data[offset + 2] = b;
        data[offset + 3] = plantAlpha(tile, x, y) ? 255 : 0;
      }
    }
  }
  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function tileUVs(tile) {
  const column = tile % ATLAS_COLUMNS;
  const row = Math.floor(tile / ATLAS_COLUMNS);
  const inset = 0.01 / TILE_SIZE;
  const u0 = column / ATLAS_COLUMNS + inset;
  const u1 = (column + 1) / ATLAS_COLUMNS - inset;
  const v0 = row / ATLAS_ROWS + inset;
  const v1 = (row + 1) / ATLAS_ROWS - inset;
  return [[u0, v0], [u0, v1], [u1, v1], [u1, v0]];
}
