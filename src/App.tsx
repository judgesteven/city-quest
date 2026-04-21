import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Coords = { latitude: number; longitude: number };

const DEFAULT_CENTER: Coords = { latitude: 31.2001, longitude: 29.9187 };
const CAFE: Coords = { latitude: 31.2048, longitude: 29.9302 };

export default function App() {
  const mapNodeRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.CircleMarker | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const [activeMode, setActiveMode] = useState<"Challenges" | "Rewards">("Challenges");

  useEffect(() => {
    if (!mapNodeRef.current || mapRef.current) {
      return;
    }

    const map = L.map(mapNodeRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([DEFAULT_CENTER.latitude, DEFAULT_CENTER.longitude], 15);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    const cafeIcon = L.divIcon({
      className: "poi-icon-wrapper",
      html: `<div class="poi-icon">☕ Costa Coffee</div>`,
      iconSize: [110, 30],
      iconAnchor: [20, 15],
    });
    L.marker([CAFE.latitude, CAFE.longitude], { icon: cafeIcon }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!window.isSecureContext || !("geolocation" in navigator)) {
      return;
    }

    const updatePosition = (coords: Coords) => {
      const map = mapRef.current;
      if (!map) {
        return;
      }

      const target: [number, number] = [coords.latitude, coords.longitude];
      map.setView(target, Math.max(map.getZoom(), 16), { animate: true });

      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng(target);
      } else {
        userMarkerRef.current = L.circleMarker(target, {
          radius: 10,
          color: "#ffffff",
          weight: 3,
          fillColor: "#2aa4ff",
          fillOpacity: 1,
        }).addTo(map);
      }
    };

    navigator.geolocation.getCurrentPosition(
      (position) =>
        updatePosition({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      () => {
        const map = mapRef.current;
        if (!map || userMarkerRef.current) {
          return;
        }
        const fallback: [number, number] = [DEFAULT_CENTER.latitude, DEFAULT_CENTER.longitude];
        map.setView(fallback, Math.max(map.getZoom(), 16), { animate: true });
        userMarkerRef.current = L.circleMarker(fallback, {
          radius: 10,
          color: "#ffffff",
          weight: 3,
          fillColor: "#2aa4ff",
          fillOpacity: 1,
        }).addTo(map);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) =>
        updatePosition({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      () => {},
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 15000 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  return (
    <main className="app-shell">
      <div className="map-bg" ref={mapNodeRef} />
      <div className="overlay">
        <header className="profile-card">
          <div className="avatar-wrap">
            <div className="avatar">🧔</div>
            <div className="level-badge">7</div>
          </div>
          <div className="profile-main">
            <div className="name">Joe Bloggs</div>
            <div className="squad">Family Squad</div>
          </div>
          <div className="stats">
            <div className="stat-badge xp">
              <span className="stat-value">87</span>
              <span className="stat-meta">⚡ XP</span>
            </div>
            <div className="stat-badge gems">
              <span className="stat-value">5</span>
              <span className="stat-meta">💎 Gems</span>
            </div>
          </div>
        </header>

        <div className="segmented">
          <button
            type="button"
            className={activeMode === "Challenges" ? "segment active" : "segment"}
            onClick={() => setActiveMode("Challenges")}
          >
            Challenges
          </button>
          <button
            type="button"
            className={activeMode === "Rewards" ? "segment active" : "segment"}
            onClick={() => setActiveMode("Rewards")}
          >
            Rewards
          </button>
        </div>

        <nav className="bottom-nav">
          <button type="button" className="tab active">
            <span>🏠</span>
            <small>Home</small>
          </button>
          <button type="button" className="tab">
            <span>🏆</span>
            <small>Challenges</small>
          </button>
          <button type="button" className="tab">
            <span>🎁</span>
            <small>Rewards</small>
          </button>
          <button type="button" className="tab">
            <span>⋯</span>
            <small>More</small>
          </button>
        </nav>
      </div>
    </main>
  );
}
