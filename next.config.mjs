/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // /ranking → /meme (旧 URL 永久重定向)
      {
        source: '/ranking',
        destination: '/meme',
        permanent: true,
      },
    ]
  },
}

export default nextConfig
