export type Location = {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
};

export async function detectLocation(): Promise<Location | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;

          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();

          resolve({
            city: data.address.city || data.address.town || data.address.village || 'Unknown',
            country: data.address.country || 'Unknown',
            latitude,
            longitude,
          });
        } catch (error) {
          resolve(null);
        }
      },
      () => {
        resolve(null);
      }
    );
  });
}

export function saveLocation(location: Location | null) {
  if (location) {
    localStorage.setItem('user_location', JSON.stringify(location));
  } else {
    localStorage.removeItem('user_location');
  }
}

export function getSavedLocation(): Location | null {
  const saved = localStorage.getItem('user_location');
  return saved ? JSON.parse(saved) : null;
}

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
