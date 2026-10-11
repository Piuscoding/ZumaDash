import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, CircleMarker, useMap } from 'react-leaflet';
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

function geoToLatLng(geometry) {
  const coords = geometry?.coordinates;
  if (!coords || !Array.isArray(coords)) return [];
  return coords.map(([lng, lat]) => [lat, lng]);
}

function FitBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (!positions || positions.length === 0) return;
    try {
      const b = L.latLngBounds(positions);
      if (b.isValid()) map.fitBounds(b.pad(0.2));
    } catch (_) {}
  }, [map, positions]);
  return null;
}

function InvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        map.invalidateSize();
      } catch (_) {}
    }, 100);
    const t2 = setTimeout(() => {
      try {
        map.invalidateSize();
      } catch (_) {}
    }, 400);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, [map]);
  return null;
}

function FollowRider({ riderLocation }) {
  const map = useMap();
  useEffect(() => {
    if (riderLocation?.lat != null) {
      try {
        map.panTo([Number(riderLocation.lat), Number(riderLocation.lng)]);
      } catch (_) {}
    }
  }, [map, riderLocation?.lat, riderLocation?.lng]);
  return null;
}

/**
 * Step 8 – map-mode legs:
 * - routeGeometry / legB: pickup → drop-off (green)
 * - activeLegGeometry / legA: rider → current target (blue dashed); updates as rider moves
 * Text-mode callers should not pass geometries.
 */
const DeliveryMap = ({
  pickup,
  dropoff,
  routeGeometry,
  activeLegGeometry,
  riderLocation,
  riderMarkerUrl,
  tileUrl,
  height = 280,
  className,
  showLegB = true,
}) => {
  const tile = resolveTile(tileUrl);
  const center = useMemo(() => {
    if (riderLocation?.lat != null) return [Number(riderLocation.lat), Number(riderLocation.lng)];
    if (pickup?.lat != null && pickup?.lng != null) return [Number(pickup.lat), Number(pickup.lng)];
    if (dropoff?.lat != null && dropoff?.lng != null) return [Number(dropoff.lat), Number(dropoff.lng)];
    return [9.15, 7.4];
  }, [pickup, dropoff, riderLocation]);

  const legBPositions = useMemo(() => geoToLatLng(routeGeometry), [routeGeometry]);
  const legAPositions = useMemo(() => geoToLatLng(activeLegGeometry), [activeLegGeometry]);

  const fitPositions = useMemo(() => {
    const pts = [...legBPositions, ...legAPositions];
    if (pickup?.lat != null) pts.push([Number(pickup.lat), Number(pickup.lng)]);
    if (dropoff?.lat != null) pts.push([Number(dropoff.lat), Number(dropoff.lng)]);
    if (riderLocation?.lat != null) pts.push([Number(riderLocation.lat), Number(riderLocation.lng)]);
    return pts;
  }, [legBPositions, legAPositions, pickup, dropoff, riderLocation]);

  const riderIcon = useMemo(() => {
    if (riderMarkerUrl) {
      return L.icon({
        iconUrl: riderMarkerUrl,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        className: 'zumadash-rider-marker',
      });
    }
    return L.divIcon({
      className: '',
      html: `<div style="width:18px;height:18px;background:#2563eb;border:3px solid #fff;border-radius:50%;box-shadow:0 1px 6px rgba(0,0,0,.4)"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
  }, [riderMarkerUrl]);

  const h = height;

  return (
    <div
      className={className}
      style={{
        height: h,
        width: '100%',
        borderRadius: height === '100vh' ? 0 : 12,
        overflow: 'hidden',
        background: '#e5e7eb',
      }}
    >
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
        attributionControl={false}
        zoomControl
      >
        <TileLayer url={tile} />
        <InvalidateSize />
        <FitBounds positions={fitPositions} />
        <FollowRider riderLocation={riderLocation} />
        {pickup?.lat != null && (
          <CircleMarker
            center={[Number(pickup.lat), Number(pickup.lng)]}
            radius={9}
            pathOptions={{ color: '#0f766e', fillColor: '#0f766e', fillOpacity: 1 }}
          />
        )}
        {dropoff?.lat != null && (
          <CircleMarker
            center={[Number(dropoff.lat), Number(dropoff.lng)]}
            radius={9}
            pathOptions={{ color: '#dc2626', fillColor: '#dc2626', fillOpacity: 1 }}
          />
        )}
        {/* Leg B: pickup → drop-off */}
        {showLegB && legBPositions.length > 1 && (
          <Polyline positions={legBPositions} pathOptions={{ color: '#0f766e', weight: 5, opacity: 0.85 }} />
        )}
        {/* Leg A: rider → current target (updates live) */}
        {legAPositions.length > 1 && (
          <Polyline
            positions={legAPositions}
            pathOptions={{ color: '#2563eb', weight: 4, opacity: 0.95, dashArray: '10 8' }}
          />
        )}
        {riderLocation?.lat != null && (
          <Marker position={[Number(riderLocation.lat), Number(riderLocation.lng)]} icon={riderIcon} />
        )}
      </MapContainer>
    </div>
  );
};

export default DeliveryMap;
