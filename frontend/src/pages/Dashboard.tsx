import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  FileClock,
  Files,
  HardDrive,
  ShieldCheck,
  Upload,
  Search,
  Share2,
  Star,
  XCircle,
  Bell,
} from "lucide-react";
import { api } from "../api.js";
import { Document, Summary, Activity, Notification } from "../types.js";
import { Sidebar } from "../components/Sidebar.js";
import { Topbar } from "../components/Topbar.js";
import { StatCard } from "../components/StatCard.js";
import { StatCardSkeleton } from "../components/SkeletonLoader.js";
import { ActivityTimeline } from "../components/ActivityTimeline.js";
import { Notifications } from "../components/Notifications.js";
import { UploadModal } from "../components/UploadModal.js";

const formatBytes = (bytes?: number) => {
  if (!bytes) return "0 MB";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index > 1 ? 1 : 0)} ${units[index]}`;
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<Summary>({ total: 0, verified: 0, pending: 0, rejected: 0, archived: 0, favorites: 0, storageBytes: 0 });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [recentDocuments, setRecentDocuments] = useState<Document[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [userName, setUserName] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [summaryResponse, activitiesResponse, notificationsResponse, recentResponse] = await Promise.all([
        api.getDocumentSummary(),
        api.getActivityTimeline(10),
        api.getNotifications(5),
        api.getRecentDocuments(5),
      ]);
      setSummary({
        ...summaryResponse.data,
        rejected: summaryResponse.data.rejected || 0,
      });
      setActivities(activitiesResponse.data);
      setNotifications(notificationsResponse);
      setRecentDocuments(recentResponse.data);
      
      // Get user name from auth context or localStorage
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setUserName(user.name || user.email?.split("@")[0] || "User");
      }
    } catch (error: any) {
      console.error("Failed to load dashboard data:", error);
      setToast(error.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const refreshAfterUpload = async () => {
    setUploadOpen(false);
    setToast("Document uploaded successfully.");
    await load();
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case "upload":
        setUploadOpen(true);
        break;
      case "verify":
        navigate("/documents?status=pending");
        break;
      case "share":
        navigate("/shared-vaults");
        break;
      case "search":
        navigate("/documents");
        break;
    }
  };

  const dismissNotification = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id));
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
        <Topbar setMobileNav={setMobileNav} />
        <div className="content">
          <section className="hero-row">
            <div>
              <p className="eyebrow">DOCUMENT COMMAND CENTER</p>
              <h1>{getGreeting()}, {userName || "User"}.</h1>
              <p>Here's what's happening across your secure workspace.</p>
            </div>
            <button
              className="button primary upload-button"
              onClick={() => setUploadOpen(true)}
            >
              <Upload size={18} /> Upload document
            </button>
          </section>

          {/* Stats Grid */}
          <section className="stats-grid">
            {loading ? (
              <>
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
              </>
            ) : (
              <>
                <StatCard
                  icon={Files}
                  label="Total Documents"
                  value={summary.total}
                  note="Across your workspace"
                  tone="blue"
                />
                <StatCard
                  icon={CheckCircle2}
                  label="Verified"
                  value={summary.verified}
                  note={`${
                    summary.total
                      ? Math.round((summary.verified / summary.total) * 100)
                      : 0
                  }% verification rate`}
                  tone="green"
                />
                <StatCard
                  icon={FileClock}
                  label="Pending"
                  value={summary.pending}
                  note="Requires attention"
                  tone="amber"
                />
                <StatCard
                  icon={XCircle}
                  label="Rejected"
                  value={summary.rejected}
                  note="Verification failed"
                  tone="red"
                />
                <StatCard
                  icon={Star}
                  label="Favorites"
                  value={summary.favorites}
                  note="Starred documents"
                  tone="violet"
                />
                <StatCard
                  icon={HardDrive}
                  label="Storage Used"
                  value={formatBytes(summary.storageBytes)}
                  note="Encrypted at rest"
                  tone="blue"
                />
              </>
            )}
          </section>

          {/* Quick Actions */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <button
                className="flex flex-col items-center gap-3 p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl hover:border-blue-500 transition-all hover:transform hover:-translate-y-1"
                onClick={() => handleQuickAction("upload")}
              >
                <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                  <Upload size={24} className="text-blue-500" />
                </div>
                <span className="text-sm font-medium text-[var(--text-primary)]">Upload</span>
              </button>
              <button
                className="flex flex-col items-center gap-3 p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl hover:border-green-500 transition-all hover:transform hover:-translate-y-1"
                onClick={() => handleQuickAction("verify")}
              >
                <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                  <CheckCircle2 size={24} className="text-green-500" />
                </div>
                <span className="text-sm font-medium text-[var(--text-primary)]">Verify</span>
              </button>
              <button
                className="flex flex-col items-center gap-3 p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl hover:border-violet-500 transition-all hover:transform hover:-translate-y-1"
                onClick={() => handleQuickAction("share")}
              >
                <div className="w-12 h-12 bg-violet-500/10 rounded-lg flex items-center justify-center">
                  <Share2 size={24} className="text-violet-500" />
                </div>
                <span className="text-sm font-medium text-[var(--text-primary)]">Share</span>
              </button>
              <button
                className="flex flex-col items-center gap-3 p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl hover:border-amber-500 transition-all hover:transform hover:-translate-y-1"
                onClick={() => handleQuickAction("search")}
              >
                <div className="w-12 h-12 bg-amber-500/10 rounded-lg flex items-center justify-center">
                  <Search size={24} className="text-amber-500" />
                </div>
                <span className="text-sm font-medium text-[var(--text-primary)]">Search</span>
              </button>
            </div>
          </section>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Recent Activity Timeline */}
            <ActivityTimeline activities={activities} loading={loading} />
            
            {/* Notifications */}
            <Notifications 
              notifications={notifications} 
              loading={loading}
              onDismiss={dismissNotification}
            />
          </div>

          {/* Recent Uploads */}
          <section className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">Recent Uploads</h2>
              <button
                className="button ghost text-sm"
                onClick={() => navigate("/documents")}
              >
                View All
              </button>
            </div>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 animate-pulse">
                    <div className="w-12 h-12 bg-[var(--bg-tertiary)] rounded-lg mb-3" />
                    <div className="h-4 bg-[var(--bg-tertiary)] rounded w-3/4 mb-2" />
                    <div className="h-3 bg-[var(--bg-tertiary)] rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : recentDocuments.length === 0 ? (
              <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-8 text-center">
                <Files size={48} className="mx-auto text-[var(--text-muted)] mb-3" />
                <p className="text-[var(--text-secondary)]">No recent uploads</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {recentDocuments.map((doc) => (
                  <div
                    key={doc._id}
                    className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 cursor-pointer hover:border-blue-500 transition-all"
                    onClick={() => navigate(`/documents/${doc._id}`)}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-violet-500 rounded-lg flex items-center justify-center text-white text-xl font-bold">
                        {doc.fileName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                          {doc.title}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] truncate">
                          {formatBytes(doc.fileSize)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`badge ${doc.status === "verified" ? "green" : doc.status === "rejected" ? "red" : "amber"}`}>
                        {doc.status}
                      </span>
                      {doc.isFavorite && <Star size={16} className="text-amber-500 fill-amber-500" />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <footer>
            <span>
              <ShieldCheck size={15} /> Protected by CertiVault integrity controls
            </span>
            <span>ECSoC 2026 · Project Admin</span>
          </footer>
        </div>
      </main>
      {uploadOpen && (
        <UploadModal onClose={() => setUploadOpen(false)} onUploaded={refreshAfterUpload} />
      )}
      {toast && (
        <div className="toast">
          <CheckCircle2 size={18} />
          {toast}
        </div>
      )}
    </div>
  );
}

