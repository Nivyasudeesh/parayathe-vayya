import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { toggleTheme, isDark } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`slant flex items-center justify-center gap-1.5 border-2 border-ink bg-paper px-2.5 py-1 text-ink transition-colors hover:bg-brand hover:text-ink cursor-pointer ${className}`}
    >
      {isDark ? (
        <>
          <Sun className="h-3.5 w-3.5 shrink-0" />
          <span className="font-display text-xs uppercase tracking-wider">Light</span>
        </>
      ) : (
        <>
          <Moon className="h-3.5 w-3.5 shrink-0" />
          <span className="font-display text-xs uppercase tracking-wider">Dark</span>
        </>
      )}
    </button>
  );
}
