import "server-only";

import { randomBytes } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const imageTypes = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
} as const;

function uploadRoot() {
  return path.join(process.cwd(), "storage", "uploads");
}

function detectImageType(buffer: Buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg" as const;
  }
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png" as const;
  }
  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") {
    return "image/webp" as const;
  }
  return null;
}

export async function storeImage(file: File) {
  if (!file.size || file.size > MAX_IMAGE_SIZE) {
    throw new Error("图片大小必须在 5MB 以内。");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = detectImageType(buffer);
  if (!mimeType || !(mimeType in imageTypes)) {
    throw new Error("仅支持 JPG、PNG 或 WebP 图片。");
  }

  const id = randomBytes(15).toString("hex");
  const storageKey = `${id}.${imageTypes[mimeType]}`;
  const root = uploadRoot();
  await mkdir(root, { recursive: true });
  await writeFile(path.join(root, storageKey), buffer, { flag: "wx" });

  return {
    id,
    storageKey,
    mimeType,
    sizeBytes: BigInt(buffer.length),
    publicUrl: `/api/media/${id}`
  };
}

export async function readStoredImage(storageKey: string) {
  const root = uploadRoot();
  const target = path.resolve(root, storageKey);
  if (!target.startsWith(`${root}${path.sep}`)) {
    throw new Error("Invalid media path.");
  }
  return readFile(target);
}

export async function deleteStoredImage(storageKey: string) {
  const root = uploadRoot();
  const target = path.resolve(root, storageKey);
  if (!target.startsWith(`${root}${path.sep}`)) return;
  await unlink(target).catch(() => undefined);
}
