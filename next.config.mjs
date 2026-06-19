/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // 旧 /meme 永久重定向到 /ranking
      { source: '/meme', destination: '/ranking', permanent: true },
    ]
  },
}

export default nextConfig
