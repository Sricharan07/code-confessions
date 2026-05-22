import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore, timeAgo, deletePost, deleteComment, toggleHidden } from "@/lib/store";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Users, 
  Layers, 
  MessageSquare, 
  AlertCircle, 
  Shield, 
  ShieldAlert, 
  Trash2, 
  Check, 
  X, 
  RefreshCw, 
  Search, 
  ArrowLeft, 
  Eye, 
  EyeOff, 
  CheckCircle,
  Clock,
  Sparkles
} from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: Admin,
  head: () => ({ meta: [{ title: "VibeFail — Admin Panel" }] }),
});

interface DBProfile {
  id: string;
  username: string;
  role: string;
  is_guest: boolean;
  status: string;
  created_at: string;
}

interface DBReport {
  id: string;
  reporter_session_id: string;
  target_type: "post" | "comment";
  target_id: string;
  reason: string;
  created_at: string;
}

function Admin() {
  const { posts, comments, user } = useStore();
  const [activeTab, setActiveTab] = useState<"reports" | "users" | "posts">("reports");
  
  // Real-time loaded states from Supabase (to show full list, including hidden/all)
  const [dbProfiles, setDbProfiles] = useState<DBProfile[]>([]);
  const [dbReports, setDbReports] = useState<DBReport[]>([]);
  const [allPosts, setAllPosts] = useState<any[]>([]);
  const [allComments, setAllComments] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchUser, setSearchUser] = useState("");
  const [searchPost, setSearchPost] = useState("");
  const [isBypassing, setIsBypassing] = useState(false);

  // Admin login credentials states
  const [adminUsernameInput, setAdminUsernameInput] = useState("");
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("vibefail.admin_authorized") === "true";
    }
    return false;
  });

  // Fetch all backend stats & tables
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch profiles
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (profilesData) setDbProfiles(profilesData);

      // 2. Fetch reports
      const { data: reportsData } = await supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });
      if (reportsData) setDbReports(reportsData);

      // 3. Fetch all posts (including hidden ones for mod viewing)
      const { data: postsData } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false });
      if (postsData) setAllPosts(postsData);

      // 4. Fetch all comments (including hidden ones)
      const { data: commentsData } = await supabase
        .from("comments")
        .select("*")
        .order("created_at", { ascending: false });
      if (commentsData) setAllComments(commentsData);

    } catch (err) {
      console.error("Error loading admin stats:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized && user) {
      fetchData();
    }
  }, [isAuthorized, user]);

  // Make user a moderator in Supabase
  const grantModeratorStatus = async () => {
    if (!user) return;
    setIsBypassing(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role: "moderator" })
        .eq("id", user.id);
      
      if (error) throw error;
      
      // Reload page to re-authenticate and sync context
      window.location.reload();
    } catch (err) {
      console.error("Failed to grant moderator status:", err);
      alert("Failed to grant moderator status. Check your connection.");
      setIsBypassing(false);
    }
  };

  // Toggle user role between moderator and user
  const toggleUserRole = async (profileId: string, currentRole: string) => {
    const newRole = currentRole === "moderator" ? "user" : "moderator";
    setActionLoading(`role-${profileId}`);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", profileId);
      
      if (error) throw error;
      setDbProfiles(prev => 
        prev.map(p => p.id === profileId ? { ...p, role: newRole } : p)
      );
    } catch (err) {
      console.error("Failed to toggle role:", err);
      alert("Failed to update user role.");
    } finally {
      setActionLoading(null);
    }
  };

  // Dismiss a report
  const handleDismissReport = async (reportId: string) => {
    setActionLoading(`dismiss-${reportId}`);
    try {
      const { error } = await supabase
        .from("reports")
        .delete()
        .eq("id", reportId);
      
      if (error) throw error;
      setDbReports(prev => prev.filter(r => r.id !== reportId));
    } catch (err) {
      console.error("Failed to dismiss report:", err);
      alert("Failed to dismiss report.");
    } finally {
      setActionLoading(null);
    }
  };

  // Delete reported content
  const handleDeleteContent = async (reportId: string, targetType: "post" | "comment", targetId: string) => {
    if (!window.confirm(`Are you sure you want to delete this ${targetType} and all reports associated with it?`)) return;
    setActionLoading(`delete-${reportId}`);
    try {
      if (targetType === "post") {
        await deletePost(targetId);
        // Clean up reports for this post
        await supabase.from("reports").delete().eq("target_type", "post").eq("target_id", targetId);
      } else {
        await deleteComment(targetId);
        // Clean up reports for this comment
        await supabase.from("reports").delete().eq("target_type", "comment").eq("target_id", targetId);
      }
      
      // Update local state
      setDbReports(prev => prev.filter(r => r.target_id !== targetId));
      if (targetType === "post") {
        setAllPosts(prev => prev.filter(p => p.id !== targetId));
      } else {
        setAllComments(prev => prev.filter(c => c.id !== targetId));
      }
    } catch (err) {
      console.error("Failed to delete content:", err);
      alert("Failed to delete offending content.");
    } finally {
      setActionLoading(null);
    }
  };

  // Toggle post visibility (hide/unhide)
  const handleTogglePostHidden = async (postId: string) => {
    setActionLoading(`hide-${postId}`);
    try {
      await toggleHidden(postId);
      setAllPosts(prev => 
        prev.map(p => p.id === postId ? { ...p, hidden: !p.hidden } : p)
      );
    } catch (err) {
      console.error("Failed to toggle post visibility:", err);
    } finally {
      setActionLoading(null);
    }
  };

  // Hard delete a post from list
  const handleHardDeletePost = async (postId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this confession?")) return;
    setActionLoading(`deletepost-${postId}`);
    try {
      await deletePost(postId);
      await supabase.from("reports").delete().eq("target_type", "post").eq("target_id", postId);
      setAllPosts(prev => prev.filter(p => p.id !== postId));
      setDbReports(prev => prev.filter(r => !(r.target_type === "post" && r.target_id === postId)));
    } catch (err) {
      console.error("Failed to hard delete post:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);

    const expectedUser = import.meta.env.VITE_ADMIN_USERNAME || "admin";
    const expectedPass = import.meta.env.VITE_ADMIN_PASSWORD || "DodgeViperSRT@999";

    if (adminUsernameInput !== expectedUser || adminPasswordInput !== expectedPass) {
      setLoginError("Invalid username or password. Access denied.");
      setIsLoggingIn(false);
      return;
    }

    try {
      // Elevate actual user profile role to moderator in the database automatically
      if (user && user.role !== "moderator") {
        const { error } = await supabase
          .from("profiles")
          .update({ role: "moderator" })
          .eq("id", user.id);
        
        if (error) {
          console.error("Failed to automatically elevate session role:", error);
        }
      }

      sessionStorage.setItem("vibefail.admin_authorized", "true");
      setIsAuthorized(true);
    } catch (err) {
      console.error("Authorization sync failed:", err);
      setLoginError("Authorization failed. DB synchronization error.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (!user) {
    return (
      <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center select-none font-sans">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-950/20 via-zinc-950 to-zinc-950 -z-10" />
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4" />
        <p className="text-xl font-bold text-zinc-100 tracking-tight">Authenticating Mod Desk...</p>
        <p className="text-[12px] text-zinc-500 mt-2 font-mono">Verifying local session with Supabase auth</p>
      </main>
    );
  }

  if (!isAuthorized) {
    return (
      <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden select-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/20 via-zinc-950 to-zinc-950 -z-10" />
        
        {/* Glow Effects */}
        <div className="absolute w-[300px] h-[300px] bg-indigo-500/10 blur-[100px] -top-10 rounded-full animate-pulse" />
        
        <div className="max-w-md w-full bg-zinc-900/50 border-2 border-indigo-500/20 rounded-3xl p-8 backdrop-blur-md shadow-2xl relative">
          <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mx-auto mb-6 text-indigo-400">
            <Shield className="w-8 h-8" />
          </div>
          
          <h1 className="text-3xl font-extrabold text-zinc-50 tracking-tight text-center mb-1">Moderator Portal</h1>
          <p className="text-xs text-zinc-400 text-center font-mono mb-8">
            Access to this console requires secure credentials.
          </p>

          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <div>
              <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block mb-1">Admin Username</label>
              <input
                type="text"
                required
                value={adminUsernameInput}
                onChange={(e) => setAdminUsernameInput(e.target.value)}
                placeholder="Enter username..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 placeholder-zinc-700 transition-colors"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block mb-1">Admin Password</label>
              <input
                type="password"
                required
                value={adminPasswordInput}
                onChange={(e) => setAdminPasswordInput(e.target.value)}
                placeholder="Enter password..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 placeholder-zinc-700 transition-colors"
              />
            </div>

            {loginError && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-450 p-3 rounded-xl text-xs flex items-center gap-2 font-mono">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white font-extrabold py-3 px-6 rounded-full text-xs shadow-lg uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              {isLoggingIn ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Authenticating Session...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  Unlock Command Desk
                </>
              )}
            </button>
          </form>
          
          <div className="mt-6 pt-4 border-t border-zinc-800 flex flex-col items-center gap-3">
            <p className="text-[9px] text-zinc-550 leading-normal text-center">
              Defaults: username <code className="bg-zinc-950 px-1 py-0.5 rounded font-mono text-zinc-400">admin</code> and password <code className="bg-zinc-950 px-1 py-0.5 rounded font-mono text-zinc-400">DodgeViperSRT@999</code> or configure via `.env` files.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-zinc-100 font-bold text-xs uppercase tracking-wider transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Feed
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Filter content lists
  const filteredUsers = dbProfiles.filter(p => 
    p.username?.toLowerCase().includes(searchUser.toLowerCase()) ||
    p.role?.toLowerCase().includes(searchUser.toLowerCase())
  );

  const filteredPosts = allPosts.filter(p => 
    p.title?.toLowerCase().includes(searchPost.toLowerCase()) ||
    p.body?.toLowerCase().includes(searchPost.toLowerCase()) ||
    p.author?.toLowerCase().includes(searchPost.toLowerCase())
  );

  // Helper to fetch details of reported targets
  const getReportedContent = (report: DBReport) => {
    if (report.target_type === "post") {
      const post = allPosts.find(p => p.id === report.target_id);
      return post ? {
        title: post.title,
        body: post.body,
        author: post.author,
        hidden: post.hidden,
      } : null;
    } else {
      const comment = allComments.find(c => c.id === report.target_id);
      const parentPost = comment ? allPosts.find(p => p.id === comment.post_id) : null;
      return comment ? {
        title: `Reply on post: "${parentPost?.title || 'Unknown Post'}"`,
        body: comment.body,
        author: comment.author,
        hidden: comment.hidden,
      } : null;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans select-none flex flex-col">
      {/* Top Tech Navigation */}
      <header className="border-b border-zinc-850 bg-zinc-950/60 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 rounded-full border border-zinc-800 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-extrabold uppercase bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/20 flex items-center gap-1">
                <Shield className="w-2.5 h-2.5" />
                Moderation Command
              </span>
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
            </div>
            <h1 className="text-xl font-black tracking-tight text-zinc-50">VibeFail Admin</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={fetchData}
            disabled={isLoading}
            className="p-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 rounded-xl border border-zinc-800 transition-colors disabled:opacity-50 flex items-center gap-2 font-semibold text-xs cursor-pointer"
            title="Reload backend data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Sync Realtime
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        
        {/* Glow Backdrop */}
        <div className="absolute w-[500px] h-[300px] bg-indigo-500/5 blur-[150px] top-40 left-10 rounded-full -z-10" />
        <div className="absolute w-[400px] h-[300px] bg-violet-500/5 blur-[120px] bottom-10 right-10 rounded-full -z-10" />

        {/* 1. Dashboard Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          
          {/* Card 1: Users */}
          <div className="bg-zinc-900/40 border border-zinc-850 rounded-2xl p-4 flex items-center gap-4 hover:border-zinc-800 transition-colors shadow-sm">
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-none">Total Profiles</p>
              <h2 className="text-2xl font-black text-zinc-100 mt-1">{dbProfiles.length}</h2>
            </div>
          </div>

          {/* Card 2: Confessions */}
          <div className="bg-zinc-900/40 border border-zinc-850 rounded-2xl p-4 flex items-center gap-4 hover:border-zinc-800 transition-colors shadow-sm">
            <div className="p-3 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-xl shrink-0">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-none">Confessions</p>
              <h2 className="text-2xl font-black text-zinc-100 mt-1">{allPosts.length}</h2>
            </div>
          </div>

          {/* Card 3: Comments */}
          <div className="bg-zinc-900/40 border border-zinc-850 rounded-2xl p-4 flex items-center gap-4 hover:border-zinc-800 transition-colors shadow-sm">
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl shrink-0">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-none">Replies</p>
              <h2 className="text-2xl font-black text-zinc-100 mt-1">{allComments.length}</h2>
            </div>
          </div>

          {/* Card 4: Reports */}
          <div className="bg-zinc-900/40 border border-zinc-850 rounded-2xl p-4 flex items-center gap-4 hover:border-zinc-800 transition-colors shadow-sm relative overflow-hidden">
            {dbReports.length > 0 && (
              <div className="absolute top-0 right-0 w-2 h-2 bg-rose-500 animate-pulse rounded-bl-full" />
            )}
            <div className={`p-3 rounded-xl shrink-0 ${
              dbReports.length > 0 
                ? "bg-rose-500/15 border border-rose-500/30 text-rose-450" 
                : "bg-zinc-800/50 border border-zinc-800 text-zinc-500"
            }`}>
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-none">Active Reports</p>
              <h2 className={`text-2xl font-black mt-1 ${dbReports.length > 0 ? "text-rose-450" : "text-zinc-400"}`}>
                {dbReports.length}
              </h2>
            </div>
          </div>

        </div>

        {/* 2. Main Workspace layout (Tabs + Tables) */}
        <div className="bg-zinc-900/20 border border-zinc-850 rounded-3xl overflow-hidden shadow-xl backdrop-blur-xs flex flex-col">
          
          {/* Tab Selection Row */}
          <div className="flex border-b border-zinc-850 bg-zinc-950/40 w-full overflow-x-auto scrollbar-none shrink-0">
            {[
              { id: "reports", label: `Reports Queue (${dbReports.length})`, count: dbReports.length },
              { id: "users", label: `User Directory (${filteredUsers.length})` },
              { id: "posts", label: `Confessions (${filteredPosts.length})` },
            ].map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-6 font-bold text-xs uppercase tracking-wider hover:bg-zinc-900/50 transition-colors relative shrink-0 cursor-pointer ${
                    active 
                      ? tab.id === "reports" && dbReports.length > 0 
                        ? "text-rose-450 font-black" 
                        : "text-indigo-400 font-black" 
                      : "text-zinc-500 font-semibold"
                  }`}
                >
                  {tab.label}
                  {active && (
                    <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${
                      tab.id === "reports" && dbReports.length > 0 ? "bg-rose-500" : "bg-indigo-500"
                    }`} />
                  )}
                </button>
              );
            })}
          </div>

          {/* 3. Tab contents */}
          <div className="p-4 sm:p-6 min-h-[400px]">
            
            {/* Loading Overlay */}
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
                <p className="text-xs font-semibold uppercase tracking-wider font-mono">Syncing database state...</p>
              </div>
            )}

            {!isLoading && (
              <>
                {/* Tab: REPORTS QUEUE */}
                {activeTab === "reports" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-zinc-850/50">
                      <div>
                        <h3 className="font-extrabold text-sm uppercase text-zinc-350 tracking-wider">Moderation Queue</h3>
                        <p className="text-[11px] text-zinc-500 mt-0.5">Reported confessions and support replies that require staff intervention.</p>
                      </div>
                      <span className="text-[10px] font-black tracking-widest bg-zinc-800 text-zinc-400 border border-zinc-700/60 px-2 py-0.5 rounded-full uppercase">
                        Requires Action
                      </span>
                    </div>

                    <div className="space-y-4 mt-2">
                      {dbReports.map((report) => {
                        const target = getReportedContent(report);
                        const isActionPending = actionLoading?.includes(report.id);
                        
                        return (
                          <div key={report.id} className="bg-zinc-900/30 border border-zinc-850 hover:border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all">
                            <div className="space-y-3 min-w-0 flex-1">
                              {/* Meta Info */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                  report.target_type === "post" 
                                    ? "bg-violet-500/10 border border-violet-500/20 text-violet-400" 
                                    : "bg-blue-500/10 border border-blue-500/20 text-blue-400"
                                }`}>
                                  {report.target_type}
                                </span>
                                <span className="text-zinc-600 font-mono text-[10px]">·</span>
                                <span className="text-[11px] text-rose-450 font-bold bg-rose-500/5 border border-rose-500/10 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3 shrink-0" />
                                  Reason: {report.reason}
                                </span>
                                <span className="text-zinc-600 font-mono text-[10px]">·</span>
                                <span className="text-[10px] text-zinc-500 font-semibold">{timeAgo(new Date(report.created_at).getTime())}</span>
                              </div>

                              {/* Target content snippet */}
                              {target ? (
                                <div className="bg-zinc-950/40 border border-zinc-900 rounded-xl p-3.5 text-left min-w-0">
                                  {report.target_type === "post" && (
                                    <h4 className="font-extrabold text-[13px] text-zinc-200 truncate mb-1">
                                      Title: {target.title}
                                    </h4>
                                  )}
                                  <p className="text-[12px] text-zinc-400 font-normal leading-relaxed break-words line-clamp-3 font-mono">
                                    &ldquo;{target.body}&rdquo;
                                  </p>
                                  <div className="text-[10px] text-zinc-550 mt-2 font-bold flex items-center gap-1.5">
                                    <span>Author: @{target.author || "anonymous"}</span>
                                    {target.hidden && (
                                      <span className="bg-zinc-800 text-zinc-400 px-1.5 py-0.2 rounded-md font-semibold">Hidden</span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="p-3 bg-zinc-950/20 border border-zinc-900 border-dashed rounded-xl text-xs text-zinc-500 italic">
                                  Content was already deleted or doesn't exist.
                                </div>
                              )}
                            </div>

                            {/* Actions panel */}
                            <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end border-t md:border-t-0 border-zinc-850/50 pt-3.5 md:pt-0">
                              <button
                                onClick={() => handleDismissReport(report.id)}
                                disabled={isActionPending}
                                className="px-4 py-2 border border-zinc-800 text-[11px] font-bold rounded-full hover:bg-zinc-900 hover:text-zinc-100 transition-colors uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                              >
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                                Dismiss
                              </button>
                              
                              {target && (
                                <button
                                  onClick={() => handleDeleteContent(report.id, report.target_type, report.target_id)}
                                  disabled={isActionPending}
                                  className="px-4 py-2 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-white text-[11px] font-bold rounded-full transition-colors uppercase tracking-wider flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Delete Content
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {dbReports.length === 0 && (
                        <div className="py-16 text-center text-zinc-500 flex flex-col items-center justify-center">
                          <div className="w-12 h-12 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mb-3 text-emerald-500">
                            <CheckCircle className="w-6 h-6" />
                          </div>
                          <h3 className="font-extrabold text-sm text-zinc-200">Moderation Inbox Clear</h3>
                          <p className="text-xs text-zinc-500 max-w-xs mt-1">Awesome! There are no reported confessions or replies in the queue.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tab: USER DIRECTORY */}
                {activeTab === "users" && (
                  <div className="space-y-4">
                    {/* Search Controls */}
                    <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between pb-3 border-b border-zinc-850/50">
                      <div>
                        <h3 className="font-extrabold text-sm uppercase text-zinc-350 tracking-wider">User Directory</h3>
                        <p className="text-[11px] text-zinc-500 mt-0.5">Manage registered vibe fail profiles and staff permissions.</p>
                      </div>
                      <div className="relative max-w-xs w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                          type="text"
                          placeholder="Search username..."
                          value={searchUser}
                          onChange={(e) => setSearchUser(e.target.value)}
                          className="w-full pl-9 pr-4 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 placeholder-zinc-550 transition-colors"
                        />
                      </div>
                    </div>

                    {/* Table View */}
                    <div className="overflow-x-auto border border-zinc-850 rounded-2xl mt-2 bg-zinc-950/20">
                      <table className="w-full text-left text-xs font-mono select-text">
                        <thead className="bg-zinc-950/80 text-zinc-400 border-b border-zinc-850">
                          <tr>
                            <th className="p-3.5 font-bold uppercase tracking-wider">Username</th>
                            <th className="p-3.5 font-bold uppercase tracking-wider">Handle Type</th>
                            <th className="p-3.5 font-bold uppercase tracking-wider">System Role</th>
                            <th className="p-3.5 font-bold uppercase tracking-wider">Status</th>
                            <th className="p-3.5 font-bold uppercase tracking-wider">Joined At</th>
                            <th className="p-3.5 font-bold uppercase tracking-wider text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-850/60">
                          {filteredUsers.map((profile) => {
                            const isPending = actionLoading === `role-${profile.id}`;
                            const isMe = user.id === profile.id;
                            
                            return (
                              <tr key={profile.id} className="hover:bg-zinc-900/10 transition-colors">
                                <td className="p-3.5 font-bold text-zinc-200">
                                  @{profile.username}
                                  {isMe && (
                                    <span className="ml-1.5 text-[9px] uppercase font-black px-1.5 py-0.2 bg-zinc-800 text-zinc-400 border border-zinc-700 rounded">You</span>
                                  )}
                                </td>
                                <td className="p-3.5">
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${
                                    profile.is_guest 
                                      ? "bg-zinc-900 text-zinc-400 border-zinc-800/80" 
                                      : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                                  }`}>
                                    {profile.is_guest ? "Guest Session" : "Claimed Account"}
                                  </span>
                                </td>
                                <td className="p-3.5">
                                  <span className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                                    profile.role === "moderator" 
                                      ? "text-indigo-400" 
                                      : "text-zinc-400"
                                  }`}>
                                    <Shield className={`w-3.5 h-3.5 ${profile.role === "moderator" ? "text-indigo-400" : "text-zinc-650"}`} />
                                    {profile.role || "user"}
                                  </span>
                                </td>
                                <td className="p-3.5 capitalize">
                                  <span className={`px-2 py-0.5 rounded font-bold text-[10px] border ${
                                    profile.status === "claimed" 
                                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                                      : "bg-zinc-900 text-zinc-500 border-zinc-800"
                                  }`}>
                                    {profile.status || "ghost"}
                                  </span>
                                </td>
                                <td className="p-3.5 text-zinc-500">
                                  {new Date(profile.created_at).toLocaleDateString()}
                                </td>
                                <td className="p-3.5 text-right">
                                  <button
                                    onClick={() => toggleUserRole(profile.id, profile.role)}
                                    disabled={isPending || isMe}
                                    className={`px-3 py-1.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-30 ${
                                      profile.role === "moderator"
                                        ? "bg-rose-500/10 border-rose-500/20 text-rose-450 hover:bg-rose-500 hover:text-white"
                                        : "bg-indigo-500/10 border-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white"
                                    }`}
                                  >
                                    {isPending ? "..." : profile.role === "moderator" ? "Demote User" : "Make Admin"}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                          
                          {filteredUsers.length === 0 && (
                            <tr>
                              <td colSpan={6} className="p-8 text-center text-zinc-500 italic">No users found matching search query.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Tab: CONFESSIONS LIBRARY */}
                {activeTab === "posts" && (
                  <div className="space-y-4">
                    {/* Search Controls */}
                    <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between pb-3 border-b border-zinc-850/50">
                      <div>
                        <h3 className="font-extrabold text-sm uppercase text-zinc-350 tracking-wider">Confessions Library</h3>
                        <p className="text-[11px] text-zinc-500 mt-0.5">Full library of published code failures. You can toggle public feed visibility or delete entirely.</p>
                      </div>
                      <div className="relative max-w-xs w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                          type="text"
                          placeholder="Search keyword or author..."
                          value={searchPost}
                          onChange={(e) => setSearchPost(e.target.value)}
                          className="w-full pl-9 pr-4 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 placeholder-zinc-550 transition-colors"
                        />
                      </div>
                    </div>

                    {/* Table View */}
                    <div className="overflow-x-auto border border-zinc-850 rounded-2xl mt-2 bg-zinc-950/20">
                      <table className="w-full text-left text-xs font-mono select-text">
                        <thead className="bg-zinc-950/80 text-zinc-400 border-b border-zinc-850">
                          <tr>
                            <th className="p-3.5 font-bold uppercase tracking-wider">Author</th>
                            <th className="p-3.5 font-bold uppercase tracking-wider">Title</th>
                            <th className="p-3.5 font-bold uppercase tracking-wider">Tool</th>
                            <th className="p-3.5 font-bold uppercase tracking-wider">Verdict</th>
                            <th className="p-3.5 font-bold uppercase tracking-wider">Status</th>
                            <th className="p-3.5 font-bold uppercase tracking-wider">Age</th>
                            <th className="p-3.5 font-bold uppercase tracking-wider text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-850/60">
                          {filteredPosts.map((post) => {
                            const isPending = actionLoading === `hide-${post.id}` || actionLoading === `deletepost-${post.id}`;
                            
                            return (
                              <tr key={post.id} className={`hover:bg-zinc-900/10 transition-all duration-200 ${
                                post.hidden ? "opacity-35 bg-zinc-900/30" : ""
                              }`}>
                                <td className="p-3.5 font-bold text-zinc-200">
                                  @{post.author || "anonymous"}
                                </td>
                                <td className="p-3.5 max-w-xs truncate text-zinc-200">
                                  {post.title}
                                </td>
                                <td className="p-3.5 uppercase text-indigo-400 font-extrabold">
                                  {post.tool}
                                </td>
                                <td className="p-3.5 capitalize">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                    post.verdict === "solved" 
                                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                                      : "bg-red-500/10 text-red-400 border-red-500/20"
                                  }`}>
                                    {post.verdict === "solved" ? "Solved" : "Broken"}
                                  </span>
                                </td>
                                <td className="p-3.5">
                                  <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                                    post.hidden 
                                      ? "bg-zinc-900 text-zinc-500 border-zinc-800" 
                                      : "bg-emerald-500/5 text-emerald-450 border-emerald-500/15"
                                  }`}>
                                    {post.hidden ? "Hidden" : "Public"}
                                  </span>
                                </td>
                                <td className="p-3.5 text-zinc-500">
                                  {timeAgo(new Date(post.created_at).getTime())}
                                </td>
                                <td className="p-3.5 text-right space-x-2 whitespace-nowrap">
                                  <button
                                    onClick={() => handleTogglePostHidden(post.id)}
                                    disabled={isPending}
                                    className="p-1.5 rounded-xl border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors inline-flex items-center justify-center cursor-pointer"
                                    title={post.hidden ? "Unhide from Feed" : "Hide from Feed"}
                                  >
                                    {post.hidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                  </button>
                                  <button
                                    onClick={() => handleHardDeletePost(post.id)}
                                    disabled={isPending}
                                    className="p-1.5 rounded-xl border border-rose-500/15 text-rose-400 hover:bg-rose-500 hover:text-white transition-all inline-flex items-center justify-center cursor-pointer"
                                    title="Permanently Delete Confession"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                          
                          {filteredPosts.length === 0 && (
                            <tr>
                              <td colSpan={7} className="p-8 text-center text-zinc-500 italic">No confessions found matching search query.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}

          </div>

        </div>

      </main>

      <footer className="mt-auto border-t border-zinc-850 py-6 mono text-[10px] text-center text-zinc-650">
        VIBEFAIL MODERATION DESK · wired with regtech · live database synchronization
      </footer>
    </div>
  );
}
