"use client";

import * as React from "react";
import { Loader2, MessageSquareReply } from "lucide-react";
import { usePlatformFeedback, useReplyFeedback } from "@/hooks/use-feedback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

export default function PlatformFeedbackPage() {
  const { data = [] } = usePlatformFeedback();
  const replyMutation = useReplyFeedback();
  const [replyById, setReplyById] = React.useState<Record<number, string>>({});

  const sendReply = async (id: number) => {
    const replyText = replyById[id]?.trim();
    if (!replyText) return;
    await replyMutation.mutateAsync({
      id,
      payload: { replyText, statusCode: "REPLIED" },
    });
    setReplyById((current) => ({ ...current, [id]: "" }));
  };

  return (
    <div className="space-y-6">
      <section className="border border-border bg-card p-6 shadow-sm">
        <Badge className="rounded-md bg-accent text-module">
          User voice
        </Badge>
        <div className="mt-4 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-border bg-surface-2 text-module">
            <MessageSquareReply className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[#07345f]">
              Platform feedback desk
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Read user comments, respect anonymous submissions, and reply from
              the super admin desk.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {data.map((item) => (
          <article key={item.id} className="border border-border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                {item.displayPhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.displayPhotoUrl}
                    alt=""
                    className="h-11 w-11 rounded-full border border-border object-cover"
                  />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface-2 text-sm font-bold text-module">
                    {item.isAnonymous ? "A" : (item.displayName || "U").slice(0, 1)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">
                    {item.displayName || "User"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.facility?.name || "No facility"} / {item.branch?.name || "No branch"}
                  </p>
                </div>
              </div>
              <Badge className="rounded-md bg-accent text-module">
                {item.statusCode}
              </Badge>
            </div>

            <div className="mt-4 border-t border-border pt-4">
              <p className="font-semibold text-[#07345f]">{item.subject}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatDate(item.createdAt)} / {item.isAnonymous ? "Anonymous" : "Named"}
              </p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {item.message}
              </p>
            </div>

            {item.replyText ? (
              <div className="mt-4 border-l-4 border-emerald-400 bg-success-soft p-3 text-sm text-success">
                <p className="font-semibold">Reply sent</p>
                <p className="mt-1 leading-6">{item.replyText}</p>
              </div>
            ) : null}

            <div className="mt-4 space-y-3">
              <Textarea
                value={replyById[item.id] || ""}
                onChange={(event) =>
                  setReplyById((current) => ({
                    ...current,
                    [item.id]: event.target.value,
                  }))
                }
                className="min-h-[92px] rounded-md"
                placeholder="Reply to this feedback"
              />
              <Button
                className="h-10 rounded-md bg-primary text-white hover:bg-brand-strong"
                onClick={() => void sendReply(item.id)}
                disabled={replyMutation.isPending || !(replyById[item.id] || "").trim()}
              >
                {replyMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Reply
              </Button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
