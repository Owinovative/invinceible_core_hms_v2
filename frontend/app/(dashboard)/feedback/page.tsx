"use client";

import * as React from "react";
import { Loader2, MessageSquareText, Send } from "lucide-react";
import { useCreateFeedback, useMyFeedback } from "@/hooks/use-feedback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

export default function FeedbackPage() {
  const { data = [] } = useMyFeedback();
  const createMutation = useCreateFeedback();
  const [subject, setSubject] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [isAnonymous, setIsAnonymous] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);

  const submit = async () => {
    setNotice(null);
    await createMutation.mutateAsync({
      subject,
      message,
      isAnonymous,
    });
    setSubject("");
    setMessage("");
    setIsAnonymous(false);
    setNotice("Feedback sent to the super admin desk.");
  };

  return (
    <div className="space-y-6">
      <section className="border border-border bg-card p-6 shadow-sm">
        <Badge className="rounded-md bg-accent text-module">
          Super admin comments
        </Badge>
        <div className="mt-4 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-border bg-surface-2 text-module">
            <MessageSquareText className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[#07345f]">
              Feedback to platform owners
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Send a named or anonymous comment to the super admin team. Replies
              appear here, and named comments also receive a notification.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="border border-border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#07345f]">
            Write comment
          </h2>
          <div className="mt-4 space-y-4">
            <Input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className="h-11 rounded-md"
              placeholder="Short subject"
            />
            <Textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className="min-h-[150px] rounded-md"
              placeholder="Write the comment clearly"
            />
            <label className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(event) => setIsAnonymous(event.target.checked)}
                className="h-4 w-4 accent-sky-700"
              />
              Send anonymously
            </label>
            {notice ? (
              <p className="border border-success/25 bg-success-soft px-3 py-2 text-sm text-success">
                {notice}
              </p>
            ) : null}
            <Button
              className="h-11 rounded-md bg-primary text-white hover:bg-brand-strong"
              onClick={submit}
              disabled={createMutation.isPending || subject.length < 3 || message.length < 5}
            >
              {createMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send feedback
            </Button>
          </div>
        </div>

        <div className="border border-border bg-card shadow-sm">
          <div className="border-b border-border p-5">
            <h2 className="text-lg font-semibold text-[#07345f]">
              My feedback history
            </h2>
          </div>
          <div className="max-h-[620px] overflow-y-auto p-5">
            {data.length === 0 ? (
              <p className="text-sm text-muted-foreground">No feedback sent yet.</p>
            ) : (
              <div className="space-y-4">
                {data.map((item) => (
                  <article key={item.id} className="border border-border bg-[#f8fcff] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-foreground">
                          {item.subject}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatDate(item.createdAt)} / {item.isAnonymous ? "Anonymous" : "Named"}
                        </p>
                      </div>
                      <Badge className="rounded-md bg-accent text-module">
                        {item.statusCode}
                      </Badge>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      {item.message}
                    </p>
                    {item.replyText ? (
                      <div className="mt-4 border-l-4 border-emerald-400 bg-success-soft p-3 text-sm text-success">
                        <p className="font-semibold">Super admin reply</p>
                        <p className="mt-1 leading-6">{item.replyText}</p>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
