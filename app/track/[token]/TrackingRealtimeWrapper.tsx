"use client";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { TrackingMap } from "@/components/tracking/TrackingMap";

interface Props {
  sessionId: string;
  initialLat: number;
  initialLng: number;
  restaurantName: string;
}

export function TrackingRealtimeWrapper({ sessionId, initialLat, initialLng, restaurantName }: Props) {
  const [lat, setLat] = useState(initialLat);
  const [lng, setLng] = useState(initialLng);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel(`tracking-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rider_tracking_sessions",
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          const record = payload.new as { last_lat: number | null; last_lng: number | null };
          if (record.last_lat !== null && record.last_lng !== null) {
            setLat(Number(record.last_lat));
            setLng(Number(record.last_lng));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  return <TrackingMap lat={lat} lng={lng} restaurantName={restaurantName} />;
}
