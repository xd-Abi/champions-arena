import { useEffect, useState } from 'react';
import { TweetCard } from './TweetCard';
import type { Tweet } from '../services/api';
import '../styles/TweetFeed.css';

export function TweetFeed() {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTweets = async () => {
    try {
      setError(null);
      const { tweetApi } = await import('../services/api');
      const data = await tweetApi.getFeed(0, 50);
      setTweets(data);
    } catch (err) {
      console.error('Failed to load tweets:', err);
      setError('Failed to load tweets. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTweets();
  }, []);

  if (isLoading) {
    return (
      <div className="feed-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="feed-error">
        <p>{error}</p>
        <button onClick={loadTweets} className="retry-button">
          Try Again
        </button>
      </div>
    );
  }

  if (tweets.length === 0) {
    return (
      <div className="feed-empty">
        <p>No tweets yet. Be the first to post!</p>
      </div>
    );
  }

  return (
    <div className="tweet-feed">
      {tweets.map((tweet) => (
        <TweetCard
          key={tweet.id}
          tweet={tweet}
          onTweetDeleted={loadTweets}
          onTweetLiked={loadTweets}
          currentUserId={tweet.authorId} // This would come from auth context in production
        />
      ))}
    </div>
  );
}
