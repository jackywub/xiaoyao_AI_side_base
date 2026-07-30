import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { readStoredImage } from "@/lib/media-storage";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!/^[a-z0-9]{20,30}$/i.test(id)) {
    return new NextResponse(null, { status: 404 });
  }

  const asset = await getPrisma().mediaAsset.findUnique({ where: { id } });
  if (!asset) return new NextResponse(null, { status: 404 });
  if (!asset.isPublic) {
    const user = await getCurrentUser();
    if (!user || asset.uploadedById !== user.id) {
      return new NextResponse(null, { status: 404 });
    }
  }

  try {
    const file = await readStoredImage(asset.storageKey);
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": asset.mimeType,
        "Content-Length": String(file.length),
        "Cache-Control": asset.isPublic ? "public, max-age=31536000, immutable" : "private, no-store",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
