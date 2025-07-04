import { loadFigmassets } from 'figmasset';
import { config as configStore } from './stores';
import { MAP_ASSET_ICONS } from './constants';

let figmaLink;
configStore.subscribe(value => ({ figmaLink } = value));

// Takes a map object and adds any valid Figma images referenced in the config to the map
// Returns an array of all images that have been added
const addFigmaImages = async (map, mapRenderer) => {
  if (!figmaLink) return new Promise([]);
  // TODO make keys optional, don't need to provide both or any icons if they don't want
  let args = {
    ...figmaLink,
    // We need to transform this because our config requires more specificity
    // Frames can be named anything, but icons in the frames need specific names
    frameNames: [
      ...new Set(
        MAP_ASSET_ICONS.map(frame => figmaLink[frame]).filter(Boolean)
      ),
    ],
    scales: [figmaLink.scale],
  };
  delete args.destinationPin;
  delete args.puck;
  delete args.scale;
  const iconPromise = loadFigmassets(args);

  const iconsObj = await iconPromise;

  const checkForNames = MAP_ASSET_ICONS.some(icon =>
    Object.keys(iconsObj).includes(icon)
  );

  if (!checkForNames) {
    throw new Error(
      `Icons in frames need to be named ${MAP_ASSET_ICONS.join(
        ', '
      )}. Found ${Object.keys(iconsObj).join(
        ', '
      )}. Please check icon names in your Figma file.`
    );
  }

  const addImagePromises = Promise.all(
    MAP_ASSET_ICONS.filter(id => {
      if (!!iconsObj[id]) {
        return true;
      } else {
        console.warn(`${id} was not found in your Figma file.`);
        return false;
      }
    }).map(name => {
      return new Promise((resolve, reject) => {
        const v = iconsObj[name];
        if (!v) return;
        // We only allow one scale in our config, so there is only one @ key (eg `@1x`)
        const scaleKey = Object.keys(v).find(k => k.includes('@'));
        const url = v[scaleKey];

        if (mapRenderer === 'maplibre-gl') {
          map
            .loadImage(url)
            .then(({ data }) => {
              map.addImage(name, data);
              resolve({ name, url, width: data.width, height: data.height });
            })
            .catch(err => reject(err));
        } else {
          map.loadImage(url, (error, image) => {
            if (error) reject(error);

            map.addImage(name, image);
            resolve({ name, url, width: image.width, height: image.height });
          });
        }
      });
    })
  );

  return addImagePromises;
};

export { addFigmaImages };
