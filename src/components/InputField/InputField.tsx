import { InputHTMLAttributes } from "react";

type InputFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export default function InputField({ label, error, id, className = "", ...props }: InputFieldProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-sm font-medium text-zinc-700">
        {label}
      </label>
      <input
        id={inputId}
        className={`rounded-lg border border-zinc-300/60 bg-white/40 px-3 py-2 text-sm outline-none placeholder:text-zinc-400 focus:border-cyan-400 focus:bg-white/60 focus:ring-1 focus:ring-cyan-400 transition ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
