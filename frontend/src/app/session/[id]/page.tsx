"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import ChatCanvas from "../../../../components/ChatCanvas";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  code?: string | null;
  thinking?: string | null;
  model?: "swift" | "think";
};

export default function SessionPage() {
  const { id: sessionId } = useParams<{ id: string }>();

  const [messages, setMessages]               = useState<Message[]>([]);
  const [initialArtifact, setInitialArtifact] = useState<{ code: string; id: string } | null>(null);
  const [loading, setLoading]                 = useState(true);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    fetch(`${API}/api/sessions/${sessionId}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (cancelled || !data) return;
        setMessages(data.messages ?? []);
        if (data.active_artifact) setInitialArtifact(data.active_artifact);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [sessionId]);

  // Render immediately — ChatCanvas shows skeleton while loading
  return (
    <ChatCanvas
      sessionId={sessionId}
      initialMessages={messages}
      initialArtifact={initialArtifact}
      isLoadingHistory={loading}
    />
  );
}
