# map-asset-route-simulator

A web tool for simulating turn-by-turn navigation that allows for:

- Manipulating camera behavior
- Adding map assets from Figma
- Customizing a route line (coming soon!)

## Get started

1. Install the dependencies: `yarn install`
2. Make a local config module: `cp src/config/local.example.js src/config/local.js` and edit the config file as appropriate
3. Start the dev server: `yarn dev`

## Building and running in production mode

1. Create an optimised version of the app: `yarn build`. If you will serve the built app from a subpath such as `/compare-tool/` rather than the root domain, use the `BASE_PATH` environment variable to set it: `BASE_PATH=/compare-tool/ yarn build`
2. Deploy `public/` to a server.

## Local config

The route simulator tool allows you to use a local config file (`src/config/local.js`) to customize for your use case.

Here, you can customize the following options:

- `mapboxGlAccessToken`: Your Mapbox GL token to allow style reads
- `devices`: A list of devices to use in a dropdown with specific dimensions. Device objects require the following keys:
  - `id`: a unique id
  - `name`: a display name
  - `width`: width of the device
  - `height`: height of the device
- `styles`: A list of styles with urls to show in the dropdowns. Styles must have the following keys:
  - `id`: a unique id
  - `name`: a display name
  - `type`: the type of map (currently `mapbox-gl` only and unlikely to change)
  - `url`: (currently `mapbox-gl` only) the style's url
- `figmaLink`: Information to retrieve map assets from Figma with the following keys:
  - `fileKey`: The file key to your Figma file containing the appropriate frames
  - `personalAccessToken`: Your Figma access token
  - `scale`: Pixel ratio, either 1 or 2
  - `destination-pin`: The name of the frame containing an icon called "destination-pin"
  - `puck`: The name of the frame containing an icon called "puck"
- `durationMultiplier`: A multiplier for the duration of the route in miliseconds. Real time would be 1000 (which feels very slow in simulation)
- `routingOptions`: Primary zoom and pitch for the route. Can use the following keys:
  - `leadDistance`: The distance in meters to begin easing into a maneuver's zoom and pitch options
  - `pitch`: The pitch of the map
  - `zoom`: The zoom of the map
- `speedOptions`: Alternative zoom and pitch for the route for crossing above a speed threshold. Can use the following keys:
  - `leadDistance`: The distance in meters to begin easing into a maneuver's zoom and pitch options
  - `speed`: The speed threshold to trigger using these options
  - `pitch`: The pitch of the map
  - `zoom`: The zoom of the map
- `maneuverOptions`: Alternative zoom and pitch for specific maneuvers. Can use the following keys:
  - `[name of maneuver type]`: (See https://docs.mapbox.com/api/navigation/directions/#maneuver-types) Key is name of the type of maneuver to trigger easing into the options. Value is an object with the following keys:
    - `pitch`: The pitch of the map
    - `zoom`: The zoom of the map
- `directionsApiCall`: An async function that calls a routing/directions API with an argument of lng/lat points. The app will call the Mapbox Directions API by default using your Mapbox token, but you may instead use a preferred API. Your function **must** return the specified format for the API response (see section in README).

For more details on how these should look, see the example in [`src/config/local.example.js`](./src/config/local.example.js).

## Setting up the app in your repo

### 1. Install this module into your repo.

`npm i github:stamen/map-asset-route-simulator#<release>` or `yarn add github:stamen/map-asset-route-simulator#<release>`

### 2. Set up files to serve app

When setting up the app in your repo, you'll want to create a directory that can house:

- An `index.html` file to serve the app
- A local config file (specified above)
- The copied over module files (see step 3)

Your `index.html` file should look like the following:

```
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />

    <title>Map Asset Route Simulator</title>

    <link rel="stylesheet" href="./dist/bundle.css" />
  </head>

  <script type="module">
    import { startApp } from './dist/bundle.js';
    import * as localConfig from './local.js';

    startApp(document.body, { localConfig });
  </script>

  <body></body>
</html>
```

### 3. In addition, prior to serving the route-simulator tool in your repo, you'll want to add a simple build script to your package that will copy our module files into the appropriate directory where `tool/dir/path/` is the directory you've created to serve the app from:

`"build-compare": "rm -rf tool/dir/path/dist && cp -r node_modules/map-asset-route-simulator/dist tool/dir/path/dist"`

You will run this build script prior to serving the app from `index.html` or publishing the app anywhere to ensure files are up to date.

The final directory structure should look like:

```
root/
  - route-simulator/
    - dist/
      - bundle.js
      - bundle.js.map
      - bundle.css
    - index.html
    - local.js
```

## Directions API response

If you are using the default Mapbox Directions API response in the app, then you don't need to be concerned with this section.

If you choose to use a custom routing API, you need to make sure your function returns data as an object in the following format:

```ts
{
  coordinates: Array<[number, number]>, // Array of lat/lng points for the entire route as array values
  steps: [ // Array of "step" objects representing the route
    {
      distance: number // Number of meters for segment
      duration: number, // Estimated duration of driving segment in seconds
      geometry: GeoJson, // LineString geojson of the segment of the route
      maneuver: {
        bearing_before: number, // Bearing before entering a maneuver
        bearing_after: number, // Bearing after exiting a maneuver
        location: [number, number], // Lat/lng pair for the location of the maneuver
        type: string, // One of these valid maneuver types https://docs.mapbox.com/api/navigation/directions/#maneuver-types
      }
    }
  ]
}
```
