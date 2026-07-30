import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { deleteStoredImage, storeImage } from "@/lib/media-storage";
import { getPrisma } from "@/lib/prisma";
import { isSameOrigin } from "@/lib/request-security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "请求来源无效。" }, { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 6 * 1024 * 1024) {
    return NextResponse.json({ error: "图片大小必须在 5MB 以内。" }, { status: 413 });
  }

  let stored: Awaited<ReturnType<typeof storeImage>> | null = null;
  let committed = false;
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const altText = typeof formData.get("alt") === "string"
      ? String(formData.get("alt")).trim().slice(0, 300)
      : "网站内容图片";
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "请选择需要上传的图片。" }, { status: 400 });
    }

    stored = await storeImage(file);
    await getPrisma().mediaAsset.create({
      data: {
        id: stored.id,
        fileName: file.name.slice(0, 255) || stored.storageKey,
        storageKey: stored.storageKey,
        publicUrl: stored.publicUrl,
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
        kind: "IMAGE",
        altText: altText || "网站内容图片",
        isPublic: true,
        uploadedById: user.id
      }
    });
    committed = true;
    return NextResponse.json({ url: stored.publicUrl });
  } catch (error) {
    if (stored && !committed) await deleteStoredImage(stored.storageKey);
    const isInputError = error instanceof Error && error.message.includes("图片");
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("Content image database update failed", error.code);
    } else if (!isInputError) {
      console.error("Content image upload failed", error);
    }
    return NextResponse.json(
      { error: isInputError ? error.message : "图片上传失败，请稍后重试。" },
      { status: isInputError ? 400 : 500 }
    );
  }
}
