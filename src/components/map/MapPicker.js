import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const OSM_TILE = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

function resolveTile(tileUrl) {
  if (!tileUrl || String(tileUrl).includes('cartocdn') || String(tileUrl).includes('apikey')) {
    return OSM_TILE;
  }
  return tileUrl;
}

const defaultIcon = new L.Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function InvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const a = setTimeout(() => {
      try {
        map.invalidateSize();
      } catch (_) {}
    }, 120);
    const b = setTimeout(() => {
      try {
        map.invalidateSize();
      } catch (_) {}
    }, 400);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [map]);
  return null;
}

function ClickHandler({ onPick, activeField }) {
  useMapEvents({
    click(e) {
      if (!activeField) return;
      onPick?.(activeField, { lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function FlyTo({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target?.lat != null && target?.lng != null) {
      map.flyTo([target.lat, target.lng], 15, { duration: 0.6 });
    }
  }, [map, target?.lat, target?.lng]);
  return null;
}

function FitBoth({ pickup, dropoff }) {
  const map = useMap();
  useEffect(() => {
    const pts = [];
    if (pickup?.lat != null) pts.push([pickup.lat, pickup.lng]);
    if (dropoff?.lat != null) pts.push([dropoff.lat, dropoff.lng]);
    if (pts.length === 2) {
      map.fitBounds(L.latLngBounds(pts).pad(0.25));
    } else if (pts.length === 1) {
      map.setView(pts[0], 14);
    }
  }, [map, pickup?.lat, pickup?.lng, dropoff?.lat, dropoff?.lng]);
  return null;
}

const MapPicker = ({
  pickup,
  dropoff,
  activeField = 'pickup',
  onPick,
  flyTarget,
  tileUrl,
  height = 260,
  label,
}) => {
  const tile = resolveTile(tileUrl);
  const center = useMemo(() => {
    if (pickup?.lat != null) return [pickup.lat, pickup.lng];
    if (dropoff?.lat != null) return [dropoff.lat, dropoff.lng];
    return [9.15, 7.4];
  }, [pickup, dropoff]);

  return (
    <div>
      {label && (
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{label}</div>
      )}
      <div
        style={{
          height: typeof height === 'number' ? height : height,
          width: '100%',
          borderRadius: height === '100vh' ? 0 : 12,
          overflow: 'hidden',
          background: '#e5e7eb',
          border: '1px solid var(--gray-200)',
        }}
      >
        <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }} scrollWheelZoom attributionControl={false}>
          <TileLayer url={tile} />
          <InvalidateSize />
          <ClickHandler onPick={onPick} activeField={activeField} />
          <FlyTo target={flyTarget} />
          <FitBoth pickup={pickup} dropoff={dropoff} />
          {pickup?.lat != null && <Marker position={[pickup.lat, pickup.lng]} icon={defaultIcon} />}
          {dropoff?.lat != null && <Marker position={[dropoff.lat, dropoff.lng]} icon={defaultIcon} />}
        </MapContainer>
      </div>
      <p style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 4 }}>
        Tap map to set <strong>{activeField === 'dropoff' ? 'drop-off' : 'pickup'}</strong> pin
        {pickup ? ` · Pickup ${Number(pickup.lat).toFixed(4)}, ${Number(pickup.lng).toFixed(4)}` : ''}
        {dropoff ? ` · Drop ${Number(dropoff.lat).toFixed(4)}, ${Number(dropoff.lng).toFixed(4)}` : ''}
      </p>
    </div>
  );
};

export default MapPicker;
