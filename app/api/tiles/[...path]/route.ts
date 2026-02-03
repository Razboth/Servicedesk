import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// Cache control headers for tiles
const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=31536000, immutable',
  'Content-Type': 'image/png',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const pathSegments = (await params).path;

  // Expect format: /api/tiles/{z}/{x}/{y}
  if (pathSegments.length !== 3) {
    return NextResponse.json({ error: 'Invalid tile path' }, { status: 400 });
  }

  const [z, x, yWithExt] = pathSegments;
  const y = yWithExt.replace('.png', '');

  // Validate zoom level bounds (7-14 for offline, fallback for higher)
  const zoom = parseInt(z);
  const maxOfflineZoom = 14;

  // Build the local tile path
  const tilePath = path.join(process.cwd(), 'public', 'tiles', z, x, `${y}.png`);

  // Check if tile exists locally
  if (existsSync(tilePath)) {
    try {
      const tileData = await readFile(tilePath);
      return new NextResponse(tileData, { headers: CACHE_HEADERS });
    } catch {
      // Fall through to online fallback
    }
  }

  // Fallback to online OSM tiles for missing tiles (e.g., zoom > 14)
  if (zoom > maxOfflineZoom) {
    const osmUrl = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
    try {
      const response = await fetch(osmUrl, {
        headers: {
          'User-Agent': 'ServiceDesk-Monitoring/1.0',
        },
      });

      if (response.ok) {
        const tileData = await response.arrayBuffer();
        return new NextResponse(tileData, {
          headers: {
            ...CACHE_HEADERS,
            'X-Tile-Source': 'online-fallback',
          },
        });
      }
    } catch {
      // Return transparent tile on error
    }
  }

  // Return a transparent 256x256 PNG as fallback
  // This is a minimal valid PNG (transparent 1x1, will be stretched)
  const transparentPng = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x00,
    0x01, 0x03, 0x00, 0x00, 0x00, 0x66, 0xbc, 0x3a, 0x25, 0x00, 0x00, 0x00,
    0x03, 0x50, 0x4c, 0x54, 0x45, 0x00, 0x00, 0x00, 0xa7, 0x7a, 0x3d, 0xda,
    0x00, 0x00, 0x00, 0x01, 0x74, 0x52, 0x4e, 0x53, 0x00, 0x40, 0xe6, 0xd8,
    0x66, 0x00, 0x00, 0x00, 0x1f, 0x49, 0x44, 0x41, 0x54, 0x68, 0xde, 0xed,
    0xc1, 0x01, 0x0d, 0x00, 0x00, 0x00, 0xc2, 0xa0, 0xf7, 0x4f, 0x6d, 0x0e,
    0x37, 0xa0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xbe, 0x0d,
    0x21, 0x00, 0x00, 0x01, 0x9a, 0x60, 0xe1, 0xd5, 0x00, 0x00, 0x00, 0x00,
    0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
  ]);

  return new NextResponse(transparentPng, {
    headers: {
      ...CACHE_HEADERS,
      'X-Tile-Source': 'transparent-fallback',
    },
  });
}
