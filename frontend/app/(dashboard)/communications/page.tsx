"use client";

import * as React from "react";
import { Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { appSelectClass } from "@/lib/select-class";
import { queueBulkCommunication } from "@/services/communication-service";

export default function CommunicationsPage() {
  const [channel, setChannel] = React.useState<"sms" | "whatsapp">("sms");
  const [templateKey, setTemplateKey] = React.useState("HOSPITAL_ANNOUNCEMENT");
  const [recipients, setRecipients] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [status, setStatus] = React.useState<string | null>(null);
  const [sending, setSending] = React.useState(false);
  const send = async () => {
    const recipientList = recipients.split(/[\n,;]/).map((item) => item.trim()).filter(Boolean);
    if (!recipientList.length || !message.trim()) {
      setStatus("Enter at least one recipient and a message.");
      return;
    }
    setSending(true);
    try {
      const result = await queueBulkCommunication({
        messages: recipientList.map((recipient) => ({
          channel, recipient, templateKey,
          variables: { message: message.trim() },
        })),
      });
      setStatus(`${result.queued} of ${result.requested} messages queued.`);
      setRecipients("");
      setMessage("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to queue messages.");
    } finally {
      setSending(false);
    }
  };
  return (
    <div className="space-y-6">
      <section className="surface-spotlight rounded-[2rem] border p-6 shadow-md">
        <Badge>Controlled communication</Badge>
        <h1 className="mt-4 text-3xl font-bold">Bulk Patient and Staff Messaging</h1>
        <p className="mt-2 text-sm text-muted-foreground">Queue provider-backed SMS or WhatsApp campaigns. Appointment reminders run automatically.</p>
      </section>
      <Card className="max-w-3xl">
        <CardHeader><CardTitle>New message batch</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <select className={appSelectClass} value={channel} onChange={(event) => setChannel(event.target.value as "sms" | "whatsapp")}><option value="sms">SMS</option><option value="whatsapp">WhatsApp</option></select>
          <Input value={templateKey} onChange={(event) => setTemplateKey(event.target.value)} placeholder="Template key" />
          <Textarea rows={7} value={recipients} onChange={(event) => setRecipients(event.target.value)} placeholder={"Recipients, one per line\n+254700000001\n+254700000002"} />
          <Textarea rows={5} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Message content supplied to the approved provider template" />
          <Button onClick={send} disabled={sending}><Send className="mr-2 h-4 w-4" />{sending ? "Queueing…" : "Queue messages"}</Button>
          {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
