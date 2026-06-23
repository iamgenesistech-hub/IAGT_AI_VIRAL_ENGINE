/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8080/api/:path*"
      },
      {
        source: "/products-dashboard",
        destination: "http://localhost:8080/products-dashboard"
      },
      {
        source: "/owner-ai",
        destination: "http://localhost:8080/owner-ai"
      },
      {
        source: "/secret-vault",
        destination: "http://localhost:8080/secret-vault"
      },
      {
        source: "/status",
        destination: "http://localhost:8080/status"
      }
    ];
  }
};

module.exports = nextConfig;
