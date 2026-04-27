import sharp from 'sharp';
import { mkdir } from 'fs/promises';

const createIcon = async (size, outputPath) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
    <defs>
      <radialGradient id="nucGrad" cx="30%" cy="30%" r="70%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="50%" stop-color="#818cf8"/>
        <stop offset="100%" stop-color="#4f46e5"/>
      </radialGradient>
      <radialGradient id="elecGrad" cx="30%" cy="30%" r="70%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="50%" stop-color="#22d3ee"/>
        <stop offset="100%" stop-color="#0891b2"/>
      </radialGradient>
    </defs>
    <rect width="${size}" height="${size}" fill="#000000" rx="${size * 0.15}"/>
    <g transform="translate(${size/2}, ${size/2})">
      <ellipse rx="${size * 0.4}" ry="${size * 0.12}" fill="none" stroke="#6366f1" stroke-width="${size * 0.01}" opacity="0.4"/>
      <ellipse rx="${size * 0.4}" ry="${size * 0.12}" fill="none" stroke="#818cf8" stroke-width="${size * 0.01}" opacity="0.3" transform="rotate(60)"/>
      <ellipse rx="${size * 0.4}" ry="${size * 0.12}" fill="none" stroke="#6366f1" stroke-width="${size * 0.01}" opacity="0.4" transform="rotate(120)"/>
      <circle cx="${size * 0.4}" cy="0" r="${size * 0.03}" fill="url(#elecGrad)"/>
      <circle cx="${-size * 0.4}" cy="0" r="${size * 0.03}" fill="url(#elecGrad)"/>
      <circle cx="${size * 0.2}" cy="${-size * 0.35}" r="${size * 0.03}" fill="url(#elecGrad)"/>
      <circle cx="${size * 0.2}" cy="${size * 0.35}" r="${size * 0.03}" fill="url(#elecGrad)"/>
      <circle cx="0" cy="0" r="${size * 0.08}" fill="url(#nucGrad)"/>
    </g>
  </svg>`;

  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(outputPath);
  
  console.log(`Created ${outputPath}`);
};

const main = async () => {
  await mkdir('./icons', { recursive: true });
  await createIcon(192, './icons/icon-192x192.png');
  await createIcon(512, './icons/icon-512x512.png');
  console.log('Icons generated successfully!');
};

main().catch(console.error);