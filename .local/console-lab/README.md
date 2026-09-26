# SPS Console Lab

Four independent interaction prototypes, published for team feedback at https://schulich-press-start.vercel.app following the user's authorisation on 2026-09-16. They are website concepts, not SPS firmware. The original site remains at https://schulich-press-start-classic.vercel.app.

The latest authorised update publishes the Brick Break rename and revised copy across all four concepts, and makes purple Cartridge the default with its white base and fading 3D grid. The earlier startup-stripe removal and Jonart goatee revision remain intact. The classic site was not changed or redeployed in this update.

Run from the repository root with Node 24: `node .local/console-lab/server.mjs`.
Open http://127.0.0.1:4323/. The reviewed source is tracked in Git through an explicit allowlist; only the approved compiled artifact is uploaded to Vercel.

The 2026-09-25 GitHub checkpoint includes the source files, npm lockfile, two model stills in `media/` and four public menu previews in `screenshots/`. Dependencies, caches, build and deployment output, private records and other screenshots remain ignored. After cloning, run `npm ci` in the repository root, `npm ci --prefix .local/console-lab`, then `npm run assets`. No private review folder or Vercel login is needed to build or run the comparison.

- Signal: http://127.0.0.1:4323/signal/
- Playroom: http://127.0.0.1:4323/playroom/
- Cartridge Club: http://127.0.0.1:4323/cartridge/
- Pocket OS: http://127.0.0.1:4323/pocket/

## Pocket OS

Pocket OS is the fourth concept, published at https://schulich-press-start.vercel.app/pocket/ after explicit approval on 2026-09-16. Both local and public launchers include it as a native link, and every settings switcher includes all four concepts. The main alias was updated; the original site's classic alias was preserved.

The actual handheld becomes the website interface: a six-program LCD menu, member portraits and division views on the existing screen surface, a finite close-up camera move, and full native panels for readable details. Source D-pad, round-button and pill-button surfaces are raycast using positions measured from the supplied model; keyboard input and the native dock provide equivalent navigation. No CAD vertices, original images or member likenesses are changed. Both lower pills remain black under shell recolouring. The scan icon switches to the actual surface triangles with the illustrative display hidden; it does not invent internal hardware or an assembly sequence.

The visual system uses ice `#e4f1f3`, paper `#f8fbfa`, ink `#223a43`, muted blue-grey `#506670`, red `#b53045` and the existing purple shell `#784ac3`. Kufam carries the compact brand heading; Commissioner carries navigation and the LCD. The full-width stage is separate from its tool row and native program dock. A directional studio shadow and finite camera actions ground the product. An original quiet sine-based score starts with Press start, with mute, volume and hidden-tab suspension retained. The no-JavaScript fallback includes a factual club introduction and native original-site and Join links.

Run just its checks with `SPS_LAB_THEME=pocket node .local/console-lab/verify.mjs`. Seven Pocket scenarios passed: Chromium desktop, tablet, phone and 320px phone; WebKit phone; and normal-motion camera/audio checks in both engines. Verification includes actual D-pad/action/pill/LCD clicks, changing canvas pixels, correct member-profile selection, CAD mode, shell colours, audio samples, reduced-motion interruption, no-JavaScript fallback, focus, axe and overflow. Final screenshots were inspected at desktop, tablet and phone sizes. All four local concepts passed 24 scenarios through the shared suite.

Further directions remain proposals, not implemented work: higher-quality offline studio renders with baked lighting for lighter first-load visuals, and a more tactile Cartridge Club treatment with original printed labels and carefully lit interface-only props. An exploded internal assembly would require real assembly CAD; the supplied export is an enclosure/control surface model.

Each starts at its own power-on screen. Sound is enabled by default and begins with Press start, respecting the browser's interaction requirement. Each concept has its own quiet, original synthesized background score: spacious pads for Signal, soft plucked notes for Playroom, warm keys for Cartridge Club and a sine-based score for Pocket. No music file is downloaded. Mute is available on the boot screen and toolbar; settings includes a volume slider. Muting, rebooting or hiding the tab suspends audio and clears scheduled voices. Returning to a visible, unmuted console resumes its theme.

Use the settings icon to switch concepts, toggle animation/sound or enter fullscreen. The power icon returns to startup. Arrow keys navigate categories/channels/cartridges, Enter opens the selected command, and Escape closes a program. Native buttons and touch work as well. Model dragging and shell colours are functional. Brick Break is a Matter.js browser demo with pause/restart and pointer, arrow-key and touch controls, not an SPS game release. No gamepad-controller integration is claimed.

