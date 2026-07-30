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
    const kind = formData.get("kind");
    const file = formData.get("file");
    if ((kind !== "avatar" && kind !== "wechatQr") || !(file instanceof File)) {
      return NextResponse.json({ error: "上传参数不正确。" }, { status: 400 });
    }

    const prisma = getPrisma();
    const oldUrl = kind === "avatar"
      ? (await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).avatarUrl
      : (await prisma.siteSetting.findUnique({ where: { settingKey: "contact.wechatQr" } }))?.settingValue;
    stored = await storeImage(file);

    const createMedia = prisma.mediaAsset.create({
      data: {
        id: stored.id,
        fileName: file.name.slice(0, 255) || stored.storageKey,
        storageKey: stored.storageKey,
        publicUrl: stored.publicUrl,
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
        kind: "IMAGE",
        altText: kind === "avatar" ? "个人头像" : "微信二维码",
        isPublic: true,
        uploadedById: user.id
      }
    });
    const updateTarget = kind === "avatar"
      ? prisma.user.update({ where: { id: user.id }, data: { avatarUrl: stored.publicUrl } })
      : prisma.siteSetting.upsert({
          where: { settingKey: "contact.wechatQr" },
          update: { settingValue: stored.publicUrl, settingType: "IMAGE", label: "微信二维码", isPublic: true },
          create: {
            settingKey: "contact.wechatQr",
            settingValue: stored.publicUrl,
            settingType: "IMAGE",
            label: "微信二维码",
            group: "contact",
            isPublic: true
          }
        });
    await prisma.$transaction([createMedia, updateTarget]);
    committed = true;

    if (oldUrl?.startsWith("/api/media/") && oldUrl !== stored.publicUrl) {
      try {
        const oldAsset = await prisma.mediaAsset.findFirst({
          where: { publicUrl: oldUrl, uploadedById: user.id }
        });
        if (oldAsset) {
          await prisma.mediaAsset.delete({ where: { id: oldAsset.id } });
          await deleteStoredImage(oldAsset.storageKey);
        }
      } catch (cleanupError) {
        console.error("Previous media cleanup failed", cleanupError);
      }
    }

    return NextResponse.json({ url: stored.publicUrl });
  } catch (error) {
    if (stored && !committed) await deleteStoredImage(stored.storageKey);
    const isInputError = error instanceof Error && error.message.includes("图片");
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("Media database update failed", error.code);
    } else if (!isInputError) {
      console.error("Media upload failed", error);
    }
    const message = isInputError
      ? error.message
      : "图片上传失败，请稍后重试。";
    return NextResponse.json({ error: message }, { status: isInputError ? 400 : 500 });
  }
}
