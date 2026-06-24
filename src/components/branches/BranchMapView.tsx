"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default icon broken by webpack
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)
  ._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom violet pin for head office
const headOfficeIcon = new L.Icon({
  iconUrl: `data:image/svg+xml;base64,${btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40">
      <path d="M14 0C6.27 0 0 6.27 0 14c0 9.25 14 26 14 26S28 23.25 28 14C28 6.27 21.73 0 14 0z" fill="#7c3aed"/>
      <circle cx="14" cy="14" r="6" fill="white"/>
    </svg>
  `)}`,
  iconSize: [28, 40],
  iconAnchor: [14, 40],
  popupAnchor: [0, -40],
});

// Regular branch pin
const branchIcon = new L.Icon({
  iconUrl: `data:image/svg+xml;base64,${btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="34" viewBox="0 0 24 34">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 8.25 12 22 12 22S24 20.25 24 12C24 5.37 18.63 0 12 0z" fill="#6366f1"/>
      <circle cx="12" cy="12" r="5" fill="white"/>
    </svg>
  `)}`,
  iconSize: [24, 34],
  iconAnchor: [12, 34],
  popupAnchor: [0, -34],
});

interface Branch {
  id: number;
  name: string;
  code: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  isHeadOffice: boolean;
  isActive: boolean;
  latitude: number | null;
  longitude: number | null;
}

// Auto-fit bounds to all markers
function FitBounds({ branches }: { branches: Branch[] }) {
  const map = useMap();
  useEffect(() => {
    const mapped = branches.filter((b) => b.latitude && b.longitude);
    if (mapped.length === 0) return;
    if (mapped.length === 1) {
      map.setView([mapped[0].latitude!, mapped[0].longitude!], 11);
      return;
    }
    const bounds = L.latLngBounds(
      mapped.map((b) => [b.latitude!, b.longitude!]),
    );
    map.fitBounds(bounds, { padding: [48, 48] });
  }, [branches, map]);
  return null;
}

export default function BranchMapView({ branches }: { branches: Branch[] }) {
  const mapped = branches.filter((b) => b.latitude && b.longitude);

  // Default center — Sri Lanka
  const defaultCenter: [number, number] = [7.8731, 80.7718];
  const defaultZoom = 7;

  return (
    <MapContainer
      center={defaultCenter}
      zoom={defaultZoom}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FitBounds branches={branches} />

      {mapped.map((b) => (
        <Marker
          key={b.id}
          position={[b.latitude!, b.longitude!]}
          icon={b.isHeadOffice ? headOfficeIcon : branchIcon}
        >
          <Popup minWidth={200}>
            <div style={{ fontFamily: "inherit", fontSize: 13 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 6,
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: "#ede9fe",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: 12,
                    color: "#7c3aed",
                  }}
                >
                  {b.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p style={{ fontWeight: 600, margin: 0, color: "#1f2937" }}>
                    {b.name}
                  </p>
                  {b.isHeadOffice && (
                    <p style={{ margin: 0, fontSize: 10, color: "#d97706" }}>
                      ★ Head Office
                    </p>
                  )}
                </div>
              </div>
              {b.code && (
                <p style={{ margin: "2px 0", color: "#6b7280" }}>
                  Code: <strong>{b.code}</strong>
                </p>
              )}
              {b.phone && (
                <p style={{ margin: "2px 0", color: "#6b7280" }}>
                  📞 {b.phone}
                </p>
              )}
              {b.email && (
                <p style={{ margin: "2px 0", color: "#6b7280" }}>✉ {b.email}</p>
              )}
              {b.address && (
                <p
                  style={{ margin: "4px 0 0", color: "#6b7280", fontSize: 12 }}
                >
                  {b.address}
                </p>
              )}
              <div style={{ marginTop: 6 }}>
                <span
                  style={{
                    display: "inline-block",
                    padding: "2px 8px",
                    borderRadius: 9999,
                    fontSize: 11,
                    fontWeight: 500,
                    background: b.isActive ? "#d1fae5" : "#fee2e2",
                    color: b.isActive ? "#065f46" : "#991b1b",
                  }}
                >
                  {b.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}

      {mapped.length === 0 && (
        // Overlay message when nothing is mapped yet — rendered outside the map DOM
        <></>
      )}
    </MapContainer>
  );
}
