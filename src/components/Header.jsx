// src/components/HeaderNav.jsx
/* global document */
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { NavLink, Link } from "react-router-dom";
import { FaChevronDown, FaBars, FaTimes, FaUserCircle } from "react-icons/fa";
import { FiLogOut, FiBell, FiZap, FiFilePlus, FiSearch, FiMapPin } from "react-icons/fi";
import Logo from "../assets/chubb-logo-png_seeklogo-470295.png";
import { NAV_GROUPS } from "../routes";

function cx(...c) {
  return c.filter(Boolean).join(" ");
}

/* Mobile drawer rendered via portal (escapes header stacking context) */
function MobileDrawer({
  open,
  onClose,
  brandName,
  quickItems,
  navGroups,
  badges,
  onLogout,
}) {
  const drawerRef = useRef(null);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const { style } = document.body;
    const prev = style.overflow;
    style.overflow = "hidden";
    return () => {
      style.overflow = prev;
    };
  }, [open]);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] md:hidden">
      {/* Backdrop */}
      <button
        aria-label="Close menu"
        onClick={onClose}
        className="absolute inset-0 bg-black/35 transition-opacity"
      />
      {/* Sheet */}
      <div
        ref={drawerRef}
        className="absolute left-0 top-0 h-full w-80 max-w-[85%] bg-white shadow-2xl border-r border-gray-200 transform translate-x-0
                   pt-[max(env(safe-area-inset-top),0px)]"
        role="dialog"
        aria-modal="true"
      >
        <div className="h-16 px-4 border-b flex items-center justify-between">
          <div className="font-semibold text-gray-900">Menu</div>
          <button
            className="p-3 rounded-lg hover:bg-gray-100 active:scale-[0.98]"
            aria-label="Close menu"
            onClick={onClose}
          >
            <FaTimes />
          </button>
        </div>

        <nav className="p-3 overflow-y-auto h-[calc(100%-4rem-3rem)]">
          {/* Quick (mobile) */}
          <div className="mb-4">
            <div className="px-2 pt-2 pb-1 text-[11px] uppercase tracking-wider text-gray-500">
              Quick
            </div>
            <ul className="space-y-1">
              {quickItems.map((q) => {
                const Icon = q.icon;
                return (
                  <li key={q.to}>
                    <Link
                      to={q.to}
                      className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-100"
                      onClick={onClose}
                    >
                      <Icon className={cx("text-base", q.color)} />
                      <span>{q.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {navGroups.map((group) => (
            <div key={group.title} className="mb-4">
              <div className="px-2 pt-2 pb-1 text-[11px] uppercase tracking-wider text-gray-500">
                {group.title}
              </div>
              <ul className="space-y-1">
                {group.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      data-testid={item.testId}
                      className={({ isActive }) =>
                        cx(
                          "flex items-center gap-3 px-3 py-3 rounded-xl",
                          isActive ? "bg-chubb-blue text-white" : "hover:bg-gray-100 text-gray-800"
                        )
                      }
                      onClick={onClose}
                    >
                      <span className={cx("h-2.5 w-2.5 rounded-full", item.color)} />
                      <span className="flex-1">{item.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="mt-6 px-2">
            <button
              onClick={() => {
                onClose();
                onLogout?.();
              }}
              className="w-full flex items-center justify-center gap-2 bg-chubb-green hover:bg-green-600 text-white px-3 py-3 rounded-xl shadow-sm"
            >
              <FiLogOut />
              <span className="text-sm">Logout</span>
            </button>
          </div>
        </nav>

        <div className="px-4 py-3 border-t text-[12px] text-gray-600">
          © {new Date().getFullYear()} {brandName}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function HeaderNav({
  badges = {},
  brand = { name: "Policy Portal", sub: "" },
  onLogout,
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickPulse, setQuickPulse] = useState(true);

  const menuRefs = useRef({});
  const openTimer = useRef();
  const closeTimer = useRef();
  const quickRef = useRef(null);

  const HOVER_OPEN_DELAY = 120;
  const HOVER_CLOSE_DELAY = 200;

  const QUICK_ITEMS = [
    { label: "Create FNOL", to: "/create-fnol", icon: FiFilePlus, color: "text-violet-600" },
    { label: "Assign Claim", to: "/claims-inquiry", icon: FiSearch, color: "text-sky-600" },
    { label: "Surveyor Live Map", to: "/surveyor-live-map", icon: FiMapPin, color: "text-purple-600" },
  ];

  useEffect(() => {
    const t = setTimeout(() => setQuickPulse(false), 5000);
    return () => clearTimeout(t);
  }, []);

  // Click outside (desktop dropdowns + quick)
  useEffect(() => {
    function handleClick(e) {
      if (openMenu) {
        const ref = menuRefs.current[openMenu];
        if (ref && !ref.contains(e.target)) setOpenMenu(null);
      }
      if (quickOpen && quickRef.current && !quickRef.current.contains(e.target)) {
        setQuickOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [openMenu, quickOpen]);

  // ESC close (desktop popovers)
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") {
        setOpenMenu(null);
        setQuickOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const openWithDelay = (key) => {
    clearTimeout(closeTimer.current);
    openTimer.current = setTimeout(() => setOpenMenu(key), HOVER_OPEN_DELAY);
  };
  const closeWithDelay = (key) => {
    clearTimeout(openTimer.current);
    closeTimer.current = setTimeout(() => {
      setOpenMenu((curr) => (curr === key ? null : curr));
    }, HOVER_CLOSE_DELAY);
  };
  const instantToggle = (key) => {
    clearTimeout(openTimer.current);
    clearTimeout(closeTimer.current);
    setOpenMenu((curr) => (curr === key ? null : key));
  };

  return (
    <header
      className={cx(
        "sticky top-0 z-40 border-b border-gray-200",
        // Avoid backdrop filter on mobile (prevents fixed-position bugs)
        "bg-white",
        "sm:bg-white/90 sm:backdrop-blur"
      )}
    >
      {/* Accent bar */}
      <div className="h-0.5 w-full bg-gradient-to-r from-chubb-blue via-chubb-green to-sky-500" />

      <div className="mx-auto max-w-screen-2xl px-4">
        <div className="h-16 flex items-center justify-between">
          {/* Brand + burger */}
          <div className="flex items-center gap-3">
            <button
              className="md:hidden p-3 rounded-xl hover:bg-gray-100 active:scale-[0.98]"
              aria-label="Open menu"
              onClick={() => setMobileOpen(true)}
            >
              <FaBars />
            </button>
            <Link to="/" className="flex items-center gap-2">
              <img src={Logo} alt="Brand" className="h-9" />
              <div className="leading-tight">
                <div className="font-semibold text-gray-900">{brand.name}</div>
                <div className="text-[11px] text-gray-500">{brand.sub}</div>
              </div>
            </Link>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-stretch gap-2">
            {NAV_GROUPS.map((group) => {
              const isOpen = openMenu === group.title;
              return (
                <div
                  key={group.title}
                  className="relative"
                  ref={(el) => (menuRefs.current[group.title] = el)}
                  onMouseEnter={() => openWithDelay(group.title)}
                  onMouseLeave={() => closeWithDelay(group.title)}
                >
                  <button
                    className={cx(
                      "h-10 px-3 rounded-xl flex items-center gap-2 text-sm font-medium transition shadow-sm",
                      isOpen ? "bg-gray-100" : "hover:bg-gray-100"
                    )}
                    onClick={() => instantToggle(group.title)}
                    aria-haspopup="menu"
                    aria-expanded={isOpen}
                  >
                    {group.title}
                    <FaChevronDown className={cx("text-xs transition-transform", isOpen && "rotate-180")} />
                  </button>

                  {isOpen && (
                    <div className="absolute left-0 top-full pt-2">
                      <div className="w-72 rounded-2xl border border-gray-200 bg-white shadow-xl p-2">
                        <div className="px-2 py-1 text-[11px] uppercase tracking-wider text-gray-500">
                          {group.title}
                        </div>
                        <ul>
                          {group.items.map((item) => (
                            <li key={item.to}>
                              <NavLink
                                to={item.to}
                                data-testid={item.testId}
                                className={({ isActive }) =>
                                  cx(
                                    "flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition",
                                    isActive ? "bg-chubb-blue text-white" : "hover:bg-gray-100 text-gray-800"
                                  )
                                }
                                onClick={() => setOpenMenu(null)}
                              >
                                <span className={cx("h-2.5 w-2.5 rounded-full", item.color)} />
                                <span className="flex-1">{item.label}</span>
                              </NavLink>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Quick Button (violet) */}
            <div className="hidden md:block relative" ref={quickRef}>
              {quickPulse && (
                <span
                  className="absolute -inset-1 rounded-2xl bg-violet-400/40 blur-md animate-pulse pointer-events-none"
                  aria-hidden="true"
                />
              )}
              <button
                onClick={() => setQuickOpen((v) => !v)}
                className="relative h-10 px-3 rounded-xl flex items-center gap-2 text-sm font-medium
                           bg-violet-600 text-white shadow-md hover:bg-violet-700 transition-colors"
                aria-haspopup="menu"
                aria-expanded={quickOpen}
                aria-label="Quick actions"
              >
                <FiZap className="text-white" />
                Quick
              </button>
              {quickOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-gray-200 bg-white shadow-xl p-2">
                  <ul className="max-h-[60vh] overflow-auto">
                    {QUICK_ITEMS.map((q) => {
                      const Icon = q.icon;
                      return (
                        <li key={q.to}>
                          <Link
                            to={q.to}
                            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm hover:bg-gray-100"
                            onClick={() => setQuickOpen(false)}
                          >
                            <Icon className={cx("text-base", q.color)} />
                            <span>{q.label}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            <Link
              to="/notifications"
              className="relative p-2.5 rounded-xl hover:bg-gray-100"
              aria-label="Notifications"
            >
              <FiBell className="text-xl text-gray-700" />
              {badges.notifications > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-600 text-white text-[10px] rounded-full px-1">
                  {badges.notifications}
                </span>
              )}
            </Link>

            <FaUserCircle className="text-2xl text-gray-700" />

            <button
              onClick={onLogout}
              className="hidden sm:flex items-center gap-2 bg-chubb-green hover:bg-green-600 text-white px-3 py-2 rounded-xl shadow-sm"
            >
              <FiLogOut />
              <span className="text-sm">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer (portal) */}
      <MobileDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        brandName={brand.name}
        quickItems={QUICK_ITEMS}
        navGroups={NAV_GROUPS}
        badges={badges}
        onLogout={onLogout}
      />
    </header>
  );
}
