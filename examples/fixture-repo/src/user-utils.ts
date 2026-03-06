interface User {
  name: string;
  profile?: {
    avatar?: {
      url?: string;
    };
    settings?: {
      theme?: string;
    };
  };
  metadata?: {
    lastLogin?: {
      timestamp?: number;
    };
  };
}

// Guard chains — triggers optional-chaining rule
export function getAvatarUrl(user: User): string | undefined {
  if (user.profile && user.profile.avatar && user.profile.avatar.url) {
    return user.profile.avatar.url;
  }
  return undefined;
}

export function getUserTheme(user: User): string {
  const theme = user.profile && user.profile.settings && user.profile.settings.theme;
  return theme || 'default';
}

export function getLastLoginTimestamp(user: User): number | undefined {
  if (user.metadata && user.metadata.lastLogin && user.metadata.lastLogin.timestamp) {
    return user.metadata.lastLogin.timestamp;
  }
  return undefined;
}

// Boolean simplification patterns — triggers boolean-simplification rule
export function isActive(user: { active: boolean }): boolean {
  return user.active === true;
}

export function isDisabled(user: { disabled: boolean }): boolean {
  if (user.disabled !== false) {
    return true;
  }
  return false;
}

export function hasPermission(value: unknown): boolean {
  return !!value;
}

export function isLoggedIn(user: { loggedIn: boolean }): boolean {
  return user.loggedIn ? true : false;
}

export function isGuest(user: { guest: boolean }): boolean {
  return user.guest ? false : true;
}
