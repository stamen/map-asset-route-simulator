const round = (n, digits) => {
  return Math.round(n * 10 ** digits) / 10 ** digits;
};

// Keys that should be encoded/decoded as arrays
const jsonKeys = [
  'locations',
  'routeLines',
  'routeLineBuffer',
  'deviceSize',
  'routingOptions',
  'speedOptions',
  'maneuverOptions',
  'styleUrl',
];

// Keys that should be encoded/decoded as boolean values
const booleanKeys = [];

// Keys that should be encoded (not decoded) encoded as one map param
const mapLocationKeys = ['bearing', 'center', 'pitch', 'zoom'];

// Keys that should be decoded as numbers
const numericKeys = [
  'bearing',
  'lat',
  'lng',
  'pitch',
  'zoom',
  'durationMultiplier',
];

function toQueryString(obj) {
  let qs = obj.map ? `map=${obj.map}` : '';
  const excludedKeys = ['map', 'stylePresets'];

  Object.entries(obj).forEach(([key, value], i) => {
    if (excludedKeys.includes(key)) return;
    let encodedValue = encodeURIComponent(value);
    qs = `${qs}${qs !== '' ? '&' : ''}${key}=${encodedValue}`;
  });
  return qs;
}

function fromQueryString(qs) {
  const paramString = qs.split('#')[1];
  if (!paramString) return {};
  let params = Object.fromEntries(
    paramString.split('&').map(e => e.split('=').map(decodeURIComponent))
  );
  if (params.map) {
    const [zoom, lat, lng, pitch, bearing] = params.map.split('/');
    params = {
      ...params,
      bearing,
      lat,
      lng,
      pitch,
      zoom,
    };
  }
  return params;
}

// Remove values set to null
const cleanSettings = stateObj => {
  let nextState = Object.keys(stateObj).reduce((acc, k) => {
    const value = stateObj[k];
    if (value !== null) acc[k] = value;
    return acc;
  }, {});
  return nextState;
};

export function writeHash(mapSettings) {
  let nonMapSettings = Object.fromEntries(
    Object.entries(mapSettings)
      .filter(([k, v]) => !mapLocationKeys.includes(k))
      .map(([k, v]) => [
        k,
        jsonKeys.includes(k) && v !== null ? JSON.stringify(v) : v,
      ])
  );

  nonMapSettings = cleanSettings(nonMapSettings);

  window.location.hash = toQueryString({
    map: [
      round(mapSettings.zoom, 2),
      round(mapSettings.center.lat, 4),
      round(mapSettings.center.lng, 4),
      round(mapSettings.pitch, 1),
      round(mapSettings.bearing, 1),
    ].join('/'),
    ...nonMapSettings,
  });
}

export function readHash(qs) {
  // Remove unset values, convert value as necessary
  let urlState = Object.fromEntries(
    Object.entries(fromQueryString(qs))
      .filter(([k, v]) => !!v)
      .map(([k, v]) => {
        if (jsonKeys.includes(k)) return [k, JSON.parse(v)];
        if (booleanKeys.includes(k)) return [k, v === 'true'];
        if (numericKeys.includes(k)) return [k, +v || 0];
        return [k, v];
      })
  );

  // Only return center, not lat and lng
  if (urlState.lat && urlState.lng) {
    const { lat, lng } = urlState;
    urlState.center = { lat, lng };
    delete urlState.lat;
    delete urlState.lng;
  }

  // map is redundant here, remove it
  if (urlState.map) {
    delete urlState.map;
  }

  return urlState;
}
