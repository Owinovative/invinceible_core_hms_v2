import { apiFetch } from "@/lib/api";

export function queueBulkCommunication(payload: {
  messages: Array<{
    channel: "sms" | "whatsapp";
    recipient: string;
    templateKey: string;
    variables?: Record<string, string>;
  }>;
}) {
  return apiFetch<{ requested: number; queued: number }>("/communications/bulk", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
