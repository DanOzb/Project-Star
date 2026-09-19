import { useState } from "react";
import { Button } from "@/components/Button";
import { Card, CardTitle } from "@/components/Card";
import { cn } from "@/lib/utils";

type Message = {
  id: string;
  from: string;
  subject: string;
  unread: boolean;
};

const seed: Message[] = [
  { id: "m1", from: "ada", subject: "Locator index is green", unread: true },
  { id: "m2", from: "grace", subject: "Port collision on 5173", unread: true },
  { id: "m3", from: "alan", subject: "Re: token naming", unread: false },
];

export default function Inbox() {
  const [messages, setMessages] = useState<Message[]>(seed);
  const unreadCount = messages.filter((message) => message.unread).length;

  function markAllRead() {
    setMessages((prev) => prev.map((m) => ({ ...m, unread: false })));
  }

  function clear() {
    setMessages([]);
  }

  return (
    <Card>
      <div className={cn("flex items-center justify-between")}>
        <CardTitle>Inbox</CardTitle>
        <div className={cn("flex gap-2")}>
          <Button onClick={markAllRead}>Mark all read</Button>
          <Button tone="danger" onClick={clear}>
            Clear
          </Button>
        </div>
      </div>

      {messages.length === 0 ? (
        <p className={cn("mt-6 text-sm text-text-muted")}>
          Nothing here. Reload to restore the seed data.
        </p>
      ) : (
        <>
          <p className={cn("mt-1 text-xs text-text-muted")}>
            {unreadCount} unread
          </p>
          <ul className={cn("mt-4 flex flex-col gap-2")}>
            {messages.map((message) => (
              <li
                key={message.id}
                className={cn(
                  "rounded-control border border-border px-3 py-2",
                  message.unread && "bg-surface-2",
                )}
              >
                <span className={cn("text-sm text-text")}>
                  {message.subject}
                </span>
                <span className={cn("ml-2 text-xs text-text-muted")}>
                  {message.from}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
