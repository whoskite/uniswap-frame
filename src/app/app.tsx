"use client";

import dynamic from "next/dynamic";

const TokenSwap = dynamic(() => import("~/components/TokenSwap"), {
  ssr: false,
});

export default function App({ token }: { token: string; }) {
  return <TokenSwap token={token} />;
}
