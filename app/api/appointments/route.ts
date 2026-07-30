import { NextResponse } from "next/server";

import { getPrisma } from "@/lib/prisma";
import { getClientIp, isSameOrigin } from "@/lib/request-security";

export const runtime = "nodejs";

const globalForAppointments = globalThis as unknown as { appointmentAttempts?: Map<string, number[]> };
const appointmentAttempts = globalForAppointments.appointmentAttempts || new Map<string, number[]>();
globalForAppointments.appointmentAttempts = appointmentAttempts;

function contactFields(value: string) {
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return { email: value };
  if (/^1\d{10}$/.test(value.replace(/\s+/g, ""))) return { phone: value.replace(/\s+/g, "") };
  return { wechat: value };
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "请求来源无效。" }, { status: 403 });
  const ip = getClientIp(request);
  const now = Date.now();
  const recent = (appointmentAttempts.get(ip) || []).filter((time) => now - time < 30 * 60 * 1000);
  if (recent.length >= 5) return NextResponse.json({ error: "提交过于频繁，请稍后再试。" }, { status: 429 });
  appointmentAttempts.set(ip, [...recent, now]);

  const body = await request.json() as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const contact = typeof body.contact === "string" ? body.contact.trim() : "";
  const topic = typeof body.topic === "string" ? body.topic.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (name.length < 2 || name.length > 100 || contact.length < 5 || contact.length > 191 || !topic || topic.length > 100 || message.length < 10 || message.length > 5000) {
    return NextResponse.json({ error: "请检查称呼、联系方式、咨询方向和问题描述。" }, { status: 400 });
  }

  const prisma = getPrisma();
  const fields = contactFields(contact);
  const duplicate = await prisma.appointment.findFirst({
    where: {
      name,
      serviceType: topic,
      message,
      createdAt: { gte: new Date(now - 5 * 60 * 1000) },
      ...fields
    }
  });
  if (duplicate) return NextResponse.json({ success: true, duplicate: true });
  await prisma.appointment.create({
    data: { name, serviceType: topic, message, source: "website-contact-form", ...fields }
  });
  return NextResponse.json({ success: true }, { status: 201 });
}
