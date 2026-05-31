import { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export default function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const variants = {
    primary: "bg-cyan-500 text-white hover:bg-cyan-600",
    secondary: "border border-zinc-300 hover:bg-zinc-100",
    ghost: "hover:bg-zinc-100",
  };
  return (
    <button
      className={`rounded-lg px-4 py-2 text-sm font-medium transition ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
