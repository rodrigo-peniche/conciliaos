"use client";

import { Button } from "@/components/ui/button";
import { Copy, User, Bot } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface Props {
  role: "user" | "assistant";
  content: string;
}

export function MensajeBurbuja({ role, content }: Props) {
  const isUser = role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          isUser
            ? "bg-blue-600 text-white"
            : "bg-muted"
        }`}
      >
        {isUser ? (
          <User className="h-3.5 w-3.5" />
        ) : (
          <Bot className="h-3.5 w-3.5" />
        )}
      </div>

      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
          isUser
            ? "bg-blue-600 text-white"
            : "bg-muted"
        }`}
      >
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}

        {!isUser && content && (
          <div className="flex justify-end mt-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 opacity-50 hover:opacity-100"
              onClick={() => navigator.clipboard.writeText(content)}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
