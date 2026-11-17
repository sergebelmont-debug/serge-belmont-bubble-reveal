// Génère les miniatures de la Collection à partir des photos des niveaux.
// Usage : npm run thumbs   (à relancer après l'ajout ou le remplacement d'une photo)
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const SRC = 'public/assets/photos/levels';
const OUT = 'public/assets/photos/thumbnails';
for (const file of fs.readdirSync(SRC)) {
  if (!/\.(webp|jpe?g|png)$/i.test(file)) continue;
  await sharp(path.join(SRC, file)).resize(420, 420, { fit: 'inside' }).toFile(path.join(OUT, file));
  console.log('miniature', file);
}
