import { Buffer } from 'node:buffer'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const source = path.join(root, 'logo.png')
const outDir = path.join(root, 'public')

const ROUNDED_RADIUS_RATIO = 0.14

const roundedTargets = [
  { file: 'pwa-192.png', size: 192 },
  { file: 'pwa-512.png', size: 512 },
  { file: 'favicon-16.png', size: 16 },
  { file: 'favicon-32.png', size: 32 },
  { file: 'apple-touch-icon.png', size: 180 },
]

function roundedRectMask(size, radius) {
  return Buffer.from(`
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="white"/>
</svg>`.trim())
}

async function generateRounded({ file, size }) {
  const radius = Math.max(1, Math.round(size * ROUNDED_RADIUS_RATIO))
  const mask = roundedRectMask(size, radius)

  await sharp(source)
    .resize(size, size, { fit: 'cover', position: 'center' })
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toFile(path.join(outDir, file))
}

async function generateMaskable() {
  await sharp(source)
    .resize(512, 512, { fit: 'cover', position: 'center' })
    .png()
    .toFile(path.join(outDir, 'maskable-512.png'))
}

async function generateFaviconIco() {
  await sharp(source)
    .resize(32, 32, { fit: 'cover', position: 'center' })
    .composite([{ input: roundedRectMask(32, Math.max(1, Math.round(32 * ROUNDED_RADIUS_RATIO))), blend: 'dest-in' }])
    .png()
    .toFile(path.join(outDir, 'favicon.ico'))
}

async function main() {
  await mkdir(outDir, { recursive: true })
  await Promise.all([
    ...roundedTargets.map(target => generateRounded(target)),
    generateMaskable(),
    generateFaviconIco(),
  ])
  console.log('icons generated in', outDir)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
