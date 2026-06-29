const fs = require('fs');
const https = require('https');
const path = require('path');

const destDir = path.join(__dirname, 'frontend', 'public', 'images');

const jars = [
    {
        name: 'product_rosmaninho.jpg',
        url: 'https://images.unsplash.com/photo-1587049352851-8d4e89133924?w=800&h=800&fit=crop&auto=format'
    },
    {
        name: 'product_eucalipto.jpg',
        url: 'https://images.unsplash.com/photo-1654515722385-c684c5331c04?w=800&h=800&fit=crop&auto=format'
    },
    {
        name: 'product_urze.jpg',
        url: 'https://images.unsplash.com/photo-1642067958024-1a2d9f836920?w=800&h=800&fit=crop&auto=format'
    }
];

function download(url, dest) {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                return download(response.headers.location, dest).then(resolve).catch(reject);
            }
            if (response.statusCode !== 200) {
                return reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
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
    for (const jar of jars) {
        console.log(`Downloading ${jar.name}...`);
        try {
            await download(jar.url, path.join(destDir, jar.name));
            console.log(`Saved ${jar.name}`);
        } catch (e) {
            console.error(`Error downloading ${jar.name}:`, e);
        }
    }
}

main().catch(console.error);