The published wording uses Brick Break consistently in menus, both Playroom channel pages, the game overlay, accessible labels, cartridge artwork and Pocket's LCD. Navigation uses the category Arcade; the open game retains the notice "Browser demo, not an SPS release." Shared team, division and recruitment copy uses direct wording such as "Meet the team" and "Build with us." Playroom's heading is "A place to build and play." Club facts, game mechanics and portraits are unchanged. The classic pages do not include this demo.

Cartridge Club's Load cartridge action lifts the selected cartridge, aligns it with the actual handheld's top edge and slides it into the console before opening the program. Closing the program ejects the cartridge. Escape or the reset icon cancels an in-progress movement; reduced motion makes insertion and ejection immediate. The sequence is an interface metaphor, not a claim that this CAD model has a cartridge connector. No slot, port or other CAD geometry is added.

Both lower pill buttons remain black in all four concepts and their model inspector, regardless of shell colour. The supplied `defaultplastic` mesh contains the rear panel plus both buttons: render groups assign its 46 rear-panel triangles to the shell and its 776 lower-button triangles to black, with positions, normals and indices unchanged. All five portraits use theme-specific CSS backgrounds; approved image pixels are untouched.

The original website's layout and package files are retained under the classic address, with the same approved portrait revisions as the comparison. This directory has a separate npm lockfile for Lucide and Matter.js; Three.js, Vite and test tools are reused from the existing workspace. On another machine, run `npm ci` in the main project and `npm ci --prefix .local/console-lab`, then `npm run assets` before starting the lab. A no-JavaScript page links to the original website; the experimental console itself requires JavaScript.

The lab serves its own refreshed overview and control stills from `media/`. To regenerate them with the local server running, use `node .local/console-lab/render-model.mjs`. Original Astro image files are not overwritten. The verification script refreshes menu screenshots. For Cartridge's public thumbnail, use `publish-screenshots/built-cartridge-chromium-desktop.png` as `screenshots/cartridge-chromium-desktop.png` before the final build, so development swatches do not appear in the image.

## Cartridge Backgrounds

The purple variant was selected for publication on 2026-09-16. Pink and white remain local alternatives:

- Purple default: http://127.0.0.1:4323/cartridge/
- SPS purple: http://127.0.0.1:4323/cartridge/?finish=purple
- White grid: http://127.0.0.1:4323/cartridge/?finish=white-grid
- Original pink: http://127.0.0.1:4323/cartridge/?finish=pink

The purple design uses exact brand-board `#784ac3`, the supplied white logo, white type and contrasting controls. The local white study keeps a pure `#ffffff` background. Both use a real Three.js ground plane behind the workbench. Purple also retains the white gridded platform beneath the handheld; the white-background study keeps the open plane without a bounded mat. Antialiased background lines follow the scene perspective and fade smoothly with ground-plane distance from the camera, disappearing before the plane's edge. Only the background grid fades; the white platform, handheld, cartridges and their shadows remain solid. Both keep the existing CAD geometry, black pill buttons, approved artwork, cartridge animation and audio. Local-only footer swatches link between these alternatives.

The grid is a single transparent 200x200 presentation plane, with 0.25/1.25 scene-unit line spacing and a smooth distance fade from 11 to 32 scene units. These are renderer coordinates, not hardware dimensions. Purple line opacity is capped at 0.11 to preserve white-text contrast; white uses gray lines at 0.30. On phone/tablet, one full-page canvas uses a camera view offset aligned to the existing device area, keeping the model's size, position and click targets while continuing the grid beneath the lower page. The white startup retains its lightweight static grid until activation; no extra renderer, early Three.js download or continuous idle render loop is added. Cartridge's previously removed diagonal startup stripe stays absent.

Purple is static-first in the Cartridge HTML and shared finish stylesheet, so its initial page and no-JavaScript fallback use the correct color. White-grid and pink query overrides remain development-only. White styles and swatch controls live in `cartridge/local-finishes.css`, which is dynamically imported only in development and excluded from the public artifact. The live page always uses purple, even with local finish query parameters. Finish-specific screenshots and reports keep their separate prefixes.

Run `SPS_LAB_FINISH=purple node .local/console-lab/verify.mjs` or `SPS_LAB_FINISH=white-grid node .local/console-lab/verify.mjs`. Both passed seven scenarios: Chromium desktop, tablet, phone and 320px phone; WebKit phone; and animated cartridge/audio checks in both engines. Checks measure real WebGL grid pixels and lower opacity in the distance, full-page coverage, mobile object bounds, calculated white-text contrast, idle frame stability and camera-projected cartridge clicks. Existing checks cover approved portraits, insertion/ejection, colour controls, mute, keyboard focus and reduced motion. Desktop, tablet and phone screenshots were inspected.

## Verification

