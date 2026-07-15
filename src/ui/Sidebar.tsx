import { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { INSTRUMENT_LIST, INSTRUMENTS } from "../config/instruments";
import type { SessionSettings } from "../config/settings";
import { allNotesInRange } from "../drill/scaleGenerator";

interface SidebarProps {
  settings: SessionSettings;
  onSettingsChange: (next: SessionSettings) => void;
}

const NAV_ITEMS: { to: string; label: string; short: string; end?: boolean }[] =
  [
    { to: "/", label: "Home", short: "H", end: true },
    { to: "/scales", label: "Scales", short: "Sc" },
    { to: "/all-notes", label: "All Notes", short: "AN" },
    { to: "/settings", label: "Settings", short: "St" },
  ];

const COLLAPSED_STORAGE_KEY = "sidebar-collapsed";

export function Sidebar({ settings, onSettingsChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(COLLAPSED_STORAGE_KEY) === "1",
  );

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSED_STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  };

  const rangeOptions = useMemo(
    () => allNotesInRange(INSTRUMENTS[settings.instrument].writtenRange),
    [settings.instrument],
  );

  return (
    <aside className={`sidebar ${collapsed ? "sidebar--collapsed" : ""}`}>
      <button
        type="button"
        className="sidebar__toggle"
        onClick={toggle}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-expanded={!collapsed}
      >
        {collapsed ? "»" : "«"}
      </button>

      <nav className="sidebar__nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `sidebar__link ${isActive ? "sidebar__link--active" : ""}`
            }
            title={item.label}
          >
            {collapsed ? item.short : item.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar__quick-settings">
        <label className="field sidebar__field sidebar__field--instrument">
          {!collapsed && <span>Instrument</span>}
          <select
            value={settings.instrument}
            title="Instrument"
            onChange={(e) => {
              const instrument = e.target
                .value as SessionSettings["instrument"];
              onSettingsChange({
                ...settings,
                instrument,
                rangeLow: INSTRUMENTS[instrument].writtenRange.low,
                rangeHigh: INSTRUMENTS[instrument].writtenRange.high,
              });
            }}
          >
            {INSTRUMENT_LIST.map((inst) => (
              <option key={inst.id} value={inst.id}>
                {collapsed ? inst.label.split(" ")[0] : inst.label}
              </option>
            ))}
          </select>
        </label>

        <div className="sidebar__range-row">
          <label className="field sidebar__field sidebar__field--low">
            {!collapsed && <span>Lowest</span>}
            <select
              value={settings.rangeLow}
              title="Lowest note"
              onChange={(e) =>
                onSettingsChange({ ...settings, rangeLow: e.target.value })
              }
            >
              {rangeOptions.map((note) => (
                <option key={note} value={note}>
                  {note}
                </option>
              ))}
            </select>
          </label>
          <label className="field sidebar__field sidebar__field--high">
            {!collapsed && <span>Highest</span>}
            <select
              value={settings.rangeHigh}
              title="Highest note"
              onChange={(e) =>
                onSettingsChange({ ...settings, rangeHigh: e.target.value })
              }
            >
              {rangeOptions.map((note) => (
                <option key={note} value={note}>
                  {note}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </aside>
  );
}
