const parseMapboxResponse = apiResponse => {
  const routes = apiResponse.routes;
  const route = routes[0];
  const steps = route.legs.reduce((acc, leg) => {
    const steps = leg.steps.reduce((acc, step) => acc.concat(step), []);
    acc = acc.concat(steps);
    return acc;
  }, []);

  let features = steps.map(step => step.geometry);
  features = features.map(f => ({ type: 'Feature', geometry: f }));
  const highResGeom = {
    type: 'FeatureCollection',
    features: features,
  };

  return { steps, highResGeom };
};

export { parseMapboxResponse };
