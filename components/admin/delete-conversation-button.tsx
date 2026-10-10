"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DeleteConversationButton({ action }: { action: () => Promise<void> }) {
  return (
    <form action={action}>
      <Button
        type="submit"
        size="sm"
        variant="outline"
        className="text-destructive hover:bg-destructive/10"
        onClick={(e) => {
          if (!confirm("Xoá hội thoại này? Toàn bộ tin nhắn bên trong cũng sẽ bị xoá, không thể hoàn tác.")) {
            e.preventDefault();
          }
        }}
      >
        <Trash2 className="size-3.5" />
        Xoá
      </Button>
    </form>
  );
}
