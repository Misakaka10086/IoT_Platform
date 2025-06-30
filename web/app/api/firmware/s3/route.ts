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

  const s3Client = new S3Client({
    endpoint: B2_ENDPOINT_URL,
    region: "auto", // Cloudflare R2 uses 'auto'
    credentials: {
      accessKeyId: B2_ACCESS_KEY_ID,
      secretAccessKey: B2_SECRET_ACCESS_KEY,
    },
  });

  try {
    const listObjectsCommand = new ListObjectsV2Command({
      Bucket: B2_BUCKET_NAME,
      Prefix: "firmware/",
    });

    const listedObjects = await s3Client.send(listObjectsCommand);

    if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
      return NextResponse.json({ firmwareData: [] });
    }

    const firmwareDetailsPromises = listedObjects.Contents.filter(
      // Filter out "directories" or objects not ending with .bin if necessary
      (obj) => obj.Key && !obj.Key.endsWith("/") && obj.Key.endsWith(".bin")
    ).map(async (obj) => {
      if (!obj.Key) return null;

      const headObjectCommand = new HeadObjectCommand({
        Bucket: B2_BUCKET_NAME,
        Key: obj.Key,
      });
      const objectMetadata = await s3Client.send(headObjectCommand);

      const board = getBoardFromKey(obj.Key);
      const version = getVersionFromKey(obj.Key);

      if (!board || !version) {
        console.warn(`Could not parse board or version from key: ${obj.Key}`);
        return null;
      }

      // S3 metadata keys are lowercased and prefixed with x-amz-meta-
      const gitCommitSha = objectMetadata.Metadata?.["git-commit-sha"];
      const sha256 = objectMetadata.Metadata?.["sha256"];

      if (!gitCommitSha || !sha256) {
        console.warn(`Missing metadata for ${obj.Key}: git-commit-sha: ${gitCommitSha}, sha256: ${sha256}`);
        return null;
      }

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

    // Sort by lastModified date, newest first
    resolvedFirmwareDetails.sort((a, b) => {
        if (a.lastModified && b.lastModified) {
            return b.lastModified.getTime() - a.lastModified.getTime();
        }
        if (a.lastModified) return -1; // a comes first if b has no date
        if (b.lastModified) return 1;  // b comes first if a has no date
        return 0;
    });


    return NextResponse.json({ firmwareData: resolvedFirmwareDetails });
  } catch (error) {
    console.error("Error fetching firmware from S3:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { error: "Failed to fetch firmware data from S3.", details: errorMessage },
      { status: 500 }
    );
  }
}
