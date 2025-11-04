import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { TweetComposer } from '../components/TweetComposer';
import { TweetFeed } from '../components/TweetFeed';

export function Home() {
  const { logout } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleTweetCreated = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="home-container">
      <div className="home-header">
        <h1>Champions Arena</h1>
        <button onClick={logout} className="logout-btn">
          Logout
        </button>
      </div>

      <div className="home-content">
        <div className="main-feed">
          <div className="feed-header">
            <h2>Home</h2>
          </div>

          <TweetComposer onTweetCreated={handleTweetCreated} />

          <div className="feed-divider"></div>

          <TweetFeed key={refreshKey} />
        </div>
      </div>
    </div>
  );
}
