import { reels } from '../data/reels.js'

export async function getReels() {
  return {
    data: reels,
    error: null,
  }
}

export async function likeReel(reelId) {
  return {
    data: {
      liked: true,
      reelId,
    },
    error: null,
  }
}
