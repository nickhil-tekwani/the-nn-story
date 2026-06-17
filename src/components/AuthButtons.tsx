"use client";

import { signIn, signOut } from "next-auth/react";
import { track } from "@vercel/analytics";

export function SignInButton() {
  return (
    <button
      onClick={() => { track("sign_in_clicked"); signIn("google"); }}
      className="inline-flex items-center gap-3 rounded-full bg-white px-6 py-3 font-sans text-sm font-medium text-stone-800 shadow-lg transition hover:bg-stone-100"
    >
      <GoogleMark />
      Sign in with Google
    </button>
  );
}

export function SignOutButton() {
  return (
    <button
      onClick={() => { track("sign_out_clicked"); signOut(); }}
      className="font-sans text-xs uppercase tracking-widest text-cream/60 underline-offset-4 hover:underline"
      style={{ color: "rgba(250,247,242,0.6)" }}
    >
      Sign out
    </button>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.4 30.4 0 24 0 14.6 0 6.4 5.4 2.6 13.2l7.9 6.1C12.3 13.3 17.7 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v9.1h12.4c-.5 2.9-2.2 5.3-4.7 7l7.2 5.6c4.2-3.9 6.2-9.6 6.2-17.1z"
      />
      <path
        fill="#FBBC05"
        d="M10.5 28.3c-.5-1.4-.8-2.9-.8-4.3s.3-3 .8-4.3l-7.9-6.1C1 16.7 0 20.2 0 24s1 7.3 2.6 10.4l7.9-6.1z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.4 0 11.9-2.1 15.8-5.8l-7.2-5.6c-2 1.4-4.6 2.2-8.6 2.2-6.3 0-11.7-3.8-13.5-9.2l-7.9 6.1C6.4 42.6 14.6 48 24 48z"
      />
    </svg>
  );
}
