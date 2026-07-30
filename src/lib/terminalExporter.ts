import type { ExportedPoint } from '../types'

const CHARSET = ' .:-=+*#%@'

const RENDERER_TEMPLATE = `
const CHARS = ${JSON.stringify(CHARSET.split(''))};
const POINTS = %POINTS%;

function rotateX(p, angle) {
  const c = Math.cos(angle), s = Math.sin(angle);
  return {
    x: p.x, y: p.y * c - p.z * s, z: p.y * s + p.z * c,
    nx: p.nx, ny: p.ny * c - p.nz * s, nz: p.ny * s + p.nz * c
  };
}
function rotateY(p, angle) {
  const c = Math.cos(angle), s = Math.sin(angle);
  return {
    x: p.x * c + p.z * s, y: p.y, z: -p.x * s + p.z * c,
    nx: p.nx * c + p.nz * s, ny: p.ny, nz: -p.nx * s + p.nz * c
  };
}

function renderFrame(angleX, angleY) {
  const W = %ASCII_W%, H = Math.round(W * 0.4);
  const zbuf = new Float32Array(W * H).fill(Infinity);
  const buf = new Array(H).fill().map(function() { return new Array(W).fill(' '); });
  const light = { x: 0.5, y: 0.5, z: 1 };
  const lightLen = Math.sqrt(light.x*light.x + light.y*light.y + light.z*light.z);

  for (var i = 0; i < POINTS.length; i++) {
    var p = POINTS[i];
    var r = rotateX(p, angleX);
    r = rotateY(r, angleY);
    var shade = (r.nx * light.x + r.ny * light.y + r.nz * light.z) / lightLen;
    if (shade < 0) continue;
    if (p.l !== undefined) shade *= p.l;

    var dist = 3;
    var px = Math.round((r.x / (r.z + dist)) * W / 2 + W / 2);
    var py = Math.round((-r.y / (r.z + dist)) * H / 2 + H / 2);

    if (px < 0 || px >= W || py < 0 || py >= H) continue;

    var zVal = r.z;
    var idx = py * W + px;
    if (zVal >= zbuf[idx]) continue;
    zbuf[idx] = zVal;
    buf[py][px] = CHARS[Math.floor(shade * (CHARS.length - 1))];
  }

  return buf.map(function(row) { return row.join(''); }).join('\\n');
}

var ASCII_H = Math.round(%ASCII_W% * 0.4);
var angleX = 0, angleY = 0;
var fps = 30;
var interval = 1000 / fps;

// Save cursor position and print initial frame
process.stdout.write('\\033[s');
var first = renderFrame(angleX, angleY);
process.stdout.write(first + '\\n');

var lastTime = Date.now();
function frame() {
  var now = Date.now();
  var dt = now - lastTime;
  if (dt >= interval) {
    lastTime = now;
    angleY += 0.04;
    angleX += 0.01;
    var ascii = renderFrame(angleX, angleY);
    process.stdout.write('\\033[' + (ASCII_H + 1) + 'A');
    process.stdout.write(ascii + '\\n');
  }
  if (process.stdin.isTTY) {
    setTimeout(frame, 1);
  }
}

process.on('SIGINT', function() {
  process.stdout.write('\\033[0m\\n');
  process.exit(0);
});

frame();
`

export function generateTerminalScript(
  points: ExportedPoint[],
  asciiWidth: number
): string {
  const ptsJson = JSON.stringify(points)
  return RENDERER_TEMPLATE
    .replace('%POINTS%', ptsJson)
    .replace(/%ASCII_W%/g, String(asciiWidth))
}
