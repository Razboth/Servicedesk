/**
 * Script to download OpenStreetMap tiles for offline use
 *
 * Run with: npx tsx scripts/download-tiles.ts
 *
 * Downloads tiles for North Sulawesi region (zoom levels 7-14)
 * Estimated size: ~2 GB
 */

import { mkdir, writeFile, access } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// Configuration
const CONFIG = {
  minZoom: 7,
  maxZoom: 12,
  // Indonesia bounding box
  bounds: {
    north: 6.0,
    south: -11.0,
    east: 141.0,
    west: 95.0,
  },
  outputDir: './public/tiles',
  tileServers: [
    'https://a.tile.openstreetmap.org',
    'https://b.tile.openstreetmap.org',
    'https://c.tile.openstreetmap.org',
  ],
  concurrency: 10,
  retryAttempts: 3,
  delayBetweenRequests: 100, // ms
};

// Convert lat/lng to tile coordinates
function latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
  return { x, y };
}

// Get all tile coordinates for a bounding box at a given zoom
function getTilesInBounds(
  north: number,
  south: number,
  east: number,
  west: number,
  zoom: number
): Array<{ x: number; y: number; z: number }> {
  const nw = latLngToTile(north, west, zoom);
  const se = latLngToTile(south, east, zoom);

  const tiles: Array<{ x: number; y: number; z: number }> = [];
  for (let x = nw.x; x <= se.x; x++) {
    for (let y = nw.y; y <= se.y; y++) {
      tiles.push({ x, y, z: zoom });
    }
  }
  return tiles;
}

// Sleep helper
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Download a single tile with retry
async function downloadTile(
  x: number,
  y: number,
  z: number,
  serverIndex: number = 0,
  attempt: number = 1
): Promise<boolean> {
  const server = CONFIG.tileServers[serverIndex % CONFIG.tileServers.length];
  const url = `${server}/${z}/${x}/${y}.png`;
  const outputPath = path.join(CONFIG.outputDir, String(z), String(x), `${y}.png`);

  // Check if tile already exists
  if (existsSync(outputPath)) {
    return true;
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ServiceDesk-Monitoring/1.0 (tile-download-script)',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    // Create directory structure
    const dir = path.dirname(outputPath);
    await mkdir(dir, { recursive: true });

    // Write tile
    await writeFile(outputPath, buffer);
    return true;
  } catch (error) {
    if (attempt < CONFIG.retryAttempts) {
      await sleep(1000 * attempt);
      return downloadTile(x, y, z, serverIndex + 1, attempt + 1);
    }
    console.error(`Failed to download tile ${z}/${x}/${y}: ${error}`);
    return false;
  }
}

// Process tiles with concurrency limit
async function processTilesWithConcurrency(
  tiles: Array<{ x: number; y: number; z: number }>,
  onProgress: (completed: number, total: number) => void
): Promise<{ success: number; failed: number }> {
  let completed = 0;
  let success = 0;
  let failed = 0;
  let index = 0;

  const worker = async (workerId: number) => {
    while (index < tiles.length) {
      const currentIndex = index++;
      const tile = tiles[currentIndex];

      const result = await downloadTile(tile.x, tile.y, tile.z, workerId);
      if (result) {
        success++;
      } else {
        failed++;
      }

      completed++;
      onProgress(completed, tiles.length);

      await sleep(CONFIG.delayBetweenRequests);
    }
  };

  // Start workers
  const workers = Array.from({ length: CONFIG.concurrency }, (_, i) => worker(i));
  await Promise.all(workers);

  return { success, failed };
}

// Main function
async function main() {
  console.log('=== OpenStreetMap Tile Downloader ===\n');
  console.log('Configuration:');
  console.log(`  Zoom levels: ${CONFIG.minZoom} - ${CONFIG.maxZoom}`);
  console.log(`  Bounds: N${CONFIG.bounds.north}, S${CONFIG.bounds.south}, E${CONFIG.bounds.east}, W${CONFIG.bounds.west}`);
  console.log(`  Output: ${CONFIG.outputDir}`);
  console.log(`  Concurrency: ${CONFIG.concurrency}\n`);

  // Calculate total tiles
  let allTiles: Array<{ x: number; y: number; z: number }> = [];

  console.log('Calculating tiles per zoom level:');
  for (let z = CONFIG.minZoom; z <= CONFIG.maxZoom; z++) {
    const tiles = getTilesInBounds(
      CONFIG.bounds.north,
      CONFIG.bounds.south,
      CONFIG.bounds.east,
      CONFIG.bounds.west,
      z
    );
    console.log(`  Zoom ${z}: ${tiles.length} tiles`);
    allTiles = allTiles.concat(tiles);
  }

  console.log(`\nTotal tiles to download: ${allTiles.length}`);
  console.log(`Estimated size: ~${Math.round(allTiles.length * 30 / 1024)} MB\n`);

  // Create output directory
  await mkdir(CONFIG.outputDir, { recursive: true });

  // Start download
  console.log('Starting download...\n');
  const startTime = Date.now();

  const { success, failed } = await processTilesWithConcurrency(allTiles, (completed, total) => {
    const percent = Math.round((completed / total) * 100);
    const elapsed = (Date.now() - startTime) / 1000;
    const rate = completed / elapsed;
    const remaining = (total - completed) / rate;

    process.stdout.write(
      `\rProgress: ${completed}/${total} (${percent}%) | ` +
      `Rate: ${rate.toFixed(1)} tiles/s | ` +
      `ETA: ${Math.round(remaining / 60)}m ${Math.round(remaining % 60)}s   `
    );
  });

  const totalTime = (Date.now() - startTime) / 1000;

  console.log('\n\n=== Download Complete ===');
  console.log(`Success: ${success} tiles`);
  console.log(`Failed: ${failed} tiles`);
  console.log(`Total time: ${Math.round(totalTime / 60)}m ${Math.round(totalTime % 60)}s`);
}

main().catch(console.error);
