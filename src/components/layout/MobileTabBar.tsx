import { Clapperboard, Flag, Heart, Home, Tv2, Video } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const tabItems = [
  { label: "Home", to: "/", icon: Home },
  { label: "Sports", to: "/sports", icon: Flag },
  { label: "Movies", to: "/browse/movies", icon: Clapperboard },
  { label: "Series", to: "/browse/series", icon: Tv2 },
  { label: "Anime", to: "/browse/anime", icon: Video },
  { label: "Saved", to: "/watchlist", icon: Heart },
];

export default function MobileTabBar() {
  const location = useLocation();

  if (location.pathname.startsWith("/watch/")) {
    return null;
  }

  return (
    <nav
      className="mobile-tabbar md:hidden"
      aria-label="Mobile navigation"
    >
      {tabItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn("mobile-tabbar-link", isActive && "mobile-tabbar-link-active")
            }
          >
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
