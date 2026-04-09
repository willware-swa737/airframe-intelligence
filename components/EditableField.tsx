"use client";
import { useState, useRef, useEffect } from "react";

interface EditableFieldProps {
  entryId: string;
  field: string;
  value: string | number | null | undefined;
  type?: "text" | "number";
  placeholder?: string;
  prefix?: string;
  suffix?: string;
  className?: string;
  displayClassName?: string;
}

export default function EditableField({
  entryId,
  field,
  value,
  type = "text",
  placeholder = "click to add",
  prefix,
  suffix,
  className = "",
  displayClassName = "",
}: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalValue(value?.toString() ?? "");
  }, [value]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  async function save() {
    if (localValue === (value?.toString() ?? "")) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setEditing(false);
    try {
      const res = await fetch(`/api/hangar/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [field]: localValue === "" ? null : type === "number" ? Number(localValue) : localValue,
        }),
      });
      if (!res.ok) throw new Error();
      setFlash(true);
      setTimeout(() => setFlash(false), 1000);
    } catch {
      setLocalValue(value?.toString() ?? "");
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type={type}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); save(); }
          if (e.key === "Escape") { setLocalValue(value?.toString() ?? ""); setEditing(false); }
        }}
        className={`border-b-2 border-blue-400 outline-none bg-blue-50 rounded-sm px-1 ${className}`}
      />
    );
  }

  const display = localValue
    ? `${prefix ?? ""}${localValue}${suffix ?? ""}`
    : null;

  return (
    <span
      onClick={() => !saving && setEditing(true)}
      title="Click to edit"
      className={`group cursor-pointer inline-flex items-center gap-1 ${displayClassName}`}
    >
      <span className={`transition-colors ${flash ? "text-green-600" : saving ? "opacity-40" : "group-hover:text-blue-600"}`}>
        {display ?? <span className="text-slate-300 italic text-sm font-normal">{placeholder}</span>}
      </span>
      {!saving && !flash && (
        <svg className="w-3 h-3 text-slate-300 group-hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      )}
    </span>
  );
}
