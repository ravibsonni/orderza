"use client";
import { useEffect, useRef } from "react";

interface Props {
  lat: number;
  lng: number;
  restaurantName: string;
}

export function TrackingMap({ lat, lng, restaurantName }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);
  const markerRef = useRef<unknown>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !mapRef.current) return;

    import("leaflet").then((L) => {
      if (!mapRef.current) return;

      if (!mapInstanceRef.current) {
        const map = L.map(mapRef.current, { zoomControl: false, attributionControl: false }).setView([lat, lng], 15);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap contributors",
        }).addTo(map);
        L.control.zoom({ position: "bottomright" }).addTo(map);

        const icon = L.divIcon({
          html: `<div style="background:#1B4332;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)">🛵</div>`,
          className: "",
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });

        const marker = L.marker([lat, lng], { icon }).addTo(map);
        marker.bindPopup(`${restaurantName} rider`).openPopup();

        mapInstanceRef.current = map;
        markerRef.current = marker;
      } else {
        const map = mapInstanceRef.current as ReturnType<typeof L.map>;
        const marker = markerRef.current as ReturnType<typeof L.marker>;
        map.setView([lat, lng], 15);
        marker.setLatLng([lat, lng]);
      }
    });

    return () => {
      if (mapInstanceRef.current) {
        (mapInstanceRef.current as { remove: () => void }).remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, [lat, lng, restaurantName]);

  return (
    <div
      ref={mapRef}
      className="w-full h-72 rounded-2xl overflow-hidden border"
      style={{ minHeight: 280 }}
    />
  );
}
