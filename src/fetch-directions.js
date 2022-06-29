import { config as configStore } from './stores';
import { parseMapboxResponse } from './parse-mapbox-response';

let mapboxGlAccessToken;
configStore.subscribe(value => ({ mapboxGlAccessToken } = value));

const mapboxDirectionsEndpointUrl = (...locations) => {
  const destinations = locations
    .map(val => {
      const { lng, lat } = val;
      return `${lng},${lat}`;
    })
    .join(';');

  // Mapbox API limit at 100,000 requests for free tier
  return `https://api.mapbox.com/directions/v5/mapbox/driving/${destinations}?geometries=geojson&steps=true&access_token=${mapboxGlAccessToken}`;
};

const fetchDirections = async (...locations) => {
  let data;
  try {
    const url = mapboxDirectionsEndpointUrl(...locations);
    const response = await fetch(url);
    data = await response.json();
  } catch (e) {
    console.error(e);
  }

  return parseMapboxResponse(data);
};

export { fetchDirections };
