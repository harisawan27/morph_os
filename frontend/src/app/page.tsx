"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ChatCanvas from "../../components/ChatCanvas";

function HomeInner() {
  const [sessionId, setSessionId] = useState("");
  const searchParams = useSearchParams();
  const router       = useRouter();
  const launch       = searchParams.get("launch");

  useEffect(() => {
    setSessionId(crypto.randomUUID());
  }, []);

  // Clean the URL once mounted (the autoPrompt prop carries the value)
  useEffect(() => {
    if (launch && sessionId) {
      router.replace("/", { scroll: false });
    }
  }, [launch, sessionId, router]);

  if (!sessionId) return null;

  return <ChatCanvas sessionId={sessionId} autoPrompt={launch ?? undefined} />;
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeInner />
    </Suspense>
  );
}
