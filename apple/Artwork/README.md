# Apple TV icon artwork

Generated 2026-11-06 with the built-in `image_gen` tool. No API key / CLI fallback was used. The original generated files were copied into this project. Resizing with `sips` only supplies the dimensions required by Xcode; semantic generation/editing used Imagegen.

- `tv-icon.png`: full opaque artwork, also used on the TV menu.
- `tv-icon-background.png`: opaque grid/gradient plate.
- `tv-icon-foreground.png`: transparent block cutout.
- `../Resources/Assets.xcassets/TVBrand.brandassets`: two-layer parallax icon at 400×240 (1×/2×) and 1280×768; top shelf gradient plates.

## Generation prompt

Use case: stylized-concept. Create a polished Apple TV game app icon artwork, wide landscape 5:3 composition, full bleed opaque background, no rounded outer frame. A vivid, playful Tetris battle scene: beautifully stacked glossy square tetromino blocks in cyan, cobalt blue, orange, yellow, lime green, magenta and red, interlocking in a rising energetic arrangement across the lower center, one bright cyan I piece falling above the stack. Evoke the colorful nostalgic Facebook Tetris Battle gameplay, clean premium 3D toy-like beveled translucent blocks with precise square geometry and luminous edges, deep midnight blue / forest green gradient backdrop with very subtle grid. Large readable silhouette at television home screen size, centered subject within middle 70% for Apple TV parallax safe zone, generous negative space near outer edges. Sophisticated game icon, studio lighting, crisp edges, subtle depth and soft shadows. No text, no letters, no logo, no watermark, no controller, no device mockup. Make the whole canvas itself the app icon artwork.

## Background edit prompt

Edit target: attached icon artwork. Create its clean background plate for a layered Apple TV parallax app icon. Remove ALL colored tetromino blocks, including falling cyan I piece, their luminous beams, floor reflections and shadows. Preserve the full-bleed deep midnight blue to forest green gradient and subtle grid background, same wide landscape 5:3 framing and colors. Smooth clean empty dark atmospheric backdrop, opaque, no text, no objects.

## Foreground edit prompt

Edit target: attached icon artwork. Extract only ALL the colorful tetromino blocks, including the falling cyan vertical I piece and all stacked glossy blocks below, as one foreground cutout layer for an Apple TV parallax icon. Preserve their exact positions, geometry, colors, highlights, square faces and original wide 5:3 canvas framing. Remove the entire dark background, grid and floor. All space around and between blocks must be genuinely transparent alpha, not black or checkerboard. No added text or elements. Keep all block silhouettes crisp and faithful.
