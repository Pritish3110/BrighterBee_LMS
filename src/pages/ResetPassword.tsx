import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, CheckCircle } from "lucide-react";
import logo from "@/assets/brighter-bee-logo.jpg";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    // Check if we have a valid recovery session
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Session error:", error);
          setIsValidSession(false);
          setCheckingSession(false);
          return;
        }

        // Check if this is a recovery session (user clicked password reset link)
        if (session) {
          setIsValidSession(true);
        } else {
          setIsValidSession(false);
        }
      } catch (err) {
        console.error("Error checking session:", err);
        setIsValidSession(false);
      } finally {
        setCheckingSession(false);
      }
    };

    // Listen for auth state changes - Supabase handles the token exchange automatically
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "PASSWORD_RECOVERY") {
          setIsValidSession(true);
          setCheckingSession(false);
        } else if (event === "SIGNED_IN" && session) {
          // User might have been signed in via recovery link
          setIsValidSession(true);
          setCheckingSession(false);
        }
      }
    );

    checkSession();

    return () => subscription.unsubscribe();
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Password updated successfully!");
        // Sign out and redirect to login
        await supabase.auth.signOut();
        navigate("/auth", { state: { message: "Password reset successful. Please log in with your new password." } });
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-amber-200 shadow-xl">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
              <span className="ml-3 text-amber-700">Verifying reset link...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isValidSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-amber-200 shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <img src={logo} alt="BrighterBee Logo" className="h-16 w-16 rounded-full object-cover" />
            </div>
            <CardTitle className="text-2xl text-amber-800">Invalid or Expired Link</CardTitle>
            <CardDescription className="text-amber-600">
              This password reset link is invalid or has expired. Please request a new one.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => navigate("/auth")}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white"
            >
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-amber-200 shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <img src={logo} alt="BrighterBee Logo" className="h-16 w-16 rounded-full object-cover" />
          </div>
          <CardTitle className="text-2xl text-amber-800 flex items-center justify-center gap-2">
            <Lock className="h-6 w-6" />
            Reset Your Password
          </CardTitle>
          <CardDescription className="text-amber-600">
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-amber-800">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="border-amber-200 focus:border-amber-400 focus:ring-amber-400 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-500 hover:text-amber-700"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-amber-800">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="border-amber-200 focus:border-amber-400 focus:ring-amber-400 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-500 hover:text-amber-700"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {password && confirmPassword && password === confirmPassword && (
              <div className="flex items-center gap-2 text-green-600 text-sm">
                <CheckCircle className="h-4 w-4" />
                Passwords match
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || !password || !confirmPassword}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white"
            >
              {loading ? "Updating Password..." : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