With the server running: `node .local/console-lab/verify.mjs`.

Twenty-four scenarios passed: all four concepts on Chromium at 1440x900, 768x1024, 390x844 and 320x568, plus WebKit at 390x844, and animated Cartridge/Pocket audio scenarios in each engine. The suite checks boot, default-on audio and real audio samples, bounded voice counts, mute cleanup/volume, distinct portrait palettes, source-buffer preservation and actual black-button pixels after shell recolouring. It also checks program navigation, roster selection, application URLs without submission, game pause, settings/focus return, rebooting, axe accessibility and private-path rejection. Animated insertion/ejection, cancellation, duplicate activation, reduced motion and simulated hidden-tab audio suspension/resumption are covered. Pocket-specific checks are described above. Screenshots and the generated report are local files in this directory.

The original website's check, 14 unit tests, build and 83 browser tests passed, with nine intentional skips and one browser worker. Both local background variants passed another seven scenarios each with Jonart's new portrait. No physical phone, gamepad or screen-reader user study was performed.

Cartridge Club's stacked headline was corrected from line-height 0.98 to 1.2 after reproducing about 4.7 pixels of actual glyph overlap. Both engines passed eight-width checks from 320 to 1920 pixels. The compiled/live suite now checks glyph ink separation and adjacent-section bounds, and the public comparison thumbnail was regenerated.

## Public Build

Run `node .local/console-lab/build.mjs` then `node .local/console-lab/verify-publish.mjs` from the workspace root. The build disables environment-file loading, bundles six explicit HTML entry points, maps original-site links to the classic HTTPS address, copies an explicit asset list and emits `publish/.vercel/output/`. `publish-manifest.json` records every static file and hash. Sixteen compiled scenarios passed both locally under production CSP and on the live site, plus live Pocket controls/camera and Cartridge insertion/ejection on desktop and phone.

The latest Vercel upload contains 44 static files plus routing configuration, 2,418,551 bytes. Paths, sizes and hashes were checked against the CLI's dry-run manifest. No source files, local env/auth data, raw documents, source photographs, logs or source maps are included. Four menu screenshots become compressed comparison thumbnails. All required third-party licences are served alongside the build. Sixteen compiled/live scenarios verify the purple default, white platform and horizon fade, Brick Break labels, missing Cartridge stripe and exact Jonart PNG bytes.

Deployment BZ1iQHJdvTaq81YTsDjqL26eQgwB is the active comparison. Classic deployment 8qCh6xBjVXjYcUvbZQrGUt1by341 is unchanged, with identical Home and Join hashes before and after this main-only update. Previous deployments remain available. Always deploy this build with `--prebuilt --prod --skip-domain` from `publish`, then assign only the main alias. Ordinary production deployment can reassign both main and classic domains. Full commands and rollback guidance are in the workspace's deployment documentation. No Git integration or commit was made.

## Directions

- Signal: a cinematic cross-media console. Graphite #19171e, silver #edf3ef, mint #bcebd2, SPS purple #784ac3, amber #ffc765. Light Commissioner and Kufam, left-aligned category rail with a full-bleed lit handheld. One camera-driven entrance, deliberate category transitions.
- Playroom: tactile, friendly channels. White #fbfcfd, blue #3f76a0, peach #f4aa89, mint #b8dec4, purple #784ac3. Kufam channel names and Commissioner metadata. Centered television-channel matrix, approved headshots, program launch transitions.
- Cartridge Club: physical objects become navigation. SPS purple #784ac3, white #ffffff, deep purple #322148, yellow #f8ca5b and orange #ffa053. A white gridded platform sits within a fading 3D ground grid; the actual handheld and interface-only cartridges provide navigation. Cartridges represent website sections, not proposed device specifications.

The concepts differ in navigation and spatial composition, not only palette. Existing site code, approved source assets and roster remain unchanged. The comparison is now the main feedback destination, with the original site kept separately. No console brand assets, copyrighted startup audio, real-person likeness generation or invented SPS games are used.

## Reference Research

Read on 2026-09-16 for interaction principles only:

- https://en.wikipedia.org/wiki/XrossMediaBar: horizontal categories and vertical commands, preserving selection through navigation.
- https://en.wikipedia.org/wiki/Wii_system_software#User_interface: self-contained channels and the ability to return to a home menu.
- https://en.wikipedia.org/wiki/Xbox_system_software#User_interface: category-coloured blades and contextual dashboard transitions.

No reference text, screenshots, icons, music or console logos are copied. Interface sounds and background themes are original Web Audio synthesis, enabled by default after the user's first Press start. The loading indicator reflects actual asset preparation. Reduced motion and a route back to the existing website remain available.