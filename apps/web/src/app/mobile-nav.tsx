"use client";

import { useCallback, useEffect, useRef } from "react";

export function MobileNavToggle() {
  const drawerRef = useRef<HTMLDivElement>(null);

  const openNav = useCallback(() => {
    const sidebar = document.querySelector(".sidebar");
    const drawer = drawerRef.current;
    if (sidebar) sidebar.classList.add("mobile-open");
    if (drawer) drawer.classList.add("open");
    document.body.style.overflow = "hidden";
  }, []);

  const closeNav = useCallback(() => {
    const sidebar = document.querySelector(".sidebar");
    const drawer = drawerRef.current;
    if (sidebar) sidebar.classList.remove("mobile-open");
    if (drawer) drawer.classList.remove("open");
    document.body.style.overflow = "";
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 980) closeNav();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [closeNav]);

  return (
    <>
      <button
        className="mobile-nav-toggle"
        onClick={openNav}
        aria-label="Open navigation"
        type="button"
      >
        <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 12h18M3 6h18M3 18h18" />
        </svg>
      </button>
      <div
        className="mobile-nav-drawer"
        ref={drawerRef}
        onClick={closeNav}
        role="presentation"
      />
    </>
  );
}
