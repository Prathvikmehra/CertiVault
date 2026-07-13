import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Users,
  Link as LinkIcon,
  Clock,
  Eye,
  Download,
  Copy,
  X,
  ChevronRight,
} from "lucide-react";
import { Sidebar } from "../components/Sidebar.js";
import { Topbar } from "../components/Topbar.js";
import { Summary, SharedDocument, SharedMember, AccessLog } from "../types.js";
import { api } from "../api.js";

type Tab = "my-shares" | "shared-with-me" | "access-logs";

export default function SharedVaults() {
  const navigate = useNavigate();
  const [summary] = useState<Summary>({ total: 0, verified: 0, pending: 0, rejected: 0, archived: 0, favorites: 0, storageBytes: 0 });
  const [mobileNav, setMobileNav] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("my-shares");

  // My shares
  const [myShares, setMyShares] = useState<SharedDocument[]>([]);
  const [isLoadingShares, setIsLoadingShares] = useState(false);

  // Shared with me
  const [sharedWithMe, setSharedWithMe] = useState<SharedMember[]>([]);
  const [isLoadingSharedWithMe, setIsLoadingSharedWithMe] = useState(false);

  // Access logs
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (activeTab === "my-shares") loadMyShares();
    if (activeTab === "shared-with-me") loadSharedWithMe();
    if (activeTab === "access-logs") loadAccessLogs();
  }, [activeTab]);

  const loadMyShares = async () => {
    setIsLoadingShares(true);
    setError("");
    try {
      const response = await api.getUserShares();
      setMyShares(response.data.shares);
    } catch (err: any) {
      setError(err.message || "Failed to load shares");
    } finally {
      setIsLoadingShares(false);
    }
  };

  const loadSharedWithMe = async () => {
    setIsLoadingSharedWithMe(true);
    setError("");
    try {
      const response = await api.getSharedWithMe();
      setSharedWithMe(response.data.members);
    } catch (err: any) {
      setError(err.message || "Failed to load shared documents");
    } finally {
      setIsLoadingSharedWithMe(false);
    }
  };

  const loadAccessLogs = async () => {
    setIsLoadingLogs(true);
    setError("");
    try {
      const response = await api.getUserAccessLogs();
      setAccessLogs(response.data.logs);
    } catch (err: any) {
      setError(err.message || "Failed to load access logs");
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const revokeShare = async (shareId: string) => {
    try {
      await api.revokeShare(shareId);
      setSuccess("Share link revoked");
      loadMyShares();
    } catch (err: any) {
      setError(err.message || "Failed to revoke share");
    }
  };

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setSuccess("Link copied to clipboard");
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      setError("Failed to copy to clipboard");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "view": return <Eye size={16} />;
      case "download": return <Download size={16} />;
      case "share": return <LinkIcon size={16} />;
      default: return <AlertCircle size={16} />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "view": return "text-blue-500";
      case "download": return "text-green-500";
      case "share": return "text-purple-500";
      case "revoke": return "text-red-500";
      default: return "text-gray-500";
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
              <p className="eyebrow">SHARED VAULTS</p>
              <h1>Shared Vaults</h1>
              <p>Manage shared document links and access.</p>
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
              <AlertCircle size={18} />
              {success}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-4 border-b border-[var(--border-color)] mb-6">
            <button
              className={`pb-3 px-1 font-medium transition-colors ${
                activeTab === "my-shares"
                  ? "text-[var(--accent-blue)] border-b-2 border-[var(--accent-blue)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
              onClick={() => setActiveTab("my-shares")}
            >
              <div className="flex items-center gap-2">
                <LinkIcon size={18} />
                My Shares ({myShares.length})
              </div>
            </button>
            <button
              className={`pb-3 px-1 font-medium transition-colors ${
                activeTab === "shared-with-me"
                  ? "text-[var(--accent-blue)] border-b-2 border-[var(--accent-blue)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
              onClick={() => setActiveTab("shared-with-me")}
            >
              <div className="flex items-center gap-2">
                <Users size={18} />
                Shared with Me ({sharedWithMe.length})
              </div>
            </button>
            <button
              className={`pb-3 px-1 font-medium transition-colors ${
                activeTab === "access-logs"
                  ? "text-[var(--accent-blue)] border-b-2 border-[var(--accent-blue)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
              onClick={() => setActiveTab("access-logs")}
            >
              <div className="flex items-center gap-2">
                <Clock size={18} />
                Access Logs
              </div>
            </button>
          </div>

          {/* My Shares Tab */}
          {activeTab === "my-shares" && (
            <div>
              {isLoadingShares ? (
                <div className="text-center text-[var(--text-muted)] py-8">Loading shares...</div>
              ) : myShares.length === 0 ? (
                <div className="empty-state">
                  <LinkIcon size={64} />
                  <h3>No Shared Documents</h3>
                  <p>You haven't shared any documents yet. Go to Documents to share a document.</p>
                  <button className="button primary" onClick={() => navigate("/documents")}>
                    Go to Documents
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {myShares.map((share) => (
                    <div
                      key={share._id}
                      className="p-4 bg-[var(--bg-tertiary)] rounded-lg flex items-center justify-between"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-[var(--text-primary)]">{share.documentTitle}</h3>
                          {!share.isActive && (
                            <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">Revoked</span>
                          )}
                        </div>
                        <div className="text-sm text-[var(--text-muted)] mt-1">
                          {share.documentFileName}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-[var(--text-muted)]">
                          {share.expiresAt && (
                            <span className="flex items-center gap-1">
                              <Clock size={12} />
                              Expires: {formatDate(share.expiresAt)}
                            </span>
                          )}
                          {share.maxAccessCount && (
                            <span>
                              Access: {share.currentAccessCount}/{share.maxAccessCount}
                            </span>
                          )}
                          <span>
                            Created: {formatDate(share.createdAt)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          className="icon-button"
                          onClick={() => copyToClipboard(share.shareUrl)}
                          title="Copy link"
                        >
                          <Copy size={18} />
                        </button>
                        {share.isActive && (
                          <button
                            className="icon-button text-red-500 hover:text-red-700"
                            onClick={() => revokeShare(share._id)}
                            title="Revoke share"
                          >
                            <X size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Shared with Me Tab */}
          {activeTab === "shared-with-me" && (
            <div>
              {isLoadingSharedWithMe ? (
                <div className="text-center text-[var(--text-muted)] py-8">Loading shared documents...</div>
              ) : sharedWithMe.length === 0 ? (
                <div className="empty-state">
                  <Users size={64} />
                  <h3>No Shared Documents</h3>
                  <p>No one has shared documents with you yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sharedWithMe.map((member) => (
                    <div
                      key={member._id}
                      className="p-4 bg-[var(--bg-tertiary)] rounded-lg flex items-center justify-between"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-[var(--text-primary)]">
                            {member.invitedByName}
                          </h3>
                          <span className={`px-2 py-1 rounded text-xs ${
                            member.permission === "admin"
                              ? "bg-purple-100 text-purple-700"
                              : member.permission === "editor"
                              ? "bg-green-100 text-green-700"
                              : "bg-blue-100 text-blue-700"
                          }`}>
                            {member.permission}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs ${
                            member.inviteStatus === "accepted"
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}>
                            {member.inviteStatus}
                          </span>
                        </div>
                        <div className="text-sm text-[var(--text-muted)] mt-1">
                          {member.invitedByEmail}
                        </div>
                        <div className="text-xs text-[var(--text-muted)] mt-2">
                          Shared: {formatDate(member.createdAt)}
                        </div>
                      </div>
                      <button
                        className="icon-button ml-4"
                        onClick={() => navigate(`/documents`)}
                        title="View document"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Access Logs Tab */}
          {activeTab === "access-logs" && (
            <div>
              {isLoadingLogs ? (
                <div className="text-center text-[var(--text-muted)] py-8">Loading access logs...</div>
              ) : accessLogs.length === 0 ? (
                <div className="empty-state">
                  <Clock size={64} />
                  <h3>No Access Logs</h3>
                  <p>No access activity recorded yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {accessLogs.map((log) => (
                    <div
                      key={log._id}
                      className="p-3 bg-[var(--bg-tertiary)] rounded-lg flex items-center gap-3"
                    >
                      <div className={`p-2 rounded-full bg-[var(--bg-secondary)] ${getActionColor(log.action)}`}>
                        {getActionIcon(log.action)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[var(--text-primary)] capitalize">
                            {log.action}
                          </span>
                          <span className="text-sm text-[var(--text-muted)]">
                            {log.documentTitle}
                          </span>
                        </div>
                        <div className="text-xs text-[var(--text-muted)] mt-1">
                          {log.userEmail} • {formatDate(log.createdAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

