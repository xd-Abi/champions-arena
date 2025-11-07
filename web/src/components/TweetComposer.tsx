import { useState } from 'react';
import '../styles/TweetComposer.css';

interface TweetComposerProps {
  onTweetCreated: () => void;
}

export function TweetComposer({ onTweetCreated }: TweetComposerProps) {
  const [content, setContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isPosting) return;

    setIsPosting(true);
    try {
      const { tweetApi } = await import('../services/api');
      await tweetApi.createTweet(content);
      setContent('');
      onTweetCreated();
    } catch (error) {
      console.error('Failed to post tweet:', error);
      alert('Failed to post tweet. Please try again.');
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="tweet-composer">
      <form onSubmit={handleSubmit}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's happening in football?"
          className="tweet-input"
          maxLength={280}
          disabled={isPosting}
        />
        <div className="tweet-composer-footer">
          <span className="character-count">{content.length}/280</span>
          <button
            type="submit"
            className="tweet-button"
            disabled={!content.trim() || isPosting}
          >
            {isPosting ? 'Posting...' : 'Post'}
          </button>
        </div>
      </form>
    </div>
  );
}
