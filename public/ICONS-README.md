# Openwall Icon Assets

This directory needs the following image files to complete the favicon and app icon setup.

## Required Image Files

Create these PNG files using the Openwall logo with a #2563EB blue background and white logo silhouette:

### Browser Icons
- `favicon-16x16.png` - 16×16px - Small browser tab icon
- `favicon-32x32.png` - 32×32px - Standard browser tab icon
- `favicon.ico` - Multi-size ICO file (16x16, 32x32, 48x48) - Legacy browser support

### Mobile & PWA Icons
- `apple-touch-icon.png` - 180×180px - iOS home screen icon
- `android-chrome-192x192.png` - 192×192px - Android home screen icon
- `android-chrome-512x512.png` - 512×512px - PWA install icon (high-res)

### Windows Tiles
- `mstile-150x150.png` - 150×150px - Windows start menu tile

### Social Media Preview
- `openwall-og.jpg` - 1200×630px - Open Graph image for social media link previews
  - Should include the Openwall logo and tagline
  - Use this for WhatsApp, Facebook, Twitter, LinkedIn previews

## Already Created

✅ `favicon.svg` - SVG favicon (placeholder - replace with actual logo)
✅ `safari-pinned-tab.svg` - Safari pinned tab icon (monochrome)
✅ `site.webmanifest` - Web app manifest file
✅ `browserconfig.xml` - Windows browser configuration

## Design Guidelines

- **Background Color**: #2563EB (Openwall brand blue)
- **Logo Color**: White (#FFFFFF)
- **Logo Style**: Clean, simple icon or "O" mark
- **Padding**: Leave ~10% padding around the logo for breathing room
- **Format**: PNG with transparency where appropriate

## Tools for Generation

You can use these tools to generate favicons:
- [RealFaviconGenerator](https://realfavicongenerator.net/)
- [Favicon.io](https://favicon.io/)
- Figma/Sketch export at required sizes
- ImageMagick for batch conversion

## Testing

After adding the image files:
1. Clear browser cache
2. Visit the site and check browser tab icon
3. Add to home screen on iOS/Android
4. Share a link on WhatsApp/Twitter to verify OG image
5. Use https://realfavicongenerator.net/ to validate all icons
