import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const destDir = path.join(__dirname, 'frontend', 'public', 'images');

const products = [
    { name: 'product_rosmaninho.jpg', query: 'honey jar lavender' },
    { name: 'product_eucalipto.jpg', query: 'honey jar eucalyptus leaves' },
    { name: 'product_urze.jpg', query: 'dark honey jar' },
    { name: 'product_polen.jpg', query: 'bee pollen' },
    { name: 'product_propolis.jpg', query: 'propolis dropper' },
    { name: 'product_favo.jpg', query: 'honeycomb' },
];

async function fetchImage(query) {
    const res = await fetch(`https://unsplash.com/napi/search/photos?query=${encodeURIComponent(query)}&per_page=10`);
    const data = await res.json();
    if (data.results && data.results.length > 0) {
        const freePhotos = data.results.filter(r => !r.urls.raw.includes('plus.unsplash.com'));
        if (freePhotos.length > 0) {
            return freePhotos[0].urls.raw + '&w=800&h=800&fit=crop&auto=format';
        }
        return data.results[0].urls.raw + '&w=800&h=800&fit=crop&auto=format';
    }
    return null;
}

async function download(url, dest) {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                return download(response.headers.location, dest).then(resolve).catch(reject);
            }
            const file = fs.createWriteStream(dest);
            response.pipe(file);
            file.on('finish', () => {
                file.close(resolve);
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => reject(err));
        });
    });
}

async function main() {
    for (const p of products) {
        console.log(`Searching for ${p.query}...`);
        const url = await fetchImage(p.query);
        if (url) {
            console.log(`Downloading ${p.name} from ${url}`);
            await download(url, path.join(destDir, p.name));
            console.log(`Saved ${p.name}`);
        } else {
            console.log(`No image found for ${p.query}`);
        }
    }
}

main().catch(console.error);
