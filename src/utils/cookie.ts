export function addInterest(keyword: string) {
  if (!keyword) return;
  let interests = getInterests();
  
  // Remove if exists to bring it to front, or add if new
  interests = interests.filter(i => i !== keyword);
  interests.unshift(keyword);
  
  // Keep max 10 interests
  if (interests.length > 10) {
    interests = interests.slice(0, 10);
  }
  
  document.cookie = `user_interests=${encodeURIComponent(JSON.stringify(interests))};path=/;max-age=2592000`; // 30 days
}

export function getInterests(): string[] {
  if (typeof document === 'undefined') return [];
  const match = document.cookie.match(new RegExp('(^| )user_interests=([^;]+)'));
  if (match) {
    try {
      return JSON.parse(decodeURIComponent(match[2]));
    } catch (e) {}
  }
  return [];
}
