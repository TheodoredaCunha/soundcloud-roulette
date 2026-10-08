import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const modes = [
  { id: 'normal', label: 'Normal', description: 'Anything goes' },
  { id: 'underground', label: 'Underground', description: 'Under 10k plays' },
  { id: 'wtf', label: 'WTF', description: 'Under 3k plays' }
];

const genres = [
  'Alternative Rock', 'Ambient', 'Classical', 'Country', 'Dance & EDM',
  'Dancehall', 'Deep House', 'Disco', 'Drum & Bass', 'Dubstep', 'Electronic',
  'Folk & Singer-Songwriter', 'Hip-hop & Rap', 'House', 'Indie', 'Jazz & Blues',
  'Latin', 'Metal', 'Piano', 'Pop', 'R&B & Soul', 'Reggae', 'Rock', 'Soundtrack',
  'Techno', 'Trance', 'Trap', 'World'
];

function App() {
  const [mode, setMode] = useState('normal');
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [track, setTrack] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function roll() {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ mode });
      selectedGenres.forEach(genre => params.append('genre', genre));
      const response = await fetch(`/api/roulette?${params}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Something went wrong');
      setTrack(data.track);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function toggleGenre(genre) {
    setSelectedGenres(current => current.includes(genre)
      ? current.filter(selected => selected !== genre)
      : [...current, genre]
    );
  }

  const embedUrl = track
    ? `https://w.soundcloud.com/player/?url=${encodeURIComponent(track.permalink)}&color=%23ff5500&auto_play=true&hide_related=true&show_comments=false&show_user=true&show_reposts=false`
    : '';

  return (
    <main>
      <section className="hero">
        <div className="eyebrow">SOUNDCLOUD DISCOVERY</div>
        <h1>Roulette<span>.</span></h1>
        <p>Press the button. Find something you weren't looking for.</p>

        <div className="modes">
          {modes.map(m => (
            <button
              key={m.id}
              className={mode === m.id ? 'mode active' : 'mode'}
              onClick={() => setMode(m.id)}
            >
              <strong>{m.label}</strong>
              <small>{m.description}</small>
            </button>
          ))}
        </div>

        <section className="genre-picker" aria-label="Genre selection">
          <div className="genre-picker-heading">
            <span className="genre-label">GENRES</span>
            <span className="genre-count">
              {selectedGenres.length ? `${selectedGenres.length} selected` : 'ANY GENRE'}
            </span>
            {selectedGenres.length > 0 && (
              <button className="genre-clear" onClick={() => setSelectedGenres([])}>
                Clear
              </button>
            )}
          </div>
          <div className="genre-options" role="group" aria-label="Choose genres">
            {genres.map(genre => (
              <button
                key={genre}
                type="button"
                className="genre-chip"
                aria-pressed={selectedGenres.includes(genre)}
                onClick={() => toggleGenre(genre)}
              >
                {genre}
              </button>
            ))}
          </div>
        </section>

        <button className="roll" onClick={roll} disabled={loading}>
          {loading ? 'ROLLING…' : '🎲 ROLL'}
        </button>
      </section>

      {error && <div className="error">{error}</div>}

      {track && (
        <section className="result">
          <div className="info">
            <div className="tag">{track.genre || 'UNKNOWN GENRE'}</div>
            <h2>{track.title}</h2>
            <p className="artist">{track.artist}</p>
            <div className="stats">
              {track.plays != null && <span>{track.plays.toLocaleString()} plays</span>}
            </div>

            <iframe
              title="SoundCloud player"
              width="100%"
              height="166"
              scrolling="no"
              frameBorder="no"
              allow="autoplay"
              src={embedUrl}
            />

            <a className="sc-link" href={track.permalink} target="_blank" rel="noreferrer">
              Open on SoundCloud ↗
            </a>
          </div>
        </section>
      )}

      {!track && !loading && (
        <div className="empty">Your next obsession is one roll away.</div>
      )}
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
