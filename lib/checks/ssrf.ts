/**
 * SSRF guard.
 *
 * "SSRF" means tricking a server into making requests to places it
 * shouldn't, like the cloud provider's internal network. Because anyone can
 * paste a URL into the public checker, we must refuse private and internal
 * addresses. We check the IP *after* DNS resolution, and we check it again
 * on every connection (including redirects), so a sneaky DNS record can't
 * get around it.
 */
import { BlockList, isIP } from "node:net";
import { promises as dns } from "node:dns";
import type { LookupFunction } from "node:net";

const blocked = new BlockList();

// IPv4 ranges that are private, internal, or otherwise not the public internet.
const V4_RANGES: [string, number][] = [
  ["0.0.0.0", 8], // "this network"
  ["10.0.0.0", 8], // private
  ["100.64.0.0", 10], // carrier-grade NAT
  ["127.0.0.0", 8], // loopback (localhost)
  ["169.254.0.0", 16], // link-local, includes cloud metadata 169.254.169.254
  ["172.16.0.0", 12], // private
  ["192.0.0.0", 24], // IETF protocol assignments
  ["192.0.2.0", 24], // documentation
  ["192.88.99.0", 24], // old 6to4 relay
  ["192.168.0.0", 16], // private
  ["198.18.0.0", 15], // benchmarking
  ["198.51.100.0", 24], // documentation
  ["203.0.113.0", 24], // documentation
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved + broadcast
];
for (const [net, prefix] of V4_RANGES) blocked.addSubnet(net, prefix, "ipv4");

const V6_RANGES: [string, number][] = [
  ["::", 128], // unspecified
  ["::1", 128], // loopback
  ["64:ff9b::", 96], // NAT64 (could wrap a private IPv4)
  ["64:ff9b:1::", 48], // local-use NAT64
  ["100::", 64], // discard
  ["2001:db8::", 32], // documentation
  ["fc00::", 7], // unique local (private)
  ["fe80::", 10], // link-local
  ["ff00::", 8], // multicast
];
for (const [net, prefix] of V6_RANGES) blocked.addSubnet(net, prefix, "ipv6");

/** Pull an IPv4 address out of an IPv4-mapped IPv6 address like ::ffff:10.0.0.1 */
function mappedV4(ip: string): string | null {
  const m = ip.toLowerCase().match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (m) return m[1];
  // Hex form, e.g. ::ffff:a00:1
  const h = ip.toLowerCase().match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (h) {
    const hi = parseInt(h[1], 16);
    const lo = parseInt(h[2], 16);
    return `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
  }
  return null;
}

/** True if this IP is private/internal and must not be contacted. */
export function isBlockedIp(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) return blocked.check(ip, "ipv4");
  if (family === 6) {
    const v4 = mappedV4(ip);
    if (v4) return blocked.check(v4, "ipv4");
    return blocked.check(ip, "ipv6");
  }
  // Not an IP at all: refuse to be safe.
  return true;
}

export class BlockedAddressError extends Error {
  code = "EBLOCKED";
  constructor(public address: string) {
    super(`Refusing to connect to private address ${address}`);
  }
}

export interface ResolvedAddress {
  address: string;
  family: 4 | 6;
}

/**
 * Resolve a hostname and make sure every address is public.
 * Throws a BlockedAddressError if any address is private.
 */
export async function resolvePublic(
  hostname: string,
  { allowPrivate = false } = {},
): Promise<ResolvedAddress[]> {
  // Strip IPv6 brackets: [::1] -> ::1
  const host = hostname.replace(/^\[|\]$/g, "");
  const literal = isIP(host);
  const addresses: ResolvedAddress[] = literal
    ? [{ address: host, family: literal as 4 | 6 }]
    : ((await dns.lookup(host, { all: true, verbatim: true })) as ResolvedAddress[]);
  if (!allowPrivate) {
    for (const a of addresses) {
      if (isBlockedIp(a.address)) throw new BlockedAddressError(a.address);
    }
  }
  return addresses;
}

/**
 * A DNS lookup function for Node's network code that refuses private
 * addresses. We hand this to every connection, so even redirects and
 * DNS tricks (where the name changes between our check and the connect)
 * are covered.
 */
export function makeSafeLookup({ allowPrivate = false } = {}): LookupFunction {
  return (hostname, options, callback) => {
    resolvePublic(hostname, { allowPrivate })
      .then((addresses) => {
        const wanted =
          options.family === 4 || options.family === 6
            ? addresses.filter((a) => a.family === options.family)
            : addresses;
        if (wanted.length === 0) {
          const err = Object.assign(new Error(`No address for ${hostname}`), {
            code: "ENOTFOUND",
          });
          return callback(err, "", 0);
        }
        if (options.all) {
          // Node's types for the "all" form are awkward; the runtime accepts an array.
          (callback as unknown as (e: null, a: ResolvedAddress[]) => void)(null, wanted);
        } else {
          callback(null, wanted[0].address, wanted[0].family);
        }
      })
      .catch((err) => callback(err, "", 0));
  };
}
