import type { NextConfig } from "next";
import os from "os";

const getLocalIPs = () => {
  const interfaces = os.networkInterfaces();
  const ips: string[] = ['localhost:3000'];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(`${iface.address}:3000`);
        ips.push(iface.address);
      }
    }
  }
  return ips;
};

const nextConfig: NextConfig = {
  /* config options here */
  // @ts-ignore
  allowedDevOrigins: getLocalIPs()
};

export default nextConfig;
