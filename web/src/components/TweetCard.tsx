import { useState } from 'react';
import type { Tweet } from '../services/api';
import { UserAvatar, UserName } from './UserInfo';
import '../styles/TweetCard.css';

interface TweetCardProps {
  tweet: Tweet;
  onTweetDeleted: () => void;
  onTweetLiked: () => void;
  currentUserId?: string;
}

export function TweetCard({ tweet, onTweetDeleted, onTweetLiked, currentUserId }: TweetCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentContent, setCommentContent] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  const isLiked = currentUserId ? tweet.likes.includes(currentUserId) : false;
  const isAuthor = currentUserId === tweet.authorId;

  const handleLike = async () => {
    try {
      const { tweetApi } = await import('../services/api');
      if (isLiked) {
        await tweetApi.unlikeTweet(tweet.id);
      } else {
        await tweetApi.likeTweet(tweet.id);
      }
      onTweetLiked();
    } catch (error) {
      console.error('Failed to like tweet:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this tweet?')) return;

    setIsDeleting(true);
    try {
      const { tweetApi } = await import('../services/api');
      await tweetApi.deleteTweet(tweet.id);
      onTweetDeleted();
    } catch (error) {
      console.error('Failed to delete tweet:', error);
      alert('Failed to delete tweet. Please try again.');
      setIsDeleting(false);
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim() || isCommenting) return;

    setIsCommenting(true);
    try {
      const { tweetApi } = await import('../services/api');
      await tweetApi.createComment(tweet.id, commentContent);
      setCommentContent('');
      onTweetLiked(); // Refresh to get new comments
    } catch (error) {
      console.error('Failed to post comment:', error);
      alert('Failed to post comment. Please try again.');
    } finally {
      setIsCommenting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    setDeletingCommentId(commentId);
    try {
      const { tweetApi } = await import('../services/api');
      await tweetApi.deleteComment(tweet.id, commentId);
      onTweetLiked(); // Refresh to update comments
    } catch (error) {
      console.error('Failed to delete comment:', error);
      alert('Failed to delete comment. Please try again.');
    } finally {
      setDeletingCommentId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };

  return (
    <div className="tweet-card">
      <div className="tweet-header">
        <div className="tweet-author">
          <UserAvatar userId={tweet.authorId} size="medium" className="author-avatar" />
          <UserName userId={tweet.authorId} className="author-name" />
          <span className="tweet-time">{formatDate(tweet.createdAt)}</span>
        </div>
        {isAuthor && (
          <button
            onClick={handleDelete}
            className="delete-button"
            disabled={isDeleting}
          >
            {isDeleting ? '...' : '×'}
          </button>
        )}
      </div>

      <div className="tweet-content">{tweet.content}</div>

      <div className="tweet-actions">
        <button
          onClick={() => setShowComments(!showComments)}
          className="action-button"
        >
          <svg viewBox="0 0 24 24" className="action-icon">
            <path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 3.37 2.77 6.08 6.138 6.01l.351-.01h1.761v2.3l5.087-2.81c1.951-1.08 3.163-3.13 3.163-5.36 0-3.39-2.744-6.13-6.129-6.13H9.756z" fill="currentColor"/>
          </svg>
          <span>{tweet.comments.length}</span>
        </button>

        <button onClick={handleLike} className={`action-button ${isLiked ? 'liked' : ''}`}>
          <svg viewBox="0 0 24 24" className="action-icon">
            <path d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91zm4.187 7.69c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z" fill="currentColor"/>
          </svg>
          <span>{tweet.likes.length}</span>
        </button>
      </div>

      {showComments && (
        <div className="comments-section">
          <form onSubmit={handleComment} className="comment-form">
            <input
              type="text"
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              placeholder="Post your reply"
              className="comment-input"
              disabled={isCommenting}
            />
            <button
              type="submit"
              className="comment-button"
              disabled={!commentContent.trim() || isCommenting}
            >
              Reply
            </button>
          </form>

          <div className="comments-list">
            {tweet.comments.map((comment) => {
              const isCommentAuthor = currentUserId === comment.authorId;
              const isDeletingThisComment = deletingCommentId === comment.id;

              return (
                <div key={comment.id} className="comment">
                  <UserAvatar userId={comment.authorId} size="small" className="comment-avatar" />
                  <div className="comment-body">
                    <div className="comment-header">
                      <UserName userId={comment.authorId} className="comment-author" />
                      <span className="comment-time">{formatDate(comment.createdAt)}</span>
                      {isCommentAuthor && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="delete-comment-button"
                          disabled={isDeletingThisComment}
                          title="Delete comment"
                        >
                          {isDeletingThisComment ? '...' : '×'}
                        </button>
                      )}
                    </div>
                    <div className="comment-content">{comment.content}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
