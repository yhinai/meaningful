# MeaningfulMeet presentation

Open `/presentation` on the existing Next.js development server (`npm run dev`). The deck has exactly seven slides. All presentation illustrations, identities, scores, graph events, meeting rewards, and magazine content are synthetic and local; no backend or external font/image service is needed after application assets load. No private product state is read and no recording is activated.

- `?slide=4`: open the network replay directly.
- `?slide=7&mode=stage`: start at the closing slide with reduced chrome.
- Arrows, Space, PageUp/PageDown: navigate. Home/End: first/last slide.
- F: fullscreen where supported. P: presenter notes. ?: shortcuts. Esc: dismiss overlays.
- Swipe horizontally on touch devices, or use the seven progress segments.
- Copy the current slide URL with the link button.

Each slide's notes contain its portion of the three-minute script (20, 20, 25, 35, 25, 25, 30 seconds). The graph replay can be paused, resumed, and restarted. It ends at an introduction proposal awaiting human approval. Live-demo links open the existing application in a new tab.

Presentation code is isolated in `src/components/presentation` and `src/app/presentation`. The only shell change bypasses the app chrome on the presentation route. Twin Engine, matching, Find Twin, and OMI modules are unchanged. Sponsor technical roles are shown with explicit unverified/fixture status; no endorsement or track completion is claimed.

Before public presentation, verify any real sponsor integration evidence independently. Keep the illustrative labels when rehearsing with synthetic data.

The visual refresh uses charcoal, ivory, taupe, and champagne accents with two local AI-generated editorial photographs. See `presentation-images.md` for asset provenance and the complete generation prompts. The generated scenes are fictional.
