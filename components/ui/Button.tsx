import { ButtonHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon?: ReactNode;
  variant?: "primary" | "outline" | "secondary" | "pink";
  size?: "sm" | "md" | "lg";
}

export default function Button({
  label,
  icon,
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  const variantClasses = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    outline: "border border-gray-300 text-gray-700 hover:bg-gray-100",
    secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200",
    pink: "bg-pink-800 text-white hover:bg-pink-900",
  };

  const sizeClasses = {
    sm: "text-sm px-3 py-1.5",
    md: "text-base px-4 py-2",
    lg: "text-lg px-5 py-3",
  };

  return (
    <button
      {...props}
      className={clsx(
        "inline-flex items-center gap-2 rounded-md font-medium",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {icon && <span>{icon}</span>}
      <span>{label}</span>
    </button>
  );
}