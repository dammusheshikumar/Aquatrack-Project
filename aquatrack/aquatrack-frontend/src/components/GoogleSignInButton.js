import React, { useEffect, useRef } from "react";

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

/**
 * Renders Google's own "Sign in with Google" button via Google Identity
 * Services (loaded as a <script> tag in public/index.html). On success,
 * calls onCredential(idToken) with the raw Google ID token so the caller
 * can send it to the backend for verification.
 */
export default function GoogleSignInButton({ onCredential, onError }) {
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    let cancelled = false;

    const render = () => {
      if (cancelled || !window.google || !buttonRef.current) return;
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => onCredential(response.credential),
        });
        window.google.accounts.id.renderButton(buttonRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          shape: "pill",
          width: 320,
          text: "continue_with",
        });
      } catch (e) {
        onError && onError("Could not load Google sign-in.");
      }
    };

    if (window.google) {
      render();
    } else {
      // The GIS script is loaded async in index.html — poll briefly until it's ready.
      const interval = setInterval(() => {
        if (window.google) {
          clearInterval(interval);
          render();
        }
      }, 200);
      const timeout = setTimeout(() => clearInterval(interval), 6000);
      return () => { cancelled = true; clearInterval(interval); clearTimeout(timeout); };
    }

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!GOOGLE_CLIENT_ID) {
    return (
      <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
        Google sign-in isn't configured (missing REACT_APP_GOOGLE_CLIENT_ID).
      </p>
    );
  }

  return <div ref={buttonRef} style={{ display: "flex", justifyContent: "center" }} />;
}