import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { profileApi } from '../services/profile';
import '../styles/Onboarding.css';

export function Onboarding() {
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { refreshProfile } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await profileApi.updateMe({ name: name.trim(), bio: bio.trim() || undefined });
      await refreshProfile();
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('Failed to save profile. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="onboarding-container">
      <div className="onboarding-card">
        <div className="onboarding-header">
          <h1>Welcome to Champions Arena!</h1>
          <p>Let's set up your profile to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="onboarding-form">
          <div className="form-group">
            <label htmlFor="name">Display Name *</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              maxLength={80}
              required
              disabled={isSubmitting}
              className="form-input"
            />
            <span className="char-count">{name.length}/80</span>
          </div>

          <div className="form-group">
            <label htmlFor="bio">Bio (Optional)</label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself and your favorite team..."
              maxLength={500}
              disabled={isSubmitting}
              className="form-textarea"
              rows={4}
            />
            <span className="char-count">{bio.length}/500</span>
          </div>

          <button
            type="submit"
            className="onboarding-submit"
            disabled={!name.trim() || isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Complete Setup'}
          </button>
        </form>
      </div>
    </div>
  );
}
