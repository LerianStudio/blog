export default function handler(req, res) {
    const { provider = 'github', scope = 'repo,user:email' } = req.query;

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const clientId = process.env.OAUTH_CLIENT_ID;

    if (!clientId) {
        return res.status(500).json({ error: 'OAuth client ID not configured' });
    }

    // GitHub OAuth URL with expanded scope
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=${encodeURIComponent(scope)}&state=${Date.now()}`;

    // Redirect to GitHub OAuth
    res.redirect(302, authUrl);
} 