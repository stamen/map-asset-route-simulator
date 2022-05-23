import { config as configStore } from './stores';
let mapboxGlAccessToken;
configStore.subscribe(value => ({ mapboxGlAccessToken } = value));

const fetchDirections = async (locA, locB) => {
  const { lng: lngA, lat: latA } = locA;
  const { lng: lngB, lat: latB } = locB;

  let data;
  try {
    // Mapbox API limit at 100,000 requests for free tier
    const response = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/driving/${lngA},${latA};${lngB},${latB}?geometries=geojson&access_token=${mapboxGlAccessToken}`
    );
    data = await response.json();
  } catch (e) {
    console.error(e);
  }
  return data;
};

export { fetchDirections };
