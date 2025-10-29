const http = require('http');
const crypto = require('crypto');

const validNames = ['Wricha', 'Aurore', 'Vico', 'Donovan', 'Etienne', 'Flora', 'Corentin', 'Chloé'];

const ALLOWED_ORIGIN = 'https://alas42.github.io'; // Replace with your actual allowed origin
const API_KEY = crypto.randomBytes(6).toString('hex'); // Generate a random API key
console.log('Your API key is:', API_KEY); // This will be logged when the server starts

// Rate limiting setup
const WINDOW_SIZE_MS = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5;
const requestLog = new Map(); // Store IP addresses and their request timestamps

// Rate limiting function
function isRateLimited(ip) {
    const now = Date.now();
    const windowStart = now - WINDOW_SIZE_MS;

    if (!requestLog.has(ip)) {
        requestLog.set(ip, [now]);
        return false;
    }

    const requests = requestLog.get(ip);
    const recentRequests = requests.filter(time => time > windowStart);

    // Clean up old requests
    requestLog.set(ip, recentRequests);

    if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
        return true;
    }

    recentRequests.push(now);
    requestLog.set(ip, recentRequests);
    return false;
}

const server = http.createServer((req, res) => {
    const origin = req.headers.origin;
    const clientIp = req.socket.remoteAddress;

    // Check if the request is coming from the allowed origin
    if (origin !== ALLOWED_ORIGIN) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized origin' }));
        return;
    }

    // Check API key
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== API_KEY) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid API key' }));
        return;
    }

    // Check rate limit
    if (isRateLimited(clientIp)) {
        res.writeHead(429, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Too many requests. Please try again later.' }));
        return;
    }

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.method === 'POST' && req.url === '/register') {
        let body = '';

        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const santa = data.santa;
                const code = data.code;

                if (!santa || !validNames.includes(santa) || code !== API_KEY) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: "Ptdr t'es qui ?" }));
                    return;
                }

                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Votre enregistrement a été effectué' }));
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid request format' }));
            }
        });
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
    }
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});