// src/utils/cooldown.js

/**
 * 指定したスポットで本日すでにポイントを獲得済みか判定
 */
export function canClaimSpotPoints(spotId) {
  return localStorage.getItem(`tw_claimed_once_${spotId}`) !== '1'
    && localStorage.getItem(`tw_claimed_${spotId}`) === null;
}

/**
 * スポットのポイント獲得日を保存
 */
export function recordSpotClaim(spotId) {
  localStorage.setItem(`tw_claimed_once_${spotId}`, '1');
  localStorage.setItem(`tw_claimed_${spotId}`, new Date().toISOString().slice(0, 10));
}
