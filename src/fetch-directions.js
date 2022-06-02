import { config as configStore } from './stores';
let mapboxGlAccessToken;
configStore.subscribe(value => ({ mapboxGlAccessToken } = value));

const fetchDirections = async (...locations) => {
  const destinations = locations
    .map(val => {
      const { lng, lat } = val;
      return `${lng},${lat}`;
    })
    .join(';');

  let data;
  try {
    // Mapbox API limit at 100,000 requests for free tier
    const response = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/driving/${destinations}?geometries=geojson&steps=true&access_token=${mapboxGlAccessToken}`
    );
    data = await response.json();
  } catch (e) {
    console.error(e);
  }
  return data;
};

export { fetchDirections };
