import React, { useEffect, useState } from 'react';
import { profileApi } from '../../api/services';
import { User } from '../../types';

interface UserAvatarProps {
  user: User;
  className: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ user, className }) => {
  const [loadedAvatar, setLoadedAvatar] = useState<{ identity: string; url: string } | null>(null);
  const identity = `${user.id}:${user.avatarUrl || ''}`;

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | null = null;
    setLoadedAvatar(null);

    if (user.avatarUrl) {
      profileApi.getAvatar(user.avatarUrl, controller.signal)
        .then((blob) => {
          if (controller.signal.aborted) return;
          objectUrl = URL.createObjectURL(blob);
          setLoadedAvatar({ identity, url: objectUrl });
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setLoadedAvatar(null);
          }
        });
    }

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [identity, user.avatarUrl]);

  const initials = user.fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase() || user.email.charAt(0).toUpperCase();
  const avatarUrl = loadedAvatar?.identity === identity ? loadedAvatar.url : null;

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden bg-teal-100 text-teal-800 font-bold ${className}`}
      role="img"
      aria-label={`${user.fullName}'s profile picture`}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
    </span>
  );
};
