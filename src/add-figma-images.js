import { loadFigmassets } from 'figmasset';
import { config as configStore } from './stores';

const MAP_ASSET_ICONS = ['destination-pin', 'puck'];

let figmaLink;
configStore.subscribe(value => ({ figmaLink } = value));

const addFigmaImages = async map => {
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
    MAP_ASSET_ICONS.map(name => {
      return new Promise((resolve, reject) => {
        const v = iconsObj[name];
        if (!v) return;
        // We only allow one scale in our config, so there is only one @ key (eg `@1x`)
        const scaleKey = Object.keys(v).find(k => k.includes('@'));
        const url = v[scaleKey];

        map.loadImage(url, (error, image) => {
          if (error) reject(error);

          map.addImage(name, image);
          resolve(name);
        });
      });
    })
  );

  return addImagePromises;
};

export { addFigmaImages };
