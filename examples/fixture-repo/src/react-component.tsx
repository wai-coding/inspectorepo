import React, { useState, useEffect } from 'react';

interface UserCardProps {
  userId: number;
  showDetails: boolean;
}

// Triggers: unused-imports (React default import not used in JSX factory with modern transform)
// Triggers: boolean-simplification (showDetails === true)
// Triggers: optional-chaining (user && user.profile && user.profile.avatar)

export function UserCard({ userId, showDetails }: UserCardProps) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/users/${userId}`)
      .then((res) => res.json())
      .then((data) => {
        setUser(data);
        setLoading(false);
      });
  }, [userId]);

  if (loading === true) {
    return <div className="loading">Loading...</div>;
  }

  const avatarUrl = user && user.profile && user.profile.avatar;
  const displayName = user && user.name;

  if (showDetails === true) {
    return (
      <div className="user-card">
        <img src={avatarUrl} alt={displayName} />
        <h2>{displayName}</h2>
        <p>{user && user.bio}</p>
      </div>
    );
  }

  return (
    <div className="user-card-compact">
      <span>{displayName}</span>
    </div>
  );
}
