# Station story assets

Put supplied concept artwork, pamphlets, moodboards, banners and event photographs in this folder. These files are served beneath the configured deployment base at `stories/<filename>`.

Edit `src/stories/manifest.ts` to connect them. Its keys are the existing station IDs:

- `puri`
- `chaat`
- `hummus`
- `demons`
- `dessert`
- `photo`
- `charades`
- `bar`
- `pizza` — The Final Supper

## Included assets

These 21 files are byte-for-byte copies of the host’s supplied images (58,244,327 bytes in total). The originals remain unchanged in Downloads. File names below are relative to this folder; the app uses `assetUrl('/stories/<filename>')`. No resizing, cropping, recompression or generative edits were applied. Large originals, including the hummus screenshot, load lazily in story cards.

| App file | Supplied original | Story and role |
| --- | --- | --- |
| `puri-banner.png` | `Blast From the Past_ Boozy Pani Puri(2).png` | Puri · Planned banner |
| `puri-guide.png` | `Screenshot 2026-10-29 at 12.54.56 PM.png` | Puri · Planned serving guide |
| `puri-alternate-portrait.png` | `Too Hot to Handle_ Tequila Pani Puri.png` | Puri · alternate concept, portrait |
| `puri-alternate-banner.png` | `Too Hot to Handle_ Tequila Pani Puri(1).png` | Puri · alternate concept, landscape |
| `puri-detail.jpg` | `IMG_1223.JPG` | Puri · Built detail |
| `puri-setup.jpg` | `IMG_1224.JPG` | Puri · Built setup |
| `shared-food-corner.jpg` | `IMG_1227.JPG` | Puri and chaat · Built, one shared file |
| `hummus-inspiration.png` | `IMG_1210.PNG` | Hummus · Planned inspiration screenshot |
| `shared-table.jpg` | `IMG_1231.JPG` | Hummus, caprese and dessert · Built, one shared file |
| `bar-guide.png` | `The Last Drop Cocktail Guide(1).png` | Bar · Planned guide |
| `bar-party.jpg` | `IMG_1230.JPG` | Bar · Built photograph |
| `photo-booth-banner.png` | `Department of Questionable Choices(1).png` | Photo booth · Planned banner |
| `photo-booth-sign.png` | `Questionable Choices Selfie Booth Sign (1).png` | Photo booth · Planned sign |
| `photo-booth-1251.jpg` | `IMG_1251.JPG` | Photo booth · Built photograph |
| `photo-booth-1252.jpg` | `IMG_1252.JPG` | Photo booth · Built photograph |
| `photo-booth-8617.jpg` | `IMG_8617.JPG` | Photo booth · Built photograph |
| `photo-booth-8636.jpg` | `IMG_8636.JPG` | Photo booth · Built photograph |
| `photo-booth-8677.jpg` | `IMG_8677.JPG` | Photo booth · Built photograph |
| `photo-booth-dscf0606.jpg` | `DSCF0606.JPG` | Photo booth · Built photograph, confirmed by host |
| `photo-booth-dscf0628.jpg` | `DSCF0628.JPG` | Photo booth · Built photograph, confirmed by host |
| `photo-booth-dscf0630.jpg` | `DSCF0630.JPG` | Photo booth · Built photograph, confirmed by host |

`IMG_1230 2.JPG` is byte-identical to `IMG_1230.JPG`; only one bar photo is included. The screenshot filename has a narrow nonbreaking space (U+202F) before `PM`.

The host explicitly confirmed the shared table photograph for hummus as well as caprese and dessert. The physical caprese sign in that photograph uses “Inner Demons”; the current app name remains **Side Eye**. The two “Too Hot to Handle” concepts show pani puri, not the bar’s similarly named spicy margarita. They are alternate supplied artwork, with no inferred revision order. The hummus screenshot is inspiration, not host-created artwork or an event photo.

Separate planned artwork is still missing for chaat, caprese and dessert. Both planned and built images remain missing for charades and pizza. The booth’s burgundy/black drape moodboards are still missing; its supplied banner and sign do not replace those historical references.

## Manifest workflow

Each entry can have a different number of `plannedImages` and `builtImages`. An image needs a unique `id`, a `src` path (or `null` while missing) and descriptive `alt` text. It can also have a short `caption` and an `iteration` number. Each sequence initially shows the first available image in manifest order; if every image is missing it shows the last placeholder. Numbered controls keep every entry accessible. Empty arrays still display labeled missing-image cards. Broken image URLs display an unavailable-image state.

Example structure, to fill with supplied files and verified captions:

```ts
puri: {
  plannedImages: [{
    id: 'puri-concept',
    src: assetUrl('/stories/puri-concept.jpg'),
    alt: 'Describe the supplied concept image',
    caption: 'Caption supported by the image or host’s notes',
  }],
  builtImages: [{
    id: 'puri-party',
    src: '/stories/puri-party.jpg',
    alt: 'Describe the supplied photograph',
  }],
}
```

The paths above illustrate the structure; those files are not included. Prefer optimized JPEG/WebP photographs. Images use `object-fit: contain` so pamphlets and banners are not cropped.

Only add `intention`, `iterations`, and `reflection` when supported by supplied material. Iterations refer to image IDs from that station’s planned/built arrays. `prompt` is displayed as a quoted human direction; copy only documented wording. The photo-booth drape direction currently included comes from the host’s feature request; its two moodboard placeholders remain separate from the supplied banner, sign and eight photographs.

To enable the optional before/after reveal, explicitly set:

```ts
comparison: { plannedId: 'puri-concept', builtId: 'puri-party' }
```

Only do this for images with comparable compositions. Both images must have sources; unrelated planned/built images retain ordinary side-by-side or stacked cards. Large cards and process thumbnails open the full-screen image viewer, which supports arrow keys and Escape.

The original `/venue-sketch.jpeg` is available as a shared spatial reference in every story. It is not presented as AI concept artwork or a party photograph. The archive contains only supplied images and documented host direction.
