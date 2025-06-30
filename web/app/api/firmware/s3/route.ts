import { NextResponse } from "next/server";
import {
  S3Client,
  ListObjectsV2Command,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";

export interface FirmwareS3Info {
  s3Key: string;
  board: string;
  sha256: string;
  gitCommitSha: string;
  lastModified: Date | undefined;
  version: string; // Extracted version from path, e.g. firmware.bin or firmware_v1.2.3.bin
}

// Helper function to extract board name from S3 key
// e.g., firmware/esp32-c3-devkitm-1/firmware.bin -> esp32-c3-devkitm-1
const getBoardFromKey = (key: string): string | null => {
  const parts = key.split("/");
  if (parts.length >= 3 && parts[0] === "firmware") {
    return parts[1];
  }
  return null;
};

// Helper function to extract firmware version from S3 key
// e.g., firmware/esp32-c3-devkitm-1/firmware.bin -> firmware.bin
// e.g., firmware/esp32-c3-devkitm-1/firmware_v1.0.0.bin -> firmware_v1.0.0.bin
const getVersionFromKey = (key: string): string | null => {
  const parts = key.split("/");
  if (parts.length >= 3) {
    return parts[parts.length -1]; // last part is the filename
  }
  return null;
}

export async function GET() {
  const {
    B2_ACCESS_KEY_ID,
    B2_SECRET_ACCESS_KEY,
    B2_BUCKET_NAME,
    B2_ENDPOINT_URL,
  } = process.env;

  if (
    !B2_ACCESS_KEY_ID ||
    !B2_SECRET_ACCESS_KEY ||
    !B2_BUCKET_NAME ||
    !B2_ENDPOINT_URL
  ) {
    return NextResponse.json(
      { error: "S3 configuration is missing in environment variables." },
      { status: 500 }
    );
  }

  console.log(`[FIRMWARE_S3_API] Initializing S3 client with endpoint: ${B2_ENDPOINT_URL} and bucket: ${B2_BUCKET_NAME}`);

  const s3Client = new S3Client({
    endpoint: B2_ENDPOINT_URL,
    region: "auto", // Cloudflare R2 uses 'auto'
    credentials: {
      accessKeyId: B2_ACCESS_KEY_ID,
      secretAccessKey: B2_SECRET_ACCESS_KEY,
    },
    // Consider adding requestTimeout for more granular control if needed, though SDK defaults are usually generous.
    // requestHandler: new NodeHttpHandler({ requestTimeout: 5000, connectionTimeout: 5000 }), // Example for more control
  });

  try {
    console.log("[FIRMWARE_S3_API] Attempting to list objects with prefix 'firmware/'");
    const listObjectsCommand = new ListObjectsV2Command({
      Bucket: B2_BUCKET_NAME,
      Prefix: "firmware/",
    });

    const listedObjects = await s3Client.send(listObjectsCommand);
    console.log(`[FIRMWARE_S3_API] Successfully listed objects. Count: ${listedObjects.Contents?.length || 0}`);

    if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
      console.log("[FIRMWARE_S3_API] No objects found under 'firmware/' prefix.");
      return NextResponse.json({ firmwareData: [] });
    }

    const firmwareDetailsPromises = listedObjects.Contents.filter(
      // Filter out "directories" or objects not ending with .bin if necessary
      (obj) => obj.Key && !obj.Key.endsWith("/") && obj.Key.endsWith(".bin")
    ).map(async (obj) => {
      if (!obj.Key) return null;

      console.log(`[FIRMWARE_S3_API] Processing object: ${obj.Key}`);
      const headObjectCommand = new HeadObjectCommand({
        Bucket: B2_BUCKET_NAME,
        Key: obj.Key,
      });

      let objectMetadata;
      try {
        objectMetadata = await s3Client.send(headObjectCommand);
        console.log(`[FIRMWARE_S3_API] Successfully fetched metadata for: ${obj.Key}`);
      } catch (headError: any) {
        console.error(`[FIRMWARE_S3_API] Error fetching metadata for ${obj.Key}:`, headError.message || headError);
        return null; // Skip this object if metadata fetch fails
      }

      const board = getBoardFromKey(obj.Key);
      const version = getVersionFromKey(obj.Key);

      if (!board || !version) {
        console.warn(`[FIRMWARE_S3_API] Could not parse board or version from key: ${obj.Key}`);
        return null;
      }

      // S3 metadata keys are lowercased and prefixed with x-amz-meta-
      const gitCommitSha = objectMetadata.Metadata?.["git-commit-sha"];
      const sha256 = objectMetadata.Metadata?.["sha256"];

      if (!gitCommitSha || !sha256) {
        console.warn(`[FIRMWARE_S3_API] Missing metadata for ${obj.Key}: git-commit-sha: ${gitCommitSha}, sha256: ${sha256}`);
        return null;
      }

      console.log(`[FIRMWARE_S3_API] Successfully processed metadata for ${obj.Key}: Board='${board}', Version='${version}', GitCommitSHA='${gitCommitSha}', SHA256='${sha256.substring(0,10)}...'`);
      return {
        s3Key: obj.Key,
        board,
        version,
        sha256,
        gitCommitSha,
        lastModified: obj.LastModified,
      } as FirmwareS3Info;
    });

    const resolvedFirmwareDetails = (
      await Promise.all(firmwareDetailsPromises)
    ).filter((detail): detail is FirmwareS3Info => detail !== null);

    console.log(`[FIRMWARE_S3_API] Successfully processed ${resolvedFirmwareDetails.length} firmware objects with metadata.`);

    // Sort by lastModified date, newest first
    resolvedFirmwareDetails.sort((a, b) => {
        if (a.lastModified && b.lastModified) {
            return b.lastModified.getTime() - a.lastModified.getTime();
        }
        if (a.lastModified) return -1; // a comes first if b has no date
        if (b.lastModified) return 1;  // b comes first if a has no date
        return 0;
    });

    console.log("[FIRMWARE_S3_API] Firmware data processing complete. Returning response.");
    return NextResponse.json({ firmwareData: resolvedFirmwareDetails });
  } catch (error: any) {
    console.error("[FIRMWARE_S3_API] Error fetching firmware from S3:", error.message || error);
    if (error.code) { // AWS SDK errors often have a code
        console.error(`[FIRMWARE_S3_API] AWS SDK Error Code: ${error.code}`);
    }
    if (error.$metadata) {
        console.error(`[FIRMWARE_S3_API] AWS SDK Metadata (e.g. requestId): ${JSON.stringify(error.$metadata)}`);
    }
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { error: "Failed to fetch firmware data from S3.", details: errorMessage },
      { status: 500 }
    );
  }
}
