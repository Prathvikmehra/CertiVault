import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Search,
  User,
  Settings,
  HelpCircle,
  Keyboard,
  Sun,
  Moon,
  Camera,
  Upload,
  Clock,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext.js";
import { api } from "../api.js";
import { NotificationCenter } from "./NotificationCenter.js";
import { GlobalSearch } from "./GlobalSearch.js";

interface TopbarProps {
  search: string;
  setSearch: (search: string) => void;
  setMobileNav: (open: boolean) => void;
}

export function Topbar({ search, setSearch, setMobileNav }: TopbarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [unreadCount, setUnreadCount] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark";
    if (savedTheme) {
      setTheme(savedTheme);
    }
    setAvatar(user?.avatar || "");
    loadUnreadCount();
  }, [user]);

  useEffect(() => {
    const pollInterval = window.setInterval(() => {
      loadUnreadCount();
    }, 30000); // Poll every 30 seconds
    return () => window.clearInterval(pollInterval);
  }, []);

  const loadUnreadCount = async () => {
    try {
      const response = await api.getUnreadCount();
      setUnreadCount(response.count);
    } catch (error) {
      console.error("Failed to load unread count:", error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle keyboard shortcut for global search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowGlobalSearch(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleLogout = async () => {
    await logout();
    setShowProfileMenu(false);
  };

  const getUserInitials = () => {
    if (!user?.name) return "U";
    return user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB");
      return;
    }

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setAvatar(base64);
        await api.updateProfile({ avatar: base64 });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Failed to upload avatar:", error);
    }
  };

  const generateAvatar = async () => {
    try {
      const response = await api.generateAvatar(user?.name || "User");
      setAvatar(response.data.avatarUrl);
      await api.updateProfile({ avatar: response.data.avatarUrl });
    } catch (error) {
      console.error("Failed to generate avatar:", error);
    }
  };

  const getRoleBadge = (role?: string) => {
    const colors = {
      admin: "bg-purple-100 text-purple-700",
      verifier: "bg-blue-100 text-blue-700",
      user: "bg-gray-100 text-gray-700",
    };
    return colors[role as keyof typeof colors] || colors.user;
  };

  return (
    <header className="topbar">
      <button className="icon-button menu-button" onClick={() => setMobileNav(true)}>
        <Menu />
      </button>
      <div className="global-search">
        <button
          className="global-search-button"
          onClick={() => setShowGlobalSearch(true)}
        >
          <Search size={18} />
          <span>Search documents, tags, or owners…</span>
          <kbd>⌘ K</kbd>
        </button>
      </div>
      <div className="top-actions">
        <div className="relative">
          <button
            className="icon-button notification"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell size={19} />
            {unreadCount > 0 && <span className="notification-badge-top">{unreadCount}</span>}
          </button>
        </div>
        <div className="relative" ref={menuRef}>
          <button
            className="profile"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
          >
            <div className="avatar small">
              {avatar ? (
                <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                getUserInitials()
              )}
            </div>
            <span>{user?.name || "User"}</span>
            <ChevronDown size={15} />
          </button>

          {/* Profile Dropdown */}
          <div
            className={`profile-dropdown ${showProfileMenu ? "show" : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Profile Header */}
            <div className="profile-header">
              <div className="profile-avatar-container">
                {avatar ? (
                  <img src={avatar} alt="Avatar" className="profile-avatar" />
                ) : (
                  <div className="profile-avatar profile-avatar-initials">
                    {getUserInitials()}
                  </div>
                )}
                <button
                  className="avatar-upload-btn"
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload avatar"
                >
                  <Camera size={16} />
                </button>
                <button
                  className="avatar-generate-btn"
                  onClick={generateAvatar}
                  title="Generate initials avatar"
                >
                  <Upload size={16} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>
              <div className="profile-info">
                <div className="profile-name">{user?.name || "User"}</div>
                <div className="profile-email">{user?.email}</div>
                <div className="profile-meta">
                  <span className={`profile-role ${getRoleBadge(user?.role)}`}>
                    {user?.role || "user"}
                  </span>
                  <span className="profile-last-login">
                    <Clock size={12} />
                    {user?.role || "user"}
                  </span>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="profile-menu">
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  navigate("/settings");
                }}
                className="profile-menu-item"
              >
                <User size={18} />
                <span>Profile</span>
              </button>

              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  navigate("/settings");
                }}
                className="profile-menu-item"
              >
                <Settings size={18} />
                <span>Settings</span>
              </button>

              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  // Navigate to notifications page
                }}
                className="profile-menu-item"
              >
                <Bell size={18} />
                <span>Notifications</span>
              </button>

              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  // Navigate to help page
                }}
                className="profile-menu-item"
              >
                <HelpCircle size={18} />
                <span>Help</span>
              </button>

              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  // Open keyboard shortcuts modal
                }}
                className="profile-menu-item"
              >
                <Keyboard size={18} />
                <span>Keyboard Shortcuts</span>
              </button>

              <div className="profile-menu-divider" />

              <button
                onClick={toggleTheme}
                className="profile-menu-item"
              >
                {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
                <span>{theme === "light" ? "Dark Mode" : "Light Mode"}</span>
              </button>

              <div className="profile-menu-divider" />

              <button
                onClick={handleLogout}
                className="profile-menu-item profile-menu-item-danger"
              >
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <NotificationCenter
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
      <GlobalSearch
        isOpen={showGlobalSearch}
        onClose={() => setShowGlobalSearch(false)}
      />
    </header>
  );
}
