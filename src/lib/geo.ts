import type { GeoPoint } from './types';

export function getCurrentLocation(): Promise<GeoPoint> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('no_gps'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      (e) => reject(e),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 },
    );
  });
}

// Opens the phone's own maps app: free, no embedded map (requirement L-06).
export const mapsLink = (p: GeoPoint) =>
  `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;

export function distanceMeters(a: GeoPoint, b: GeoPoint): number {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
