// src/utils/cooldown.js

/**
 * 指定したスポットで本日すでにポイントを獲得済みか判定
 */
export function canClaimSpotPoints(spotId) {
  const today = new Date().toISOString().split('T')[0]; // "2026-09-29"
  const lastClaimed = localStorage.getItem(`tw_claimed_${spotId}`);
  return lastClaimed !== today;
}

/**
 * スポットのポイント獲得日を保存
 */
export function recordSpotClaim(spotId) {
  const today = new Date().toISOString().split('T')[0];
  localStorage.setItem(`tw_claimed_${spotId}`, today);
}