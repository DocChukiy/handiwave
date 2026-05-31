import { artisans } from '../data/artisans.js'

export async function getArtisans() {
  return {
    data: artisans,
    error: null,
  }
}

export async function getArtisanByName(name) {
  return {
    data: artisans.find((artisan) => artisan.name === name) || null,
    error: null,
  }
}

export async function getArtisansByCategory(category) {
  return {
    data: artisans.filter((artisan) => artisan.category === category),
    error: null,
  }
}
