const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());

app.get('/api/terabox', async (req, res) => {
  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  try {
    const response = await fetch(targetUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    
    const regex = /"url":"(https:[^"]+\.mp4[^"]*)"/;
    const match = html.match(regex);

    if (match && match[1]) {
      const realLink = match[1].replace(/\\u002F/g, '/');
      return res.json({ direct: realLink });
    } else {
      return res.status(404).json({ error: 'MP4 link not found in the response' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
