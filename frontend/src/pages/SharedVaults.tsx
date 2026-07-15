import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Users, Link as LinkIcon, Clock, Eye, Download, Copy, X, ChevronRight, CheckCircle2 } from "lucide-react";
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
  const [myShares, setMyShares] = useState<SharedDocument[]>([]);
  const [isLoadingShares, setIsLoadingShares] = useState(false);
  const [sharedWithMe, setSharedWithMe] = useState<SharedMember[]>([]);
  const [isLoadingSharedWithMe, setIsLoadingSharedWithMe] = useState(false);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (activeTab === "my-shares")       loadMyShares();
    if (activeTab === "shared-with-me")  loadSharedWithMe();
    if (activeTab === "access-logs")     loadAccessLogs();
  }, [activeTab]);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(""), 2500);
    return () => clearTimeout(t);
  }, [success]);

  const loadMyShares = async () => {
    setIsLoadingShares(true); setError("");
    try { const r = await api.getUserShares(); setMyShares(r.data.shares); }
    catch (err: any) { setError(err.message || "Failed to load shares"); }
    finally { setIsLoadingShares(false); }
  };
  const loadSharedWithMe = async () => {
    setIsLoadingSharedWithMe(true); setError("");
    try { const r = await api.getSharedWithMe(); setSharedWithMe(r.data.members); }
    catch (err: any) { setError(err.message || "Failed to load shared documents"); }
    finally { setIsLoadingSharedWithMe(false); }
  };
  const loadAccessLogs = async () => {
    setIsLoadingLogs(true); setError("");
    try { const r = await api.getUserAccessLogs(); setAccessLogs(r.data.logs); }
    catch (err: any) { setError(err.message || "Failed to load access logs"); }
    finally { setIsLoadingLogs(false); }
  };
  const revokeShare = async (id: string) => {
    try { await api.revokeShare(id); setSuccess("Share link revoked"); loadMyShares(); }
    catch (err: any) { setError(err.message || "Failed to revoke share"); }
  };
  const copyToClipboard = async (url: string) => {
    try { await navigator.clipboard.writeText(url); setSuccess("Link copied to clipboard"); }
    catch { setError("Failed to copy to clipboard"); }
  };

  const fmt = (s: string) => new Date(s).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

  const actionIcon = (action: string) => {
    if (action === "view")     return <Eye size={15} />;
    if (action === "download") return <Download size={15} />;
    if (action === "share")    return <LinkIcon size={15} />;
    return <AlertCircle size={15} />;
  };
  const actionColor = (action: string) => {
    if (action === "view")     return "var(--accent-blue)";
    if (action === "download") return "var(--accent-green)";
    if (action === "share")    return "var(--accent-violet)";
    if (action === "revoke")   return "var(--accent-red)";
    return "var(--text-muted)";
  };

  return (
    <div className="app-shell">
      <Sidebar mobileNav={mobileNav} summary={summary} />
      {mobileNav && <button className="mobile-overlay" onClick={() => setMobileNav(false)} aria-label="Close navigation" />}
      <main>
        <Topbar search="" setSearch={() => {}} setMobileNav={setMobileNav} />
        <div className="content">

          <section className="hero-row">
            <div>
              <p className="eyebrow">Shared Vaults</p>
              <h1>Shared Vaults</h1>
              <p>Manage shared document links and access.</p>
            </div>
          </section>

          {/* Messages */}
          {error && (
            <div className="upload-error" style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }} role="alert">
              <AlertCircle size={16} aria-hidden="true" />{error}
            </div>
          )}
          {success && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 0.875rem", background: "rgba(16,185,129,.08)", border: "1px solid rgba(16,185,129,.2)", borderRadius: "var(--radius-md)", color: "var(--accent-green)", fontSize: "0.875rem", marginBottom: "1rem" }} role="status">
              <CheckCircle2 size={16} aria-hidden="true" />{success}
            </div>
          )}

          {/* Tabs */}
          <div className="tabs" role="tablist">
            {([
              { key: "my-shares",      icon: <LinkIcon size={16} />, label: `My Shares (${myShares.length})` },
              { key: "shared-with-me", icon: <Users size={16} />,    label: `Shared with Me (${sharedWithMe.length})` },
              { key: "access-logs",    icon: <Clock size={16} />,    label: "Access Logs" },
            ] as const).map(({ key, icon, label }) => (
              <button key={key} role="tab" aria-selected={activeTab === key}
                className={`tab-btn ${activeTab === key ? "active" : ""}`}
                onClick={() => setActiveTab(key as Tab)}>
                {icon}{label}
              </button>
            ))}
          </div>

          {/* My Shares */}
          {activeTab === "my-shares" && (
            isLoadingShares ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}><div className="spinner" /></div>
            ) : myShares.length === 0 ? (
              <div className="empty-state">
                <LinkIcon size={52} />
                <h3>No shared documents</h3>
                <p>You haven't shared any documents yet.</p>
                <button className="button primary" onClick={() => navigate("/documents")}>Go to Documents</button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                {myShares.map(share => (
                  <div key={share._id} className="section-card-row card" style={{ display: "flex", alignItems: "flex-start", gap: "1rem", padding: "1rem 1.25rem" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem", flexWrap: "wrap" }}>
                        <h3 style={{ fontSize: "0.9375rem", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>{share.documentTitle}</h3>
                        {!share.isActive && <span className="badge red">Revoked</span>}
                      </div>
                      <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>{share.documentFileName}</p>
                      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {share.expiresAt && <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}><Clock size={12} />Expires {fmt(share.expiresAt)}</span>}
                        {share.maxAccessCount && <span>Access {share.currentAccessCount}/{share.maxAccessCount}</span>}
                        <span>Created {fmt(share.createdAt)}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "0.375rem", flexShrink: 0 }}>
                      <button className="icon-button" style={{ width: 32, height: 32 }} onClick={() => copyToClipboard(share.shareUrl)} title="Copy link" aria-label="Copy share link"><Copy size={15} /></button>
                      {share.isActive && (
                        <button className="icon-button" style={{ width: 32, height: 32, color: "var(--accent-red)" }} onClick={() => revokeShare(share._id)} title="Revoke" aria-label="Revoke share"><X size={15} /></button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Shared with Me */}
          {activeTab === "shared-with-me" && (
            isLoadingSharedWithMe ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}><div className="spinner" /></div>
            ) : sharedWithMe.length === 0 ? (
              <div className="empty-state">
                <Users size={52} />
                <h3>Nothing shared with you</h3>
                <p>No one has shared documents with you yet.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                {sharedWithMe.map(member => (
                  <div key={member._id} className="card" style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem 1.25rem" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem", flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.9375rem" }}>{member.invitedByName}</span>
                        <span className={`badge ${member.permission === "admin" ? "violet" : member.permission === "editor" ? "green" : "blue"}`}>{member.permission}</span>
                        <span className={`badge ${member.inviteStatus === "accepted" ? "green" : "amber"}`}>{member.inviteStatus}</span>
                      </div>
                      <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>{member.invitedByEmail}</p>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>Shared {fmt(member.createdAt)}</p>
                    </div>
                    <button className="icon-button" style={{ width: 32, height: 32 }} onClick={() => navigate("/documents")} aria-label="View document"><ChevronRight size={16} /></button>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Access Logs */}
          {activeTab === "access-logs" && (
            isLoadingLogs ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}><div className="spinner" /></div>
            ) : accessLogs.length === 0 ? (
              <div className="empty-state">
                <Clock size={52} />
                <h3>No access logs</h3>
                <p>No access activity has been recorded yet.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                {accessLogs.map(log => (
                  <div key={log._id} style={{ display: "flex", alignItems: "center", gap: "0.875rem", padding: "0.75rem 1rem", background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)" }}>
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--bg-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", color: actionColor(log.action), flexShrink: 0 }}>
                      {actionIcon(log.action)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.875rem", textTransform: "capitalize" }}>{log.action}</span>
                        <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>{log.documentTitle}</span>
                      </div>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.125rem" }}>{log.userEmail} · {fmt(log.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </main>
    </div>
  );
}
