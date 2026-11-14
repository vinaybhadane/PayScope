"use client";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { PayScopeLogo } from "@/components/brand/PayScopeLogo";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
export function AuthModal() {
  const {
    isAuthModalOpen,
    closeAuthModal,
    signInWithGoogle,
    signInAsGuest,
    isConfigured,
  } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const close = useCallback(() => closeAuthModal(), [closeAuthModal]);
  if (!isAuthModalOpen) return null;
  const google = async () => {
    setBusy(true);
    setError("");
    try {
      await signInWithGoogle();
      router.push("/dashboard");
    } catch {
      setError(
        "Google sign-in couldn’t be completed. Please try again or explore the sample workspace.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal close={close} label="Welcome to PayScope" className="auth-dialog">
      <PayScopeLogo size={35} />
      <h2>
        A clearer picture
        <br />
        starts here.
      </h2>
      <p>
        Get to know your recurring payments.
        <br />
        Make more room for what matters.
      </p>
      {error && (
        <div className="auth-error" role="alert">
          {error}
        </div>
      )}
      {isConfigured && (
        <button className="auth-google" onClick={google} disabled={busy}>
          <b>G</b>
          {busy ? "Connecting…" : "Continue with Google"}
        </button>
      )}
      <div className="auth-divider">
        {isConfigured ? "or take a look around" : "no account needed"}
      </div>
      <button
        className="button button-primary"
        onClick={() => {
          setError("");
          signInAsGuest();
          router.push("/dashboard");
        }}
      >
        Explore the free demo <Icon name="arrow" size={16} />
      </button>
      <p className="auth-footnote">
        The demo uses sample data. By continuing,
        <br />
        you agree to our{" "}
        <Link href="/privacy" onClick={close}>
          privacy policy
        </Link>
        .
      </p>
    </Modal>
  );
}
export default AuthModal;
