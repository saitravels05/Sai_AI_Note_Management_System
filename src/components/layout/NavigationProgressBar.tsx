"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function NavigationProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    // Dismiss loading indicator as soon as route changes
    setNavigating(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      // Find closest anchor tag
      const target = (e.target as HTMLElement)?.closest("a");
      if (!target || !target.href) return;

      // Only handle internal links
      try {
        const url = new URL(target.href);
        const currentUrl = new URL(window.location.href);

        // Ignore external links, hash changes on the same page, or new tabs
        if (
          url.origin === currentUrl.origin &&
          !target.target &&
          !e.ctrlKey &&
          !e.metaKey &&
          !e.shiftKey &&
          (url.pathname !== currentUrl.pathname || url.search !== currentUrl.search)
        ) {
          setNavigating(true);
        }
      } catch {
        // Ignore malformed URLs
      }
    };

    document.addEventListener("click", handleLinkClick, { capture: true });
    return () => document.removeEventListener("click", handleLinkClick, { capture: true });
  }, []);

  if (!navigating) return null;

  return (
    <div
      role="progressbar"
      aria-label="Page loading"
      className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600 animate-pulse z-[9999] shadow-[0_1px_8px_rgba(234,88,12,0.6)] pointer-events-none"
    />
  );
}
