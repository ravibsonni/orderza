/**
 * /lib/msg91/client.ts
 * MSG91 API wrapper with graceful fallback for bot registration.
 *
 * Primary responsibilities:
 *  1. Validate MSG91 API key
 *  2. Attempt to register the AI ordering bot via MSG91 API
 *     → If API unavailable / returns non-2xx: return prompt for manual copy
 *  3. Send WhatsApp messages (status notifications, tracking links)
 *  4. Receive location webhooks (handled in /api/webhooks/msg91/location)
 */

const MSG91_BASE = "https://api.msg91.com/api/v5";

export interface MSG91BotCreatePayload {
  name: string;
  whatsapp_number: string;
  bot_type: "ai";
  ai_prompt: string;
  fallback_message: string;
  language: string[];
}

export interface MSG91BotCreateResult {
  bot_id: string;
  status: string;
}

export interface MSG91SendMessageResult {
  message: string;
  type: string;
  request_id?: string;
}

export class MSG91Client {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const res = await fetch(`${MSG91_BASE}${path}`, {
      ...options,
      headers: {
        authkey: this.apiKey,
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new MSG91ApiError(
        json?.message ?? `MSG91 HTTP ${res.status}`,
        res.status
      );
    }

    return json as T;
  }

  /** Validate API key by calling a lightweight endpoint */
  async validateKey(): Promise<boolean> {
    try {
      await this.request<{ message: string }>("/balance");
      return true;
    } catch {
      // Some MSG91 plans don't have /balance — try another lightweight endpoint
      try {
        await this.request<unknown>("/whatsapp/opt-in");
        return true;
      } catch {
        return false;
      }
    }
  }

  /**
   * Attempt to register an AI ordering bot via MSG91 API.
   * Returns { method: 'auto', botId } on success.
   * Returns { method: 'manual', prompt } on any failure (graceful fallback).
   */
  async registerBot(
    payload: MSG91BotCreatePayload,
    prompt: string
  ): Promise<
    | { method: "auto"; botId: string }
    | { method: "manual"; prompt: string }
  > {
    try {
      const result = await this.request<MSG91BotCreateResult>(
        "/whatsapp/bot/create",
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );

      if (result.bot_id) {
        return { method: "auto", botId: result.bot_id };
      }

      // Unexpected response shape — treat as failure
      return { method: "manual", prompt };
    } catch (err) {
      // Log the failure but never propagate — manual fallback is valid UX
      console.warn(
        "[msg91] Bot registration API unavailable or failed:",
        err instanceof Error ? err.message : String(err)
      );
      return { method: "manual", prompt };
    }
  }

  /**
   * Send a WhatsApp text message via MSG91.
   * Used for order status notifications and tracking links.
   */
  async sendWhatsAppMessage(
    to: string,
    message: string,
    senderNumber: string
  ): Promise<MSG91SendMessageResult> {
    return this.request<MSG91SendMessageResult>("/whatsapp/send", {
      method: "POST",
      body: JSON.stringify({
        integrated_number: senderNumber,
        content_type: "template",
        payload: {
          messaging_product: "whatsapp",
          type: "text",
          text: { body: message },
        },
        to,
      }),
    });
  }

  /**
   * Verify a webhook signature from MSG91.
   * MSG91 sends `x-msg91-signature` header with HMAC-SHA256 of body.
   */
  static verifyWebhookSignature(
    body: string,
    signatureHeader: string,
    secret: string
  ): boolean {
    const { createHmac } = require("crypto") as typeof import("crypto");
    const expected = createHmac("sha256", secret).update(body).digest("hex");
    // Constant-time comparison
    if (expected.length !== signatureHeader.length) return false;
    const a = Buffer.from(expected);
    const b = Buffer.from(signatureHeader);
    return a.every((byte, i) => byte === b[i]);
  }
}

export class MSG91ApiError extends Error {
  constructor(
    message: string,
    public readonly httpStatus: number
  ) {
    super(message);
    this.name = "MSG91ApiError";
  }
}

export function createMSG91Client(apiKey: string): MSG91Client {
  return new MSG91Client(apiKey);
}
