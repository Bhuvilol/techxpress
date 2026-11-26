# Stage cutouts

Images for the landing scene, written here by `scripts/cutout.mjs` from the
Gemini originals. Don't edit by hand; re-run the script.

## manifest.json

```json
{
  "version": 1,
  "pieces": {
    "birds": {
      "states": ["birds-a.webp", "birds-b.webp"],
      "w": 1200,
      "h": 380
    },
    "train": {
      "states": ["train-a.webp", "train-b.webp"],
      "w": 2400,
      "h": 610,
      "doorAt": 0.47
    },
    "sky": {
      "variants": { "wide": "sky-wide.webp", "tall": "sky-tall.webp" },
      "w": 2048,
      "h": 1152
    }
  }
}
```

- Keys are the piece ids from `src/scene/stage.js` (`PIECES`).
- `states`: one file per drawing (one entry for single-state pieces). `w`/`h`
  are the pixel size of each state file (all states of a piece are the same size).
- `variants` (sky only): separate wide/tall files.
- `doorAt` (train only): centre of the door as a fraction of the image width,
  measured once by eye and set with `--door=0.47`.
- A piece missing from the manifest is drawn as a labelled placeholder card,
  so the stage works before the art exists.

## Source images

Gemini originals go in any folder, named like `03-birds.png` (number, dash,
piece id). Two-state images hold both drawings side by side (or stacked, for
the train); the script splits them.
