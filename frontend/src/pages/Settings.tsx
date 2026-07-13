import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  User,
  Shield,
  Palette,
  Bell,
  Monitor,
  LogOut,
  Trash2,
  Camera,
  Check,
  X,
  Moon,
  Sun,
  Globe,
  Clock,
  Save,
} from "lucide-react";
import { Sidebar } from "../components/Sidebar.js";
import { Topbar } from "../components/Topbar.js";
import { Summary } from "../types.js";
import { api } from "../api.js";

type Tab = "profile" | "security" | "appearance" | "notifications" | "sessions";

export default function Settings() {
  const navigate = useNavigate();
  const [summary] = useState<Summary>({ total: 0, verified: 0, pending: 0, rejected: 0, archived: 0, favorites: 0, storageBytes: 0 });
  const [mobileNav, setMobileNav] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  // Profile state
  const [profile, setProfile] = useState<any>(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Email state
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);

  // Appearance state
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [language, setLanguage] = useState("en");
  const [timezone, setTimezone] = useState("UTC");

  // Notifications state
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    documentShared: true,
    documentVerified: true,
    expiryReminders: true,
    teamUpdates: true,
  });
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);

  // Sessions state
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  // Delete account state
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadProfile();
    loadTheme();
    if (activeTab === "sessions") loadSessions();
  }, [activeTab]);

  const loadProfile = async () => {
    try {
      const response = await api.getProfile();
      setProfile(response.data);
      setName(response.data.name || "");
      setBio(response.data.bio || "");
      setAvatar(response.data.avatar || "");
      setNotifications(response.data.notificationPreferences || notifications);
    } catch (err: any) {
      console.error("Failed to load profile:", err);
    }
  };

  const loadTheme = () => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark";
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    }
  };

  const loadSessions = async () => {
    setIsLoadingSessions(true);
    try {
      const response = await api.getSessions();
      setSessions(response.data);
    } catch (err: any) {
      console.error("Failed to load sessions:", err);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const saveProfile = async () => {
    setIsSavingProfile(true);
    setError("");
    setSuccess("");

    try {
      await api.updateProfile({ name, bio, avatar });
      setSuccess("Profile updated successfully");
      loadProfile();
    } catch (err: any) {
      setError(err.message || "Failed to update profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const generateAvatar = async () => {
    try {
      const response = await api.generateAvatar(name);
      setAvatar(response.data.avatarUrl);
      setSuccess("Avatar generated");
    } catch (err: any) {
      setError(err.message || "Failed to generate avatar");
    }
  };

  const changePassword = async () => {
    if (newPassword !== confirmPassword) {
      return setError("Passwords do not match");
    }
    if (newPassword.length < 8) {
      return setError("Password must be at least 8 characters");
    }

    setIsChangingPassword(true);
    setError("");
    setSuccess("");

    try {
      await api.changePassword({ currentPassword, newPassword });
      setSuccess("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err.message || "Failed to change password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const updateEmail = async () => {
    setIsUpdatingEmail(true);
    setError("");
    setSuccess("");

    try {
      await api.updateEmail({ newEmail, password: emailPassword });
      setSuccess("Email updated. Please check your inbox for verification.");
      setNewEmail("");
      setEmailPassword("");
    } catch (err: any) {
      setError(err.message || "Failed to update email");
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const saveNotifications = async () => {
    setIsSavingNotifications(true);
    setError("");
    setSuccess("");

    try {
      await api.updateNotificationPreferences(notifications);
      setSuccess("Notification preferences updated");
    } catch (err: any) {
      setError(err.message || "Failed to update notifications");
    } finally {
      setIsSavingNotifications(false);
    }
  };

  const toggleTheme = (newTheme: "light" | "dark") => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  const deleteAccount = async () => {
    if (deleteConfirmation !== "DELETE") {
      return setError('Please type "DELETE" to confirm');
    }

    setIsDeletingAccount(true);
    setError("");
    setSuccess("");

    try {
      await api.deleteAccount({ password: deletePassword, confirmation: deleteConfirmation });
      localStorage.clear();
      navigate("/login");
    } catch (err: any) {
      setError(err.message || "Failed to delete account");
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const logout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const revokeAllSessions = async () => {
    try {
      await api.revokeAllSessions();
      setSuccess("All other sessions revoked");
      loadSessions();
    } catch (err: any) {
      setError(err.message || "Failed to revoke sessions");
    }
  };

  const revokeSession = async (sessionId: string) => {
    try {
      await api.revokeSession(sessionId);
      setSuccess("Session revoked");
      loadSessions();
    } catch (err: any) {
      setError(err.message || "Failed to revoke session");
    }
  };

  return (
    <div className="app-shell">
      <Sidebar mobileNav={mobileNav} summary={summary} />
      {mobileNav && (
        <button
          className="mobile-overlay"
          onClick={() => setMobileNav(false)}
          aria-label="Close menu"
        />
      )}
      <main>
        <Topbar search="" setSearch={() => {}} setMobileNav={setMobileNav} />
        <div className="content">
          <section className="hero-row">
            <div>
              <p className="eyebrow">SETTINGS</p>
              <h1>Settings</h1>
              <p>Manage your account settings and preferences.</p>
            </div>
          </section>

          {/* Error/Success Messages */}
          {error && (
            <div className="upload-error flex items-center gap-2 text-red-600 mb-4">
              <AlertCircle size={18} />
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700 mb-4">
              <Check size={18} />
              {success}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-4 border-b border-[var(--border-color)] mb-6 overflow-x-auto">
            <button
              className={`pb-3 px-1 font-medium transition-colors whitespace-nowrap ${
                activeTab === "profile"
                  ? "text-[var(--accent-blue)] border-b-2 border-[var(--accent-blue)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
              onClick={() => setActiveTab("profile")}
            >
              <div className="flex items-center gap-2">
                <User size={18} />
                Profile
              </div>
            </button>
            <button
              className={`pb-3 px-1 font-medium transition-colors whitespace-nowrap ${
                activeTab === "security"
                  ? "text-[var(--accent-blue)] border-b-2 border-[var(--accent-blue)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
              onClick={() => setActiveTab("security")}
            >
              <div className="flex items-center gap-2">
                <Shield size={18} />
                Security
              </div>
            </button>
            <button
              className={`pb-3 px-1 font-medium transition-colors whitespace-nowrap ${
                activeTab === "appearance"
                  ? "text-[var(--accent-blue)] border-b-2 border-[var(--accent-blue)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
              onClick={() => setActiveTab("appearance")}
            >
              <div className="flex items-center gap-2">
                <Palette size={18} />
                Appearance
              </div>
            </button>
            <button
              className={`pb-3 px-1 font-medium transition-colors whitespace-nowrap ${
                activeTab === "notifications"
                  ? "text-[var(--accent-blue)] border-b-2 border-[var(--accent-blue)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
              onClick={() => setActiveTab("notifications")}
            >
              <div className="flex items-center gap-2">
                <Bell size={18} />
                Notifications
              </div>
            </button>
            <button
              className={`pb-3 px-1 font-medium transition-colors whitespace-nowrap ${
                activeTab === "sessions"
                  ? "text-[var(--accent-blue)] border-b-2 border-[var(--accent-blue)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
              onClick={() => setActiveTab("sessions")}
            >
              <div className="flex items-center gap-2">
                <Monitor size={18} />
                Sessions
              </div>
            </button>
          </div>

          {/* Profile Tab */}
          {activeTab === "profile" && (
            <div className="form-fields">
              <div className="flex items-center gap-6 mb-6">
                <div className="w-24 h-24 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center overflow-hidden">
                  {avatar ? (
                    <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-bold text-[var(--text-muted)]">
                      {name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <button
                    className="button ghost mb-2"
                    onClick={generateAvatar}
                  >
                    <Camera size={18} /> Generate Avatar
                  </button>
                  <p className="text-sm text-[var(--text-muted)]">
                    Generate an avatar based on your initials
                  </p>
                </div>
              </div>

              <div className="field-label">
                <span>Name</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                />
              </div>

              <div className="field-label">
                <span>Email</span>
                <input
                  type="email"
                  value={profile?.email || ""}
                  disabled
                  className="bg-[var(--bg-tertiary)]"
                />
              </div>

              <div className="field-label">
                <span>Bio</span>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself"
                  rows={4}
                  maxLength={500}
                />
                <div className="text-xs text-[var(--text-muted)] mt-1">
                  {bio.length}/500
                </div>
              </div>

              <button
                className="button bg-[var(--accent-blue)] text-white"
                onClick={saveProfile}
                disabled={isSavingProfile}
              >
                {isSavingProfile ? "Saving..." : <><Save size={18} /> Save Changes</>}
              </button>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === "security" && (
            <div className="form-fields">
              <h3 className="font-medium text-[var(--text-primary)] mb-4">Change Password</h3>
              
              <div className="field-label">
                <span>Current Password</span>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                />
              </div>

              <div className="field-label">
                <span>New Password</span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 8 characters)"
                />
              </div>

              <div className="field-label">
                <span>Confirm New Password</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>

              <button
                className="button bg-[var(--accent-blue)] text-white"
                onClick={changePassword}
                disabled={isChangingPassword}
              >
                {isChangingPassword ? "Changing..." : "Change Password"}
              </button>

              <div className="border-t border-[var(--border-color)] pt-6 mt-6">
                <h3 className="font-medium text-[var(--text-primary)] mb-4">Change Email</h3>
                
                <div className="field-label">
                  <span>New Email</span>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Enter new email address"
                  />
                </div>

                <div className="field-label">
                  <span>Password</span>
                  <input
                    type="password"
                    value={emailPassword}
                    onChange={(e) => setEmailPassword(e.target.value)}
                    placeholder="Enter your password"
                  />
                </div>

                <button
                  className="button bg-[var(--accent-blue)] text-white"
                  onClick={updateEmail}
                  disabled={isUpdatingEmail}
                >
                  {isUpdatingEmail ? "Updating..." : "Update Email"}
                </button>
              </div>

              <div className="border-t border-[var(--border-color)] pt-6 mt-6">
                <h3 className="font-medium text-red-600 mb-4">Danger Zone</h3>
                
                <div className="field-label">
                  <span>Password</span>
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Enter your password to delete account"
                  />
                </div>

                <div className="field-label">
                  <span>Type "DELETE" to confirm</span>
                  <input
                    type="text"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    placeholder="DELETE"
                  />
                </div>

                <button
                  className="button bg-red-600 text-white"
                  onClick={deleteAccount}
                  disabled={isDeletingAccount}
                >
                  {isDeletingAccount ? "Deleting..." : <><Trash2 size={18} /> Delete Account</>}
                </button>
              </div>
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === "appearance" && (
            <div className="form-fields">
              <h3 className="font-medium text-[var(--text-primary)] mb-4">Theme</h3>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <button
                  className={`p-4 rounded-lg border-2 transition-all ${
                    theme === "light"
                      ? "border-[var(--accent-blue)] bg-[var(--bg-tertiary)]"
                      : "border-[var(--border-color)]"
                  }`}
                  onClick={() => toggleTheme("light")}
                >
                  <Sun size={24} className="mb-2" />
                  <div className="font-medium">Light</div>
                  <div className="text-sm text-[var(--text-muted)]">Clean and bright</div>
                </button>
                <button
                  className={`p-4 rounded-lg border-2 transition-all ${
                    theme === "dark"
                      ? "border-[var(--accent-blue)] bg-[var(--bg-tertiary)]"
                      : "border-[var(--border-color)]"
                  }`}
                  onClick={() => toggleTheme("dark")}
                >
                  <Moon size={24} className="mb-2" />
                  <div className="font-medium">Dark</div>
                  <div className="text-sm text-[var(--text-muted)]">Easy on the eyes</div>
                </button>
              </div>

              <div className="field-label">
                <span>Language</span>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                  <option value="zh">中文</option>
                </select>
              </div>

              <div className="field-label">
                <span>Timezone</span>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                >
                  <option value="UTC">UTC (Coordinated Universal Time)</option>
                  <option value="America/New_York">Eastern Time (ET)</option>
                  <option value="America/Los_Angeles">Pacific Time (PT)</option>
                  <option value="Europe/London">London (GMT)</option>
                  <option value="Asia/Tokyo">Tokyo (JST)</option>
                </select>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === "notifications" && (
            <div className="form-fields">
              <h3 className="font-medium text-[var(--text-primary)] mb-4">Email Notifications</h3>
              
              <div className="space-y-4">
                <label className="flex items-center justify-between p-4 bg-[var(--bg-tertiary)] rounded-lg cursor-pointer">
                  <div>
                    <div className="font-medium text-[var(--text-primary)]">Email Notifications</div>
                    <div className="text-sm text-[var(--text-muted)]">Receive email notifications</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.emailNotifications}
                    onChange={(e) => setNotifications({ ...notifications, emailNotifications: e.target.checked })}
                    className="w-5 h-5"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-[var(--bg-tertiary)] rounded-lg cursor-pointer">
                  <div>
                    <div className="font-medium text-[var(--text-primary)]">Document Shared</div>
                    <div className="text-sm text-[var(--text-muted)]">When someone shares a document with you</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.documentShared}
                    onChange={(e) => setNotifications({ ...notifications, documentShared: e.target.checked })}
                    className="w-5 h-5"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-[var(--bg-tertiary)] rounded-lg cursor-pointer">
                  <div>
                    <div className="font-medium text-[var(--text-primary)]">Document Verified</div>
                    <div className="text-sm text-[var(--text-muted)]">When your document is verified</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.documentVerified}
                    onChange={(e) => setNotifications({ ...notifications, documentVerified: e.target.checked })}
                    className="w-5 h-5"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-[var(--bg-tertiary)] rounded-lg cursor-pointer">
                  <div>
                    <div className="font-medium text-[var(--text-primary)]">Expiry Reminders</div>
                    <div className="text-sm text-[var(--text-muted)]">Remind before documents expire</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.expiryReminders}
                    onChange={(e) => setNotifications({ ...notifications, expiryReminders: e.target.checked })}
                    className="w-5 h-5"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-[var(--bg-tertiary)] rounded-lg cursor-pointer">
                  <div>
                    <div className="font-medium text-[var(--text-primary)]">Team Updates</div>
                    <div className="text-sm text-[var(--text-muted)]">Updates from your team</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.teamUpdates}
                    onChange={(e) => setNotifications({ ...notifications, teamUpdates: e.target.checked })}
                    className="w-5 h-5"
                  />
                </label>
              </div>

              <button
                className="button bg-[var(--accent-blue)] text-white mt-6"
                onClick={saveNotifications}
                disabled={isSavingNotifications}
              >
                {isSavingNotifications ? "Saving..." : <><Save size={18} /> Save Preferences</>}
              </button>
            </div>
          )}

          {/* Sessions Tab */}
          {activeTab === "sessions" && (
            <div className="form-fields">
              <h3 className="font-medium text-[var(--text-primary)] mb-4">Active Sessions</h3>
              
              {isLoadingSessions ? (
                <div className="text-center text-[var(--text-muted)] py-4">Loading sessions...</div>
              ) : sessions.length === 0 ? (
                <div className="text-center text-[var(--text-muted)] py-4">No active sessions</div>
              ) : (
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className="p-4 bg-[var(--bg-tertiary)] rounded-lg flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <Monitor size={24} />
                        <div>
                          <div className="font-medium text-[var(--text-primary)]">
                            {session.userAgent}
                          </div>
                          <div className="text-sm text-[var(--text-muted)]">
                            {session.ipAddress} • {new Date(session.createdAt).toLocaleString()}
                          </div>
                          <div className="text-xs text-[var(--text-muted)] mt-1">
                            Expires: {new Date(session.expiresAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {session.isCurrent && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Current</span>
                        )}
                        {!session.isCurrent && (
                          <button
                            className="icon-button text-red-500 hover:text-red-700"
                            onClick={() => revokeSession(session.id)}
                            title="Revoke session"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-[var(--border-color)] pt-6 mt-6">
                <h3 className="font-medium text-[var(--text-primary)] mb-4">Session Actions</h3>
                
                <button
                  className="button bg-[var(--accent-blue)] text-white w-full mb-3"
                  onClick={revokeAllSessions}
                >
                  <LogOut size={18} /> Logout from All Devices
                </button>

                <button
                  className="button bg-red-600 text-white w-full"
                  onClick={logout}
                >
                  <LogOut size={18} /> Logout Current Session
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

