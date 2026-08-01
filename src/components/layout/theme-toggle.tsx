"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Changer de thème"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="rounded-full text-muted-foreground"
    >
      <Sun className="size-5 dark:hidden" />
      <Moon className="hidden size-5 dark:block" />
    </Button>
  );
}
