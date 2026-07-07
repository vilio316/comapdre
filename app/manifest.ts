import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Compadre',
    short_name: 'Compadre',
    description: 'Study smarter with AI-powered MCQ generation, exam prep, OCR scanning & document management.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F8F9FC',
    theme_color: '#1B2A4A',
    icons: [
      {
        src: '/icons/icon.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
      },
      {
        src: '/icons/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  }
}
