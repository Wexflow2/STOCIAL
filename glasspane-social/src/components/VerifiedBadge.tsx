import { cn } from "@/lib/utils";

const VERIFIED_USERS = ["sotiale official"];

const badgeUrlBlue = "/verified-blue.webp";
const badgeUrlGreen = "/verified-green.webp";

export const isVerifiedUser = (username?: string | null) => {
  if (!username) return false;
  return VERIFIED_USERS.includes(username.trim().toLowerCase());
};

interface VerifiedBadgeProps {
  className?: string;
  variant?: "blue" | "green";
}

export function VerifiedBadge({ className, variant = "blue" }: VerifiedBadgeProps) {
  const src = variant === "green" ? badgeUrlGreen : badgeUrlBlue;
  return (
    <img
      src={src}
      alt="Verificado"
      className={cn("inline-block w-4 h-4 align-middle drop-shadow-sm", className)}
    />
  );
}
