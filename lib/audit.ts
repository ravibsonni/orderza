import { createSupabaseAdminClient } from "@/lib/supabase/server";

export type ActorType = "restaurant" | "system" | "webhook" | "rider";

export interface AuditEntry {
  restaurantId?: string;
  actorType: ActorType;
  actorId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Write an immutable audit log entry.
 * Uses the service-role client — audit_logs has a DENY-all RLS policy,
 * so only the service role can insert.
 */
export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("audit_logs").insert({
    restaurant_id: entry.restaurantId ?? null,
    actor_type: entry.actorType,
    actor_id: entry.actorId ?? null,
    action: entry.action,
    entity_type: entry.entityType ?? null,
    entity_id: entry.entityId ?? null,
    old_value: entry.oldValue ?? null,
    new_value: entry.newValue ?? null,
    ip_address: entry.ipAddress ?? null,
    user_agent: entry.userAgent ?? null,
  });

  // Audit log failures must never crash the caller; log to stderr.
  if (error) {
    console.error("[audit] Failed to write log:", error.message, entry);
  }
}

/** Helper to extract IP / user-agent from a Next.js Request object. */
export function requestMeta(req: Request): Pick<AuditEntry, "ipAddress" | "userAgent"> {
  return {
    ipAddress:
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      req.headers.get("x-real-ip") ??
      undefined,
    userAgent: req.headers.get("user-agent") ?? undefined,
  };
}
