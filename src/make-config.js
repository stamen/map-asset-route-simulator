const makeConfig = localConfig => {
  const defaultDevices = [
    {
      id: 'google-pixel',
      name: 'Google Pixel',
      height: 732,
      width: 412,
    },
    {
      id: 'iphone-13',
      name: 'iPhone 13',
      height: 844,
      width: 390,
    },
  ];

  const defaultStyles = [
    {
      id: 'mapbox-streets',
      name: 'Mapbox Streets',
      type: 'mapbox-gl',
      url: 'mapbox://styles/mapbox/streets-v11',
    },
    {
      id: 'mapbox-outdoors',
      name: 'Mapbox Outdoors',
      type: 'mapbox-gl',
      url: 'mapbox://styles/mapbox/outdoors-v11',
    },
    {
      id: 'mapbox-light',
      name: 'Mapbox Light',
      type: 'mapbox-gl',
      url: 'mapbox://styles/mapbox/light-v10',
    },
    {
      id: 'mapbox-dark',
      name: 'Mapbox Dark',
      type: 'mapbox-gl',
      url: 'mapbox://styles/mapbox/dark-v10',
    },
  ];

  const defaultMapState = {
    bearing: 0,
    center: { lng: -73.92169, lat: 40.83962 },
    pitch: 0,
    zoom: 13.25,
  };

  const defaultDurationMultiplier = 50;

  const defaultRoutingOptions = {
    leadDistance: 125,
    pitch: 45,
    zoom: 15.5,
  };

  // See https://docs.mapbox.com/api/navigation/directions/#maneuver-types for types
  const defaultManeuverOptions = {
    '*': {
      pitch: 35,
      zoom: 16.75,
    },
  };

  const defaultSpeedOptions = {
    leadDistance: 150,
    // meters per second
    speed: 17.5,
    zoom: 13.5,
    pitch: 50,
  };

  // TODO we should do deep merge just in case
  const routingOptions = {
    ...defaultRoutingOptions,
    ...(localConfig?.routingOptions || {}),
  };

  // TODO we should do deep merge just in case
  const maneuverOptions = {
    ...defaultManeuverOptions,
    ...(localConfig?.maneuverOptions || {}),
  };

  // TODO we should do deep merge just in case
  const speedOptions = {
    ...defaultSpeedOptions,
    ...(localConfig?.speedOptions || {}),
  };

  let nextLocalConfig = JSON.parse(JSON.stringify(localConfig));
  nextLocalConfig?.routingOptions && delete nextLocalConfig.routingOptions;

  // We need to do reassign functions since stringifying a JSON with a function value removes the key/value pair
  if (localConfig.directionsApiCall) {
    nextLocalConfig = {
      ...nextLocalConfig,
      directionsApiCall: localConfig.directionsApiCall,
    };
  }

  const config = {
    devices: defaultDevices,
    styles: defaultStyles,
    mapState: defaultMapState,
    durationMultiplier: defaultDurationMultiplier,
    routingOptions,
    maneuverOptions,
    speedOptions,
    ...nextLocalConfig,
  };

  return config;
};

export { makeConfig };
