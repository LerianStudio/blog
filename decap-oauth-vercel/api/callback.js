import fetch from 'node-fetch';

export default async function handler(req, res) {
  const { code, state } = req.query;

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const clientId = process.env.OAUTH_CLIENT_ID;
  const clientSecret = process.env.OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'OAuth credentials not configured' });
  }

  if (!code) {
    return res.status(400).json({ error: 'Authorization code not provided' });
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      throw new Error(tokenData.error_description || tokenData.error);
    }

    // Return the exact format Decap CMS expects
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Authorization Complete</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      text-align: center; 
      padding: 50px; 
      background: #f8f9fa;
    }
    .success { color: #28a745; margin-bottom: 20px; }
  </style>
</head>
<body>
  <h1 class="success">✅ Success!</h1>
  <p>Completing authentication...</p>
  <script>
    (function() {
      function receiveMessage(e) {
        console.log("Received message:", e);
      }
      window.addEventListener("message", receiveMessage, false);
      
      // Send message in the format Decap CMS expects
      const data = {
        token: "${tokenData.access_token}",
        provider: "github"
      };
      
      // Try different approaches
      if (window.opener) {
        // Method 1: Direct postMessage (most common)
        window.opener.postMessage(
          "authorization:github:success:" + JSON.stringify(data), 
          "*"
        );
        
        // Method 2: Standard format
        window.opener.postMessage({
          type: "authorization_grant",
          provider: "github", 
          token: "${tokenData.access_token}"
        }, "*");
        
        setTimeout(() => window.close(), 1000);
      } else {
        // Fallback for iframe or other scenarios
        window.parent.postMessage(
          "authorization:github:success:" + JSON.stringify(data), 
          "*"
        );
      }
    })();
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);

  } catch (error) {
    console.error('OAuth error:', error);

    const errorHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Authorization Failed</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      text-align: center; 
      padding: 50px; 
      background: #f8f9fa;
    }
    .error { color: #dc3545; }
  </style>
</head>
<body>
  <h1 class="error">❌ Authorization Failed</h1>
  <p>Error: ${error.message}</p>
  <p>Please close this window and try again.</p>
  <script>
    if (window.opener) {
      window.opener.postMessage(
        "authorization:github:error:" + JSON.stringify({error: "${error.message}"}), 
        "*"
      );
      setTimeout(() => window.close(), 3000);
    }
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.status(500).send(errorHtml);
  }
} 