# MeaningfulMeet twin characters

The active character system uses soft, pastel SVG creatures inspired by the supplied visual reference. Cloud has lavender leaf ears; Bunny has long peach ears; Cat has short sky-blue triangular ears and whiskers; Fox has taller mint ears and a small tail. Bear adds rounded honey-colored ears and Owl adds rose-colored tufts. Each character has shaded rounded forms, blush cheeks, a light belly, and a friendly face.

## Implementation

`src/components/twin-character/TwinCharacter.tsx` exports `TwinCharacter` (named and default) with `size`, `mood` (`idle`, `working`, or `happy`), `interactive`, `className`, `style`, and `personId` props. Inline SVG keeps the eyes, silhouette, and gradients crisp at both hero and miniature sizes, without an image download. Facial eyes blink independently of the gently breathing body.

`src/lib/twin-styles.ts` exports `TWIN_STYLES`, `TwinStyleId`, and `twinStyleForPerson(id)`. Participant IDs map deterministically to one of the six styles; the default self character is Cloud. Passing `personId` consistently gives the same person the same twin beside their photo, in the network, and in meeting overlays.

`TwinStylePicker` is a reusable, keyboard-accessible radio group with `{value, onChange}`. `useTwinStyle(personId)` returns `[style, setStyle]` and persists the choice under the versioned local key `meaningfulmeet:twin-style:v1:<personId>`. Same-tab and cross-tab views update through an external store. If storage is unavailable, the choice lasts for the current session. This preference is cosmetic and does not modify the server profile.

Gentle breathing and interactive tilt/greeting motion are decorative, not evidence of agent activity. The working indicator is rendered only when the parent passes `mood="working"` from real workflow state. Pointer tilt and greeting are optional, keyboard accessible, and respect reduced motion. Greeting timers are cleared when the component unmounts. For a clickable parent such as a graph node or header button, use `interactive={false}` to avoid nested controls.

## Earlier generated asset

The previous Pearl illustration remains at `public/characters/twin-pearl.png` for existing presentation references. It is not used by the active SVG component. The following record documents that earlier asset; no new bitmap generation is required for the current character system.

Mode: built-in `image_gen` tool. No CLI/API fallback was used. The generated PNG was inspected for style and alpha transparency, then copied into the project; the project never depends on the external generation cache.

Final saved asset: `/Users/alicanacar/Main Ali/projects2026/MeaningfulMeet/public/characters/twin-pearl.png`.

Final generation prompt:

> Use case: stylized-concept. Asset type: transparent character illustration for a premium conference networking web app called MeaningfulMeet. Primary request: create one original charming AI twin companion, named Pearl, as a beautifully designed small 3D porcelain character. Subject: a single softly rounded ivory-white character with a large rounded pebble head, tiny bean-shaped body, two friendly dark graphite oval eyes, a tiny warm smile, little rounded arms and feet; right hand lifted in an understated welcoming wave. A very subtle champagne-beige oval accent at the chest, no symbol or writing. Elegant adult-friendly industrial design, quiet personality, premium collectible ceramic sculpture, friendly but not childish, not an existing branded robot or mascot. Materials: luminous matte porcelain with slight pearl sheen, exceptionally soft ambient shadows, subtle warm sand edge shading and tiny blush at the cheeks. Composition: centered full body, front-facing slight three-quarter angle, entire character and raised hand visible, isolated, compact silhouette that reads clearly at 64px and still beautiful at 240px. The character should fill about 90 percent of the square image area with comfortable transparent margin. Lighting: exquisite soft studio product lighting from upper left, pristine white Apple-like design sensibility, restrained and tactile. Background: genuinely transparent alpha, no white rectangle, no backdrop, no floor plane, no scenery, no shadow outside the character except a barely perceptible small contact shadow. Constraints: one character only, no text, no logos, no watermark, no props, no headset, no antenna, no screen visor, no metallic mechanical joints, no bright colors.
