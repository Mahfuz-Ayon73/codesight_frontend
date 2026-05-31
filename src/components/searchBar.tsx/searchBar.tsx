"use client";

type SearchBarProps = {
  placeholder?: string;
  onSearch?: (query: string) => void;
};

export default function SearchBar({ placeholder = "Search…", onSearch }: SearchBarProps) {
  return (
    <input
      type="search"
      placeholder={placeholder}
      className="w-full max-w-xs rounded-lg border border-zinc-300 px-3 py-2 text-sm"
      onChange={(e) => onSearch?.(e.target.value)}
    />
  );
}
