// app/api/devices/[deviceId]/firmware-versions/route.ts

import { NextRequest, NextResponse } from 'next/server';
import pool, { withRetry } from '../../../../../lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> } // <--- 修复：将 params 类型修正为 Promise
) {
  try {
    const { deviceId } = await params; // <--- 修复：添加 await

    if (!deviceId) {
      return NextResponse.json({ error: 'Device ID is required' }, { status: 400 });
    }

    const firmwareVersions = await withRetry(async () => {
      const result = await pool.query(
        'SELECT id, version, created_at FROM git_version WHERE device_id = $1 ORDER BY created_at DESC',
        [deviceId]
      );
      return result.rows;
    }, 3, `Get firmware versions for device: ${deviceId}`);

    return NextResponse.json({ firmwareVersions });
  } catch (error) {
    console.error('Error fetching firmware versions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch firmware versions' },
      { status: 500 }
    );
  }
}