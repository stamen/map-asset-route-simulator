const parseMapboxResponse = apiResponse => {
  const routes = apiResponse.routes;
  const route = routes[0];
  const steps = route.legs.reduce((acc, leg) => {
    const steps = leg.steps.reduce((acc, step) => acc.concat(step), []);
    acc = acc.concat(steps);
    return acc;
  }, []);

  let coordinates = steps.map(step => step.geometry);
  coordinates = coordinates.reduce((acc, f) => acc.concat(f.coordinates), []);

  return { steps, coordinates };
};

export { parseMapboxResponse };
