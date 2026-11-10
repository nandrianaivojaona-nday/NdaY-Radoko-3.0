# Prepared synthetic scenarios

12 synthetic input fixtures — prepared, not tested.

## What these are

- Synthetic `Mother`, `Patient`, and `Encounter` records designed to exercise
  the application's display and completeness logic during a demo.
- Each fixture carries a `clinicalCaveat` and a `synthetic: true` marker.
- Regenerate and validate the fixtures with:

  ```sh
  npm run fixtures:self-check
  npm run fixtures:list
