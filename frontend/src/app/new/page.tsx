"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ChatCanvas from "../../../components/ChatCanvas";

function NewChatInner() {
  const [sessionId, setSessionId] = useState("");
  const searchParams = useSearchParams();
  const router       = useRouter();
  const launch       = searchParams.get("launch");

  useEffect(() => {
    setSessionId(crypto.randomUUID());
  }, []);

  useEffect(() => {
    if (launch && sessionId) {
      router.replace("/new", { scroll: false });
    }
  }, [launch, sessionId, router]);

  if (!sessionId) return null;

  return <ChatCanvas sessionId={sessionId} autoPrompt={launch ?? undefined} />;
}

export default function NewChat() {
  return (
    <Suspense fallback={null}>
      <NewChatInner />
    </Suspense>
  );
}
