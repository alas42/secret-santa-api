const http = require('http');

const validNames = ['alexandre', 'sandra', 'jacky', 'madeleine', 'joël', 'nathalie', 'peter', 'alix', 'carole', 'lisa'];
const namesNoLongerValid = [];
const namesToBePicked = ['Alexandre', 'Sandra', 'Jacky', 'Madeleine', 'Joël', 'Nathalie', 'Peter', 'Alix', 'Carole', 'Lisa'];

const ALLOWED_ORIGIN = 'https://alas42.github.io';
const API_KEY = "BisouxEtPaillettes2025!";
const shuffleIndex = 1; // fixed shuffle because server restarts would change it

// Rate limiting setup
const WINDOW_SIZE_MS = 60000;
const MAX_REQUESTS_PER_WINDOW = 5;
const requestLog = new Map();

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

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

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

    if (req.method === 'POST' && req.url === '/register') {
        let body = '';

        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            try {
                const data = JSON.parse(body);

                const code = data.code;
                if (code !== API_KEY) {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Tu ne sais donc pas copier un simple code ?' }));
                    return;
                }

                const santaName = data.santaName;
                if (!santaName) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'On a oublié son propre prénom ?' }));
                    return;
                }

                const santa = String(santaName).toLowerCase();
                if (!validNames.includes(santa) || namesNoLongerValid.includes(santa)) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    if (namesNoLongerValid.includes(santa)) {
                        res.end(JSON.stringify({ message: "T'as déjà joué, qu'est-ce que tu fais encore là ?" }));
                        return;
                    }
                    res.end(JSON.stringify({ message: "Sorry, not included" }));
                    return;
                }
                console.log(`Received request from ${santa}`);
                namesNoLongerValid.push(santa);

                const childPicked = namesToBePicked[(validNames.indexOf(santa) + shuffleIndex) % namesToBePicked.length];

                console.log(`${santaName} offre un cadeau à ${childPicked}`);
                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: `${santaName} offre un cadeau à ${childPicked}` }));
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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
