/**
 * /lib/meta/client.ts
 * Typed wrapper for Meta Cloud API (Graph API v19.0).
 *
 * All calls use the RESTAURANT's own access token (decrypted from DB).
 * Orderza does NOT maintain a platform-level Meta access token.
 *
 * Catalogue management never depends on MSG91.
 */

const BASE_URL = "https://graph.facebook.com/v19.0";

export interface MetaProduct {
  retailer_id: string; // Our menu_item_prices.id (UUID)
  name: string; // "{item.name} — {price.label}"
  description: string;
  price: number; // In fils (AED × 100) — Meta requires minor currency unit
  currency: "AED";
  availability: "in stock" | "out of stock";
  image_url: string;
  url: string; // Restaurant's public page URL
  category: "FOOD_BEVERAGES";
}

export interface MetaProductListItem {
  id: string;
  retailer_id: string;
  name: string;
  price: number;
  availability: string;
}

export interface MetaClientConfig {
  accessToken: string;
  catalogId: string;
  phoneNumberId: string;
  wabaId: string;
}

export class MetaClient {
  private readonly token: string;
  private readonly catalogId: string;
  private readonly phoneNumberId: string;

  constructor(config: MetaClientConfig) {
    this.token = config.accessToken;
    this.catalogId = config.catalogId;
    this.phoneNumberId = config.phoneNumberId;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${BASE_URL}${path}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
    });

    const json = await res.json();

    if (!res.ok) {
      const errMsg =
        json?.error?.message ?? json?.error?.error_user_msg ?? `HTTP ${res.status}`;
      throw new MetaApiError(errMsg, res.status, json?.error?.code);
    }

    return json as T;
  }

  /** Validate access token — GET /me */
  async validateToken(): Promise<{ id: string; name: string }> {
    return this.request<{ id: string; name: string }>("/me?fields=id,name");
  }

  /** Verify phone number ID belongs to the WABA */
  async verifyPhoneNumber(): Promise<{ id: string; display_phone_number: string }> {
    return this.request<{ id: string; display_phone_number: string }>(
      `/${this.phoneNumberId}?fields=id,display_phone_number`
    );
  }

  /** Create a product in the catalogue */
  async createProduct(
    product: MetaProduct
  ): Promise<{ id: string; retailer_id: string }> {
    return this.request<{ id: string; retailer_id: string }>(
      `/${this.catalogId}/products`,
      {
        method: "POST",
        body: JSON.stringify(product),
      }
    );
  }

  /** Update a product by retailer_id */
  async updateProduct(
    retailerId: string,
    updates: Partial<Omit<MetaProduct, "retailer_id">>
  ): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(
      `/${retailerId}?catalog_id=${this.catalogId}`,
      {
        method: "POST",
        body: JSON.stringify(updates),
      }
    );
  }

  /** Delete a product by retailer_id */
  async deleteProduct(retailerId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(
      `/${retailerId}?catalog_id=${this.catalogId}`,
      { method: "DELETE" }
    );
  }

  /** List all products in the catalogue (paginates automatically) */
  async listProducts(): Promise<MetaProductListItem[]> {
    const results: MetaProductListItem[] = [];
    let url = `/${this.catalogId}/products?fields=id,retailer_id,name,price,availability&limit=100`;

    while (url) {
      const page = await this.request<{
        data: MetaProductListItem[];
        paging?: { next?: string };
      }>(url);

      results.push(...page.data);

      // Extract path from next URL if present
      if (page.paging?.next) {
        const nextUrl = new URL(page.paging.next);
        url = nextUrl.pathname + nextUrl.search;
      } else {
        break;
      }
    }

    return results;
  }

  /**
   * Send a text message via WhatsApp Cloud API.
   * Used for order status notifications.
   */
  async sendTextMessage(to: string, text: string): Promise<{ messages: { id: string }[] }> {
    return this.request<{ messages: { id: string }[] }>(
      `/${this.phoneNumberId}/messages`,
      {
        method: "POST",
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: "text",
          text: { body: text, preview_url: false },
        }),
      }
    );
  }

  /**
   * Send an interactive catalogue message linking to the restaurant's WhatsApp catalogue.
   */
  async sendCatalogueMessage(
    to: string,
    bodyText: string,
    footerText: string
  ): Promise<{ messages: { id: string }[] }> {
    return this.request<{ messages: { id: string }[] }>(
      `/${this.phoneNumberId}/messages`,
      {
        method: "POST",
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: "interactive",
          interactive: {
            type: "catalog_message",
            body: { text: bodyText },
            footer: { text: footerText },
            action: { name: "catalog_message" },
          },
        }),
      }
    );
  }
}

export class MetaApiError extends Error {
  constructor(
    message: string,
    public readonly httpStatus: number,
    public readonly code?: number
  ) {
    super(message);
    this.name = "MetaApiError";
  }
}

/** Build a MetaClient from decrypted credentials (server-side only). */
export function createMetaClient(config: MetaClientConfig): MetaClient {
  return new MetaClient(config);
}

/** Convert AED (decimal) → fils (integer, Meta's required unit) */
export function aedToFils(aed: number): number {
  return Math.round(aed * 100);
}
