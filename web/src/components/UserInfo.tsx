import { useEffect, useState } from 'react';
import { userCacheService } from '../services/userCache';
import type { UserProfile } from '../services/profile';

interface UserAvatarProps {
  userId: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export function UserAvatar({ userId, size = 'medium', className = '' }: UserAvatarProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    userCacheService.getUser(userId).then(setProfile);
  }, [userId]);

  const sizeMap = {
    small: { width: '32px', height: '32px', fontSize: '0.75em' },
    medium: { width: '40px', height: '40px', fontSize: '0.9em' },
    large: { width: '64px', height: '64px', fontSize: '1.5em' }
  };

  const style = sizeMap[size];
  const initial = profile?.name?.slice(0, 2).toUpperCase() || userId.slice(0, 2).toUpperCase();

  if (profile?.picturePath) {
    return (
      <img
        src={profile.picturePath}
        alt={profile.name || 'User'}
        className={className}
        style={{
          width: style.width,
          height: style.height,
          borderRadius: '50%',
          objectFit: 'cover',
          flexShrink: 0
        }}
      />
    );
  }

  return (
    <div
      className={className}
      style={{
        width: style.width,
        height: style.height,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, var(--accent), #1a73e8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: style.fontSize,
        color: 'white',
        flexShrink: 0
      }}
    >
      {initial}
    </div>
  );
}

interface UserNameProps {
  userId: string;
  className?: string;
}

export function UserName({ userId, className = '' }: UserNameProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    userCacheService.getUser(userId).then(setProfile);
  }, [userId]);

  const displayName = profile?.name || `User ${userId.slice(0, 8)}`;

  return <span className={className}>{displayName}</span>;
}
