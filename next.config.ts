import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
      },
      {
        protocol: 'https',
        hostname: 'images.asics.com',
      },
      {
        protocol: 'https',
        hostname: 'assets.adidas.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.decathlon.it',
      },
      {
        protocol: 'https',
        hostname: 'www.garmin.com',
      },
      {
        protocol: 'https',
        hostname: 'media.lidl.com',
      },
      {
        protocol: 'https',
        hostname: 'www.salomon.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.shopify.com',
      },
      {
        protocol: 'https',
        hostname: 'www.blackdiamondequipment.com',
      },
      {
        protocol: 'https',
        hostname: 'blackdiamondequipment.com',
      },
      {
        protocol: 'https',
        hostname: 'images.thenorthface.com',
      },
      {
        protocol: 'https',
        hostname: 'www.petzl.com',
      },
      {
        protocol: 'https',
        hostname: 'outlet.asics.com',
      },
      {
        protocol: 'https',
        hostname: 'www.adidas.it',
      },
      {
        protocol: 'https',
        hostname: 'www.decathlon.it',
      },
      {
        protocol: 'https',
        hostname: 'www.osprey.com',
      },
      {
        protocol: 'https',
        hostname: 'media.decathlon.com',
      },
      {
        protocol: 'https',
        hostname: 'media.garmin.com',
      },
      {
        protocol: 'https',
        hostname: 'res.garmin.com',
      },
      {
        protocol: 'https',
        hostname: 'images.osprey.com',
      },
    ],
  },
};

export default nextConfig;
