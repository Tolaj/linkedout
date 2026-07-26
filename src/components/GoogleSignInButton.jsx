import { useEffect, useRef, useState } from "react";
import useAuthStore from "../stores/useAuthStore";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function GoogleSignInButton() {
  const googleLogin = useAuthStore((s) => s.googleLogin);
  const containerRef = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!CLIENT_ID || !window.google?.accounts?.id) return;

    window.google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: async (response) => {
        setError("");
        try {
          await googleLogin(response.credential);
        } catch (err) {
          setError(err.message);
        }
      },
    });

    window.google.accounts.id.renderButton(containerRef.current, {
      type: "standard",
      theme: "outline",
      size: "large",
      width: containerRef.current?.offsetWidth,
      text: "continue_with",
    });
  }, [googleLogin]);

  if (!CLIENT_ID) return null;

  return (
    <>
      <div ref={containerRef} className="w-full [&>div]:w-full" />
      {error && (
        <p className="text-xs text-[#DC2626] mt-2">{error}</p>
      )}
    </>
  );
}
