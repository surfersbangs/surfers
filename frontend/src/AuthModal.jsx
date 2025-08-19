// src/AuthModal.jsx
import { useState } from "react";
import { signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "./firebase";

export default function AuthModal({ open, onClose, user }) {
  const [loading, setLoading] = useState(false);

  // Google login
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
      setLoading(false);
      onClose();
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  // Logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-90 z-50">
      <div className="w-[400px] text-center p-8 rounded-xl bg-black border border-gray-800">
        
        <h1 className="text-3xl font-bold">account.</h1>
        <p className="text-gray-400 mb-6">create or log in.</p>

        {/* If logged in */}
        {user ? (
          <>
            <p className="mb-4">Welcome, {user.displayName || user.email}</p>
            <button
              onClick={handleLogout}
              className="w-full py-2 bg-red-600 text-white rounded-lg"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleGoogleLogin}
              className="bg-[#1a73e8] text-white font-medium w-full py-2 rounded-lg flex items-center justify-center gap-2"
            >
              {loading ? "Loading..." : <><span className="font-bold">G</span> continue with Google</>}
            </button>
          </>
        )}

        {/* Footer */}
        <p className="text-gray-400 text-xs mt-6">
          privacy policy • terms & use • type it. see it. launch it.<br />
          your ideas live in seconds. surfers codes anything better. faster.<br />
          © 2025 surfers
        </p>

        {/* Close button */}
        <button
          onClick={onClose}
          className="mt-4 text-sm text-gray-400 underline"
        >
          close
        </button>
      </div>
    </div>
  );
}
