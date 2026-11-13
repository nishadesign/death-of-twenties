import { assetUrl } from '../assets';
import type { Station, StationId } from '../simulation/types';
import type { StationStory, StoryImage } from './types';

// Put supplied files in public/stories/ and use assetUrl('/stories/filename.jpg') below.
// A null src is intentional: that specific artwork or photograph is still missing.
// Station names, ordering and geometry continue to come from simulation/venue.ts.
export const STORY_MANIFEST: Partial<Record<StationId, Partial<Omit<StationStory, 'stationId'>>>> = {
  puri: {
    sourceNote: 'Supplied banners, serving guide and party photographs. The “Too Hot to Handle” artwork is an alternate pani puri concept; it is separate from the cocktail with the same themed name.',
    plannedImages: [
      { id: 'puri-banner', src: assetUrl('/stories/puri-banner.png'), alt: 'Black and gold Blast from the Past banner with Boozy Pani Puri lettering, puri and tequila illustrations', caption: 'Blast from the Past · supplied station banner' },
      { id: 'puri-guide', src: assetUrl('/stories/puri-guide.png'), alt: 'Portrait pani puri serving guide with four steps: Crack it, Stuff it, Spike it, Shoot it', caption: 'Pani puri · four-step serving guide' },
      { id: 'puri-alternate-portrait', src: assetUrl('/stories/puri-alternate-portrait.png'), alt: 'Portrait Too Hot to Handle poster for tequila pani puri shots', caption: 'Too Hot to Handle · alternate pani puri concept, portrait' },
      { id: 'puri-alternate-banner', src: assetUrl('/stories/puri-alternate-banner.png'), alt: 'Landscape Too Hot to Handle artwork for tequila pani puri shots', caption: 'Too Hot to Handle · alternate pani puri concept, landscape' },
    ],
    builtImages: [
      { id: 'puri-setup', src: assetUrl('/stories/puri-setup.jpg'), alt: 'Puri on shot glasses arranged on tiered tables, with the portrait serving guide above and candles below', caption: 'Pani puri · the setup and serving guide at the party' },
      { id: 'puri-detail', src: assetUrl('/stories/puri-detail.jpg'), alt: 'Close view of puri balanced on shot glasses, tiered stands and candles under blue and purple lighting', caption: 'Pani puri · shot-glass serving detail' },
      { id: 'puri-food-corner', src: assetUrl('/stories/shared-food-corner.jpg'), alt: 'Shared food corner with the Blast from the Past banner on a monitor and papdi chaat trays in front', caption: 'The shared pani puri and papdi chaat corner' },
    ],
  },
  chaat: {
    builtImages: [
      { id: 'chaat-food-corner', src: assetUrl('/stories/shared-food-corner.jpg'), alt: 'Papdi chaat trays and an It’s Complicated sign in the shared food corner, beneath a monitor showing the pani puri banner', caption: 'It’s Complicated · papdi chaat at the shared food corner' },
    ],
  },
  hummus: {
    sourceNote: 'The planned image is a supplied Halloween dip inspiration screenshot. The host confirmed the hummus setup at the left of the shared table photograph.',
    plannedImages: [
      { id: 'hummus-inspiration', src: assetUrl('/stories/hummus-inspiration.png'), alt: 'Phone screenshot of Halloween dip inspiration, including a carved orange pepper, vegetables and spooky faces', caption: 'Halloween dips · supplied inspiration screenshot' },
    ],
    builtImages: [
      { id: 'hummus-shared-table', src: assetUrl('/stories/shared-table.jpg'), alt: 'Shared party table with hummus and pita at the left, caprese skewers in front and tiered dessert cups', caption: 'Emotional Baggage · hummus and pita at the left of the shared table' },
    ],
  },
  demons: {
    builtImages: [
      { id: 'caprese-shared-table', src: assetUrl('/stories/shared-table.jpg'), alt: 'Caprese skewers in the foreground of the shared table, with dessert cups, candles and red flowers behind', caption: 'Side Eye · caprese at the shared table' },
    ],
  },
  dessert: {
    builtImages: [
      { id: 'dessert-shared-table', src: assetUrl('/stories/shared-table.jpg'), alt: 'Tiered dessert cups with small shovel-shaped spoons and a Love Handles sign, alongside caprese skewers and candles', caption: 'Love Handles · dessert cups at the shared table' },
    ],
  },
  photo: {
    subtitle: 'A mugshot booth, with a change of drapes.',
    intention: 'A mugshot-style photo booth for the Department of Questionable Choices.',
    sourceNote: 'The host supplied the banner, booth sign and eight party photographs, and confirmed the drape revision. The burgundy and black drape moodboards are still missing.',
    plannedImages: [
      { id: 'photo-banner', src: assetUrl('/stories/photo-booth-banner.png'), alt: 'Black and gold Department of Questionable Choices banner with a skull, disco ball, roses and handcuffs', caption: 'Department of Questionable Choices · supplied booth banner' },
      { id: 'photo-sign', src: assetUrl('/stories/photo-booth-sign.png'), alt: 'Portrait Questionable Choices selfie booth sign with a Pick your crime list', caption: 'Pick your crime · supplied selfie booth sign' },
      { id: 'photo-burgundy', src: null, alt: 'Initial mugshot booth moodboard with burgundy drapes', caption: 'Initial concept · burgundy drapes', iteration: 1 },
      { id: 'photo-black', src: null, alt: 'Revised mugshot booth moodboard with black velvet drapes', caption: 'Revised concept · black velvet drapes', iteration: 2 },
    ],
    builtImages: [
      { id: 'photo-1251', src: assetUrl('/stories/photo-booth-1251.jpg'), alt: 'Two guests wearing novelty glasses and holding a police-board prop in a mirrored selfie against the lineup backdrop', caption: 'At the booth · novelty glasses and a lineup-board prop' },
      { id: 'photo-1252', src: assetUrl('/stories/photo-booth-1252.jpg'), alt: 'Another mirrored selfie of two guests with novelty glasses and a police-board prop against the lineup backdrop', caption: 'At the booth · another frame with the lineup-board prop' },
      { id: 'photo-8617', src: assetUrl('/stories/photo-booth-8617.jpg'), alt: 'Three guests holding board props against the photo booth’s lineup backdrop', caption: 'At the booth · three guests and board props' },
      { id: 'photo-8636', src: assetUrl('/stories/photo-booth-8636.jpg'), alt: 'Six guests posing with novelty glasses against the lineup backdrop', caption: 'At the booth · six-guest group portrait' },
      { id: 'photo-8677', src: assetUrl('/stories/photo-booth-8677.jpg'), alt: 'Four guests posing with novelty glasses against the lineup backdrop', caption: 'At the booth · four-guest group portrait' },
      { id: 'photo-dscf0606', src: assetUrl('/stories/photo-booth-dscf0606.jpg'), alt: 'Two seated guests in orange and red costumes at the photo booth', caption: 'At the booth · seated costume portrait' },
      { id: 'photo-dscf0628', src: assetUrl('/stories/photo-booth-dscf0628.jpg'), alt: 'Guests gathered for a photo booth group photograph in a dark room', caption: 'At the booth · group photograph' },
      { id: 'photo-dscf0630', src: assetUrl('/stories/photo-booth-dscf0630.jpg'), alt: 'A close group selfie taken at the photo booth', caption: 'At the booth · group selfie' },
    ],
    iterations: [{
      id: 'photo-drapes', title: 'From burgundy to black',
      prompt: 'Change the drapes to black drapes.',
      description: 'The host’s direction for the revised moodboard: black velvet drapes.',
      imageIds: ['photo-burgundy', 'photo-black'],
    }],
  },
  charades: {},
  bar: {
    plannedImages: [
      { id: 'bar-guide', src: assetUrl('/stories/bar-guide.png'), alt: 'Black and gold The Last Drop cocktail guide with a purple and pink color-changing drink illustration', caption: 'The Last Drop · supplied cocktail guide' },
    ],
    builtImages: [
      { id: 'bar-party', src: assetUrl('/stories/bar-party.jpg'), alt: 'A person behind the cocktail counter with a drink dispenser and cocktail equipment under colorful ceiling lights', caption: 'The cocktail bar at the party' },
    ],
  },
  pizza: {
    subtitle: 'Pizza on the vertical kitchen slab, perpendicular to the drinks extending to its right.',
    sourceNote: 'The host confirmed the name “The Final Supper” and the final slab placement: pizza is on the vertical section, with cocktails on the horizontal section extending to its right. Both face the party area. Concept artwork and party photographs have not yet been supplied.',
  },
};

export const VENUE_REFERENCE: StoryImage = {
  id: 'venue-sketch', src: assetUrl('/venue-sketch.jpeg'),
  alt: 'The host’s original hand-drawn party floor plan',
  caption: 'Original venue sketch · shared spatial reference',
};

export function getStationStory(station: Station): StationStory {
  const content = STORY_MANIFEST[station.id];
  return {
    stationId: station.id,
    plannedImages: [{ id: `${station.id}-planned`, src: null, alt: `${station.name} concept artwork`, caption: 'Concept artwork · not yet supplied' }],
    builtImages: [{ id: `${station.id}-built`, src: null, alt: `${station.name} at the party`, caption: 'Party photograph · not yet supplied' }],
    iterations: [],
    ...content,
  };
}

export function getStoryImages(story: StationStory): StoryImage[] {
  return [...story.plannedImages, ...story.builtImages];
}
