const DB_NAME = 'AZ104_StudyVault_Native_V1';
const STORE_NAME = 'media_library';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
    // Catch the virtual media proxy path
    if (event.request.url.includes('/media-vault-proxy/')) {
        event.respondWith(handleUniversalMediaRequest(event.request));
    }
});

async function handleUniversalMediaRequest(request) {
    try {
        const url = new URL(request.url);
        // Strip query parameters and take the last part of the path as the ID
        const id = url.pathname.split('/').pop().split('?')[0];

        // Open the media database matching services/storage.ts
        const db = await new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, 2);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });

        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const item = await new Promise((resolve, reject) => {
            const req = store.get(id);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });

        if (!item || !item.file) {
            return new Response('Media Segment Not Found', { status: 404 });
        }

        const file = item.file;
        const rangeHeader = request.headers.get('range');
        const contentType = file.type || getMimeType(item.name);

        const commonHeaders = {
            'Content-Type': contentType,
            'Accept-Ranges': 'bytes',
            'Access-Control-Allow-Origin': '*', // Critical for cross-origin preview frames
            'X-Content-Type-Options': 'nosniff',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
        };

        // 1. Initial probe or no range requested
        if (!rangeHeader) {
            return new Response(file, {
                status: 200,
                headers: {
                    ...commonHeaders,
                    'Content-Length': file.size
                }
            });
        }

        // 2. Handle Range Request (Byte-Slicing)
        const rangeMatch = rangeHeader.match(/bytes=(\d+)-(\d+)?/);
        if (!rangeMatch) {
            return new Response('Invalid Range', { status: 416 });
        }

        const start = parseInt(rangeMatch[1], 10);
        const end = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : file.size - 1;

        const chunkStart = Math.max(0, start);
        const chunkEnd = Math.min(end, file.size - 1);
        const chunk = file.slice(chunkStart, chunkEnd + 1);

        // 3. 206 Partial Content - Essential to prevent 'Format Error' (Code 4)
        return new Response(chunk, {
            status: 206,
            statusText: 'Partial Content',
            headers: {
                ...commonHeaders,
                'Content-Range': `bytes ${chunkStart}-${chunkEnd}/${file.size}`,
                'Content-Length': chunk.size
            }
        });
    } catch (err) {
        console.error('[SW Proxy Error]', err);
        return new Response('Media Proxy Fault: ' + err.message, { status: 500 });
    }
}

function getMimeType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const map = {
        'mp4': 'video/mp4',
        'm4a': 'audio/mp4',
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'webm': 'audio/webm',
        'ogg': 'audio/ogg'
    };
    return map[ext] || 'audio/mpeg';
}
