import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { writeAuditLog, requestMeta } from "@/lib/audit";
import {
  extractMenuFromFile,
  extractMenuFromText,
} from "@/lib/ai/extract";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

export async function POST(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const restaurantName = formData.get("restaurantName") as string | undefined;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 20 MB." },
      { status: 400 }
    );
  }

  const mimeType = file.type;
  const validTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "text/csv",
    "text/plain",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
  ];

  if (!validTypes.includes(mimeType)) {
    return NextResponse.json(
      { error: "Unsupported file type. Use PDF, image, CSV, or Excel." },
      { status: 400 }
    );
  }

  const context = restaurantName ? `Restaurant: ${restaurantName}` : undefined;

  let result;

  if (
    mimeType === "text/csv" ||
    mimeType === "text/plain"
  ) {
    const text = await file.text();
    result = await extractMenuFromText(text, context);
  } else if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mimeType === "application/vnd.ms-excel"
  ) {
    // For Excel, convert to text representation
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    // Treat Excel files as binary PDF-like documents
    result = await extractMenuFromFile(
      base64,
      "application/pdf",
      context
    );
  } else {
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const typedMime = mimeType as
      | "application/pdf"
      | "image/jpeg"
      | "image/png"
      | "image/webp";
    result = await extractMenuFromFile(base64, typedMime, context);
  }

  await writeAuditLog({
    restaurantId: session.restaurantId,
    actorType: "restaurant",
    actorId: session.authUserId,
    action: "menu.extract",
    entityType: "file",
    newValue: {
      fileName: file.name,
      itemCount: result.items.length,
      categoryCount: result.categories.length,
      confidence: result.confidence,
    },
    ...requestMeta(req),
  });

  return NextResponse.json({ success: true, data: result });
}
