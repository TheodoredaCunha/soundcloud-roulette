import 'dotenv/config';
import express from 'express';

const app = express();
const PORT = process.env.PORT || 3001;
let tokenCache = { accessToken: null, expiresAt: 0 };

async function getToken() {
  if (tokenCache.accessToken && Date.now() < tokenCache.expiresAt) return tokenCache.accessToken;
  const basic = Buffer.from(
    `${process.env.SOUNDCLOUD_CLIENT_ID}:${process.env.SOUNDCLOUD_CLIENT_SECRET}`
  ).toString('base64');

  const response = await fetch('https://secure.soundcloud.com/oauth/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  if (!response.ok) throw new Error(`Token request failed: ${response.status}`);
  const data = await response.json();
  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000
  };
  return tokenCache.accessToken;
}

async function soundcloud(path, params = {}) {
  const token = await getToken();
  const url = new URL(`https://api.soundcloud.com${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') url.searchParams.set(key, value);
  });

  const response = await fetch(url, {
    headers: { Authorization: `OAuth ${token}`, Accept: 'application/json; charset=utf-8' }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`SoundCloud ${response.status}: ${body}`);
  }
  return response.json();
}

// Roulette deliberately searches broad terms rather than pretending the API has a
// magical "random track" endpoint.
const SEARCH_TERMS = [
  'electronic', 'ambient', 'house', 'techno', 'indie', 'experimental',
  'hip hop', 'jazz', 'breakbeat', 'drum and bass', 'dream pop', 'garage'
];
const GENRES = [
  'Alternative Rock', 'Ambient', 'Classical', 'Country', 'Dance & EDM',
  'Dancehall', 'Deep House', 'Disco', 'Drum & Bass', 'Dubstep', 'Electronic',
  'Folk & Singer-Songwriter', 'Hip-hop & Rap', 'House', 'Indie', 'Jazz & Blues',
  'Latin', 'Metal', 'Piano', 'Pop', 'R&B & Soul', 'Reggae', 'Rock', 'Soundtrack',
  'Techno', 'Trance', 'Trap', 'World'
];

app.get('/api/roulette', async (req, res) => {
  try {
    const mode = req.query.mode || 'normal';
    const requestedGenres = (Array.isArray(req.query.genre) ? req.query.genre : [req.query.genre])
      .filter(genre => typeof genre === 'string' && GENRES.includes(genre));
    const term = SEARCH_TERMS[Math.floor(Math.random() * SEARCH_TERMS.length)];

    const params = {
      q: term,
      genres: requestedGenres.length ? requestedGenres.join(',') : undefined,
      access: 'playable',
      limit: 50,
      linked_partitioning: 'true'
    };

    const data = await soundcloud('/tracks', params);
    let tracks = (data.collection || []).filter(t => t.permalink_url);

    // Discovery weighting only; no audio is downloaded or analyzed.
    if (mode === 'underground') {
      tracks = tracks.filter(t => (t.playback_count ?? 0) < 10000);
    } else if (mode === 'wtf') {
      tracks = tracks.filter(t => (t.playback_count ?? 0) < 3000);
    }

    if (!tracks.length) {
      return res.status(404).json({ error: 'No tracks found. Roll again.' });
    }

    const track = tracks[Math.floor(Math.random() * tracks.length)];

    res.json({
      track: {
        id: track.id,
        title: track.title,
        artist: track.user?.username ?? 'Unknown artist',
        artwork: track.artwork_url || track.user?.avatar_url || null,
        permalink: track.permalink_url,
        plays: track.playback_count ?? null,
        genre: track.genre || null,
        duration: track.duration ?? null
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'SoundCloud request failed.' });
  }
});

app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
