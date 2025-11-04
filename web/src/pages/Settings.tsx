import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { profileApi } from '../services/profile';
import '../styles/Settings.css';

export function Settings() {
  const { profile, refreshProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setBio(profile.bio || '');
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setIsSaved(false);
    try {
      await profileApi.updateMe({
        name: name.trim(),
        bio: bio.trim() || undefined,
      });
      await refreshProfile();
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('Failed to save profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.match(/^image\/(png|jpe?g|webp)$/i)) {
      alert('Only PNG, JPG/JPEG, and WEBP files are allowed');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    try {
      await profileApi.uploadPicture(file);
      await refreshProfile();
    } catch (error) {
      console.error('Failed to upload picture:', error);
      alert('Failed to upload picture. Please try again.');
    }
  };

  const handleDeletePicture = async () => {
    if (!confirm('Are you sure you want to delete your profile picture?'))
      return;

    try {
      await profileApi.deletePicture();
      await refreshProfile();
    } catch (error) {
      console.error('Failed to delete picture:', error);
      alert('Failed to delete picture. Please try again.');
    }
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <button onClick={() => navigate('/')} className="back-button">
          <svg viewBox="0 0 24 24" className="back-icon">
            <path
              d="M7.414 13l5.043 5.04-1.414 1.42L3.586 12l7.457-7.46 1.414 1.42L7.414 11H21v2H7.414z"
              fill="currentColor"
            />
          </svg>
        </button>
        <h1>Settings</h1>
      </div>

      <div className="settings-content">
        <div className="settings-section">
          <h2>Profile Picture</h2>
          <div className="profile-picture-section">
            <div className="profile-picture-preview">
              {profile?.picturePath ? (
                <img
                  src={
                    profile.picturePath.startsWith('http')
                      ? profile.picturePath
                      : `https://champions-arena.itsabi.com/api/profile/${profile.picturePath}`
                  }
                  alt="Profile"
                />
              ) : (
                <div className="profile-picture-placeholder">
                  {profile?.name?.slice(0, 2).toUpperCase() || 'U'}
                </div>
              )}
            </div>
            <div className="profile-picture-actions">
              <label className="upload-button">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                Upload Photo
              </label>
              {profile?.picturePath && (
                <button
                  onClick={handleDeletePicture}
                  className="delete-picture-button"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
          <p className="help-text">PNG, JPG, JPEG, or WEBP. Max 5MB.</p>
        </div>

        <form onSubmit={handleSubmit} className="settings-form">
          <div className="settings-section">
            <h2>Profile Information</h2>

            <div className="form-group">
              <label htmlFor="name">Display Name</label>
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
              <label htmlFor="bio">Bio</label>
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

            <div className="form-actions">
              <button
                type="submit"
                className="save-button"
                disabled={!name.trim() || isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
              {isSaved && <span className="save-success">Saved!</span>}
            </div>
          </div>
        </form>

        <div className="settings-section danger-zone">
          <h2>Account</h2>
          <button onClick={logout} className="logout-button">
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
