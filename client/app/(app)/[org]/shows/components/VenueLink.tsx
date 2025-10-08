"use client";

import Link from "next/link";

interface VenueLinkProps {
  href: string;
  venueName: string;
  className?: string;
}

export function VenueLink({ href, venueName, className }: VenueLinkProps) {
  return (
    <Link
      href={href}
      className={className}
      onClick={(e) => e.stopPropagation()}
    >
      {venueName}
    </Link>
  );
}
