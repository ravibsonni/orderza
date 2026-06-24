import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/crypto";
import { createMSG91Client } from "@/lib/msg91/client";
import { generateBotPrompt } from "@/lib/msg91/prompt";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { apiKey } = body as { apiKey: string };

  if (!apiKey?.trim()) {
    return NextResponse.json(
      { error: "MSG91 API key is required." },
      { status: 400 }
    );
  }

  const admin = createSupabaseAdminClient();

  // Fetch restaurant details for prompt generation
  const { data: restaurant } = await admin
    .from("restaurants")
    .select(
      `id, name, whatsapp_number, slug,
       restaurant_tax_config(tax_rate, tax_name, is_inclusive)`
    )
    .eq("id", session.restaurantId)
    .single();

  if (!restaurant) {
    return NextResponse.json({ error: "Restaurant not found." }, { status: 404 });
  }

  // Validate API key
  const msg91 = createMSG91Client(apiKey);
  const isValid = await msg91.validateKey();

  if (!isValid) {
    return NextResponse.json(
      { error: "Invalid MSG91 API key. Please check and try again." },
      { status: 400 }
    );
  }

  // Encrypt and store API key
  const encryptedKey = encrypt(apiKey);
  await admin
    .from("restaurants")
    .update({ msg91_api_key_enc: encryptedKey })
    .eq("id", session.restaurantId);

  // Generate bot prompt
  const taxConfig = Array.isArray(restaurant.restaurant_tax_config)
    ? restaurant.restaurant_tax_config[0]
    : restaurant.restaurant_tax_config;

  const prompt = generateBotPrompt({
    name: restaurant.name,
    whatsappNumber: restaurant.whatsapp_number ?? "",
    taxRate: Number(taxConfig?.tax_rate ?? 5),
    taxName: taxConfig?.tax_name ?? "VAT",
    taxInclusive: taxConfig?.is_inclusive ?? false,
    deliveryFee: 0,
    slug: restaurant.slug,
  });

  // Store prompt in DB regardless of registration outcome
  await admin
    .from("restaurants")
    .update({ msg91_bot_prompt: prompt })
    .eq("id", session.restaurantId);

  // Attempt bot registration
  const registrationResult = await msg91.registerBot(
    {
      name: `${restaurant.name} Order Bot`,
      whatsapp_number: restaurant.whatsapp_number ?? "",
      bot_type: "ai",
      ai_prompt: prompt,
      fallback_message:
        "Our team will be with you shortly. Thank you for your patience!",
      language: ["en", "ar"],
    },
    prompt
  );

  // Update registration outcome
  if (registrationResult.method === "auto") {
    await admin
      .from("restaurants")
      .update({
        msg91_bot_id: registrationResult.botId,
        msg91_bot_setup_method: "auto",
        msg91_connected_at: new Date().toISOString(),
      })
      .eq("id", session.restaurantId);
  } else {
    await admin
      .from("restaurants")
      .update({
        msg91_bot_setup_method: "manual",
        msg91_connected_at: new Date().toISOString(),
      })
      .eq("id", session.restaurantId);
  }

  await writeAuditLog({
    restaurantId: session.restaurantId,
    actorType: "restaurant",
    actorId: session.authUserId,
    action: "msg91.bot.setup",
    newValue: {
      method: registrationResult.method,
      botId:
        registrationResult.method === "auto"
          ? registrationResult.botId
          : undefined,
    },
    ...requestMeta(req),
  });

  return NextResponse.json({
    success: true,
    method: registrationResult.method,
    prompt: registrationResult.method === "manual" ? prompt : undefined,
    botId:
      registrationResult.method === "auto"
        ? registrationResult.botId
        : undefined,
  });
}
