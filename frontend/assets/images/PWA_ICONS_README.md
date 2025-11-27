# PWA Icons Placeholder

Ovu folder treba da sadrži ikone aplikacije u sledećim veličinama:

## Potrebne ikone:

- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png (za iOS)
- icon-192x192.png (Android)
- icon-384x384.png
- icon-512x512.png (Android splash screen)

## Kako kreirati ikone:

### Opcija 1: Online alati

- https://realfavicongenerator.net/
- https://www.pwabuilder.com/imageGenerator

### Opcija 2: Photoshop/Figma

1. Kreiraj kvadratni logo (1024x1024px)
2. Izvezi u svim potrebnim veličinama
3. Sačuvaj kao PNG sa transparentnom pozadinom

### Opcija 3: ImageMagick (command line)

```bash
# Instaliraj ImageMagick
brew install imagemagick

# Konvertuj postojeći logo u sve veličine
convert logo.png -resize 72x72 icon-72x72.png
convert logo.png -resize 96x96 icon-96x96.png
convert logo.png -resize 128x128 icon-128x128.png
convert logo.png -resize 144x144 icon-144x144.png
convert logo.png -resize 152x152 icon-152x152.png
convert logo.png -resize 192x192 icon-192x192.png
convert logo.png -resize 384x384 icon-384x384.png
convert logo.png -resize 512x512 icon-512x512.png
```

## Privremeno rešenje:

Za testiranje PWA-a bez ikona, možeš koristiti placeholder boju ili jednostavan text logo.

**Važno:** Bez ikona, PWA će raditi ali neće izgledati profesionalno na home screen-u telefona.
