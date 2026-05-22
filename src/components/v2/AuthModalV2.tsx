import { useState, useEffect } from "react";
import { X, User, UserPlus } from "lucide-react";
import { supabase } from "@/lib/supabase";

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: any) => void;
};

const ADJECTIVES = ["Repulsive", "Shoddy", "Cursed", "Based", "Anon", "Lost", "Rogue"];
const NOUNS = ["Course", "Razzmatazz", "Pointer", "Exception", "Dev", "Agent", "LLM"];

function generateRandomUsername() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 9999);
  return `${adj}_${noun}_${num}`;
}

export function AuthModalV2({ isOpen, onClose, onLogin }: AuthModalProps) {
  const [step, setStep] = useState<"options" | "custom">("options");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setStep("options");
      setUsername("");
      setPassword("");
      setError("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGuestLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const generatedUsername = generateRandomUsername();
      
      // Sign up with fake email to bypass disabled anonymous providers
      const fakeEmail = `guest_${generatedUsername.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Math.floor(Math.random() * 10000)}@vibefail.local`;
      const fakePassword = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);

      const { data, error } = await supabase.auth.signUp({
        email: fakeEmail,
        password: fakePassword,
        options: {
          data: {
            username: generatedUsername,
            is_guest: true
          }
        }
      });
      
      if (error) throw error;
      
      onLogin({ username: generatedUsername, isGuest: true, id: data.user?.id });
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Please enter both a username and password");
      return;
    }
    
    if (username.toLowerCase() === password.toLowerCase()) {
      setError("Password cannot be the same as your username");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      // Supabase natively requires emails, so we fake one under the hood using the username
      const fakeEmail = `${username.toLowerCase().replace(/[^a-z0-9]/g, '')}@vibefail.local`;

      // 1. First, attempt to sign in (assuming account exists)
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: fakeEmail,
        password: password,
      });

      if (signInError) {
        // 2. If sign in fails because user doesn't exist, try to sign them up!
        if (signInError.message.includes("Invalid login credentials")) {
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: fakeEmail,
            password: password,
            options: {
              data: {
                username: username,
                is_guest: false
              }
            }
          });

          if (signUpError) throw signUpError;
          onLogin({ username, isGuest: false, id: signUpData.user?.id });
        } else {
          throw signInError; // Some other error occurred
        }
      } else {
        // Sign in successful
        onLogin({ username, isGuest: false, id: signInData.user?.id });
      }
      
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
      <div className="bg-paper w-full max-w-md p-8 rounded-[24px] relative shadow-2xl">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-ink/10 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {step === "options" && (
          <div className="text-center pt-2">
            <h2 className="font-bold text-3xl mb-3">Join VibeFail</h2>
            <p className="text-[15px] text-muted-foreground mb-8">
              Stay completely anonymous. No emails, no phone numbers, no tracking. Just pure unfiltered vibes.
            </p>

            <div className="space-y-4">
              <button 
                onClick={handleGuestLogin}
                disabled={loading}
                className="w-full relative border-2 border-hot hover:bg-hot/5 rounded-full flex items-center justify-center gap-3 px-6 py-4 transition-colors font-bold text-[16px] text-hot"
              >
                <User className="w-5 h-5 absolute left-6" />
                <span>{loading ? "..." : "Continue as Guest"}</span>
              </button>
              
              <button 
                onClick={() => setStep("custom")}
                className="w-full relative border border-ink/20 hover:bg-ink/5 rounded-full flex items-center justify-center gap-3 px-6 py-4 transition-colors font-bold text-[16px] text-ink"
              >
                <UserPlus className="w-5 h-5 absolute left-6" />
                <span>Log In / Create Account</span>
              </button>
            </div>
            
            <p className="text-[13px] text-center text-muted-foreground mt-8">
              Guest accounts are temporary and will be lost if you clear your browser data.
            </p>
          </div>
        )}

        {step === "custom" && (
          <div className="pt-2">
            <h2 className="font-bold text-3xl mb-3 text-center">Your Account</h2>
            <p className="text-[15px] text-muted-foreground mb-6 text-center">
              Pick a unique username and a strong password. If the username doesn't exist, we'll create it.
            </p>

            <form onSubmit={handleCustomSubmit} className="space-y-4">
              <div className="bg-ink/5 rounded-[16px] p-2 border border-transparent focus-within:border-volt/50 transition-colors">
                <div className="px-2 pt-1 pb-2">
                  <label className="text-[11px] text-muted-foreground font-bold block mb-1">Username</label>
                  <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-transparent border-none p-0 text-[16px] outline-none font-bold"
                    placeholder="Enter username"
                    maxLength={20}
                  />
                </div>
              </div>

              <div className="bg-ink/5 rounded-[16px] p-2 border border-transparent focus-within:border-volt/50 transition-colors">
                <div className="px-2 pt-1 pb-2">
                  <label className="text-[11px] text-muted-foreground font-bold block mb-1">Password</label>
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-transparent border-none p-0 text-[16px] outline-none font-bold"
                    placeholder="Enter password"
                  />
                </div>
              </div>

              {error && <p className="text-hot text-sm p-2 text-center font-bold">{error}</p>}

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-hot hover:bg-hot/90 text-paper rounded-full font-bold text-[16px] py-4 mt-6 transition-colors"
              >
                {loading ? "..." : "Continue"}
              </button>

              <button 
                type="button"
                onClick={() => setStep("options")}
                className="w-full bg-transparent hover:underline text-ink/60 font-bold text-[14px] py-2 mt-2 transition-colors"
              >
                Back
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
