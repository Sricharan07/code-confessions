import { useState, useEffect, useRef } from "react";
import { X, User, Shield, RefreshCw, Eye, EyeOff } from "lucide-react";
import { getCuratedUsernameSuggestions, generateRandomUsername, loginAsGuest, loginWithCredentials, signupWithCredentials } from "@/lib/auth-utils";
import { setRememberSession } from "@/lib/store";

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: any) => void;
};

export function AuthModalV2({ isOpen, onClose, onLogin }: AuthModalProps) {
  const [step, setStep] = useState<"options" | "auth">("options");
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const shuffleSuggestions = async () => {
    const list = await getCuratedUsernameSuggestions(5);
    setSuggestions(list);
  };

  const handleSelectSuggestion = (name: string) => {
    setDisplayName(name);
  };

  const handleRandomFill = async () => {
    const list = await getCuratedUsernameSuggestions(5);
    setSuggestions(list);
    setDisplayName(list[0]); // pre-fill the displayName field directly
  };

  useEffect(() => {
    if (isOpen) {
      setStep("options");
      setActiveTab("login");
      setUsername("");
      setDisplayName("");
      setPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      setShowConfirmPassword(false);
      setRememberMe(true);
      setRememberSession(true);
      setError("");
      shuffleSuggestions();
    }
  }, [isOpen]);

  useEffect(() => {
    if (activeTab === "signup") {
      getCuratedUsernameSuggestions(5)
        .then((list) => {
          setSuggestions(list);
          setDisplayName(list[0]); // Pre-fill the display name field by default
        })
        .catch((err) => {
          console.error("Failed to load suggestions:", err);
          setDisplayName("Cursed_Dev_777");
        });
      setUsername("");
    } else {
      setUsername("");
      setDisplayName("");
    }
    setError("");
    setShowDropdown(false);
  }, [activeTab]);

  // Close suggestions dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  if (!isOpen) return null;

  const handleGuestLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const user = await loginAsGuest();
      onLogin(user);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password) {
      setError("Please fill in all fields.");
      return;
    }

    if (activeTab === "signup" && !displayName.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    if (username.length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      if (activeTab === "signup") {
        if (password !== confirmPassword) {
          setError("Passwords do not match.");
          setLoading(false);
          return;
        }

        const user = await signupWithCredentials(username.trim(), displayName.trim(), password);
        onLogin(user);
        onClose();
      } else {
        // Login
        const user = await loginWithCredentials(username.trim(), password);
        onLogin(user);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-all duration-300">
      <div className="bg-white dark:bg-zinc-950 w-full max-w-md p-8 rounded-[24px] relative shadow-2xl border border-zinc-200 dark:border-zinc-800 transition-all duration-200">
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {step === "options" && (
          <div className="text-center pt-2">
            <h2 className="font-extrabold text-3xl mb-2 tracking-tight text-zinc-900 dark:text-zinc-50">Join VibeFail</h2>
            <p className="text-[15px] text-zinc-500 dark:text-zinc-400 mb-8 leading-relaxed">
              Stay completely anonymous. No email validations, no tracking, just pure raw receipts of AI-assisted chaos.
            </p>

            <div className="space-y-3.5">
              <button 
                onClick={handleGuestLogin}
                className="w-full relative border border-transparent bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-50 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 rounded-full flex items-center justify-center gap-3 px-6 py-3.5 transition-all font-semibold text-[15px]"
              >
                <User className="w-4.5 h-4.5 absolute left-6" />
                <span>Continue as Guest</span>
              </button>
              
              <button 
                onClick={() => setStep("auth")}
                className="w-full relative border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-800 dark:text-zinc-200 bg-transparent rounded-full flex items-center justify-center gap-3 px-6 py-3.5 transition-all font-semibold text-[15px]"
              >
                <Shield className="w-4.5 h-4.5 absolute left-6" />
                <span>Log In / Create Account</span>
              </button>
            </div>
            
            <p className="text-[12px] text-zinc-400 dark:text-zinc-500 mt-8 font-medium">
              Guest browsing is local. Anonymous identity registers only when you post.
            </p>
          </div>
        )}

        {step === "auth" && (
          <div className="pt-1">
            {/* Header Tabs */}
            <div className="flex border-b border-zinc-100 dark:border-zinc-800 mb-6">
              <button
                onClick={() => setActiveTab("login")}
                className={`flex-1 pb-3 text-[16px] font-bold transition-all relative ${activeTab === "login" ? "text-zinc-900 dark:text-zinc-50" : "text-zinc-400 dark:text-zinc-500"}`}
              >
                Log In
                {activeTab === "login" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-900 dark:bg-zinc-50 rounded-full" />
                )}
              </button>
              <button
                onClick={() => setActiveTab("signup")}
                className={`flex-1 pb-3 text-[16px] font-bold transition-all relative ${activeTab === "signup" ? "text-zinc-900 dark:text-zinc-50" : "text-zinc-400 dark:text-zinc-500"}`}
              >
                Sign Up
                {activeTab === "signup" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-900 dark:bg-zinc-50 rounded-full" />
                )}
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {/* Display Name Input (Sign Up only) */}
              {activeTab === "signup" && (
                <div className="relative" ref={dropdownRef}>
                  <label className="text-[12px] text-zinc-500 dark:text-zinc-400 font-bold block mb-1.5 uppercase tracking-wider font-mono">Display Name (Public)</label>
                  <div className="relative flex items-center">
                    <input 
                      type="text" 
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      onFocus={() => setShowDropdown(true)}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-4 pr-[96px] py-3 text-[15px] font-semibold outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-all text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                      placeholder="Display Name"
                      maxLength={25}
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      onClick={handleRandomFill}
                      title="Shuffle display name"
                      className="absolute right-2 px-2.5 py-1 text-[11px] font-bold font-mono bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg transition-all flex items-center gap-1 shadow-sm h-8"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>SHUFFLE</span>
                    </button>
                  </div>
                  
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1.5 block font-mono italic">
                    Shuffled/created randomly. Change it to whatever you want.
                  </span>

                  {/* Suggestions Dropdown (autofill style) */}
                  {showDropdown && (
                    <div className="absolute z-20 left-0 right-0 mt-1.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden transition-all animate-in fade-in slide-in-from-top-1 duration-150 max-h-60 overflow-y-auto">
                      <div className="px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900/80 border-b border-zinc-150 dark:border-zinc-800 flex items-center justify-between">
                        <span className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-mono">
                          🔥 Suggested Names
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            shuffleSuggestions();
                          }}
                          className="text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-all flex items-center gap-1 text-[10px] font-bold font-mono"
                          title="Shuffle suggestion list"
                        >
                          <RefreshCw className="w-2.5 h-2.5" />
                          <span>Shuffle List</span>
                        </button>
                      </div>
                      <div className="p-1.5 flex flex-col gap-0.5">
                        {suggestions.map((name) => (
                          <button
                            key={name}
                            type="button"
                            onClick={() => {
                              setDisplayName(name);
                              setShowDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 text-[13px] font-mono font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg transition-all flex items-center justify-between group"
                          >
                            <span>{name}</span>
                            <span className="text-[10px] text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity font-sans">Use this →</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Username Input */}
              <div>
                <label className="text-[12px] text-zinc-500 dark:text-zinc-400 font-bold block mb-1.5 uppercase tracking-wider font-mono">
                  {activeTab === "signup" ? "Login Username (Private)" : "Username"}
                </label>
                
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-4 pr-4 py-3 text-[15px] font-semibold outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-all text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                  placeholder={activeTab === "login" ? "Enter username" : "Create login username"}
                  maxLength={25}
                  autoComplete="off"
                />
                
                {activeTab === "signup" && (
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1.5 block font-mono italic">
                    don’t use your real name bestie 😭 stay mysterious for safety purposes
                  </span>
                )}
              </div>

              {/* Password Input */}
              <div>
                <label className="text-[12px] text-zinc-500 dark:text-zinc-400 font-bold block mb-1.5 uppercase tracking-wider font-mono">Password</label>
                <div className="relative flex items-center">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-4 pr-12 py-3 text-[15px] font-semibold outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-all text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password (Sign Up only) */}
              {activeTab === "signup" && (
                <div>
                  <label className="text-[12px] text-zinc-500 dark:text-zinc-400 font-bold block mb-1.5 uppercase tracking-wider font-mono">Confirm Password</label>
                  <div className="relative flex items-center">
                    <input 
                      type={showConfirmPassword ? "text" : "password"} 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-4 pr-12 py-3 text-[15px] font-semibold outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-all text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Remember me checkbox */}
              <div className="flex items-center gap-2 mt-4 select-none">
                <input
                  type="checkbox"
                  id="remember-me"
                  checked={rememberMe}
                  onChange={(e) => {
                    setRememberMe(e.target.checked);
                    setRememberSession(e.target.checked);
                  }}
                  className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500 h-4 w-4 dark:border-zinc-700 dark:bg-zinc-800 dark:checked:bg-zinc-50 dark:checked:border-zinc-50"
                />
                <label htmlFor="remember-me" className="text-[13px] font-semibold text-zinc-500 dark:text-zinc-400 cursor-pointer">
                  Remember me / Save login
                </label>
              </div>

              {error && <p className="text-red-500 text-xs p-3 text-center font-semibold font-mono bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-xl">{error}</p>}

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-50 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 rounded-full font-bold text-[15px] py-3.5 mt-6 transition-all"
              >
                {loading ? "Processing..." : activeTab === "login" ? "Log In" : "Create Account"}
              </button>

              <button 
                type="button"
                onClick={() => setStep("options")}
                className="w-full bg-transparent text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 hover:opacity-80 font-semibold text-[13px] py-2 mt-2 transition-all"
              >
                Back to Options
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
