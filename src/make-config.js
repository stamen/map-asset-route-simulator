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

  const config = {
    devices: defaultDevices,
    styles: defaultStyles,
    ...localConfig,
  };

  return config;
};

export { makeConfig };
