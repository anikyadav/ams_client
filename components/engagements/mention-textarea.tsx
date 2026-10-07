"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Participant } from "@/lib/types";

const MAX_SUGGESTIONS = 5;

/** The "@partial name" being typed just before the caret, if it can still become a mention. */
function activeMention(text: string, caret: number, people: Participant[]) {
  const head = text.slice(0, caret);
  const at = head.lastIndexOf("@");
  if (at < 0 || (at > 0 && !/\s/.test(head[at - 1]))) return null;
  const query = head.slice(at + 1);
  if (query.includes("\n") || query.length > 40) return null;
  const matches = people
    .filter((person) => person.name.toLowerCase().startsWith(query.toLowerCase()))
    .slice(0, MAX_SUGGESTIONS);
  return matches.length ? { start: at, query, matches } : null;
}

/** Comment box that suggests people while you type "@". Mentions are plain "@Full Name" text. */
export function MentionTextarea({
  value,
  onChange,
  people,
  ...props
}: Omit<React.ComponentProps<typeof Textarea>, "value" | "onChange"> & {
  value: string;
  onChange: (value: string) => void;
  people: Participant[];
}) {
  const listId = useId();
  const ref = useRef<HTMLTextAreaElement>(null);
  const [caret, setCaret] = useState(0);
  const [active, setActive] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const mention = dismissed ? null : activeMention(value, caret, people);
  const selected = mention ? Math.min(active, mention.matches.length - 1) : 0;

  function pick(person: Participant) {
    if (!mention) return;
    const next = `${value.slice(0, mention.start)}@${person.name} ${value.slice(caret)}`;
    const position = mention.start + person.name.length + 2;
    onChange(next);
    setCaret(position);
    requestAnimationFrame(() => {
      ref.current?.focus();
      ref.current?.setSelectionRange(position, position);
    });
  }
  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (!mention) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((selected + step + mention.matches.length) % mention.matches.length);
    } else if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      pick(mention.matches[selected]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setDismissed(true);
    }
  }

  return (
    <div className="relative">
      <Textarea
        {...props}
        ref={ref}
        value={value}
        aria-autocomplete="list"
        aria-controls={mention ? listId : undefined}
        aria-expanded={!!mention}
        aria-activedescendant={mention ? `${listId}-${selected}` : undefined}
        onKeyDown={onKeyDown}
        onChange={(event) => {
          onChange(event.target.value);
          setCaret(event.target.selectionStart);
          setDismissed(false);
          setActive(0);
        }}
        onSelect={(event) => setCaret(event.currentTarget.selectionStart)}
      />
      {mention && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Mention someone"
          className="absolute left-0 z-30 mt-1 w-64 overflow-hidden rounded-lg border bg-popover p-1 shadow-md"
        >
          {mention.matches.map((person, index) => (
            <li
              key={person.id}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === selected}
              // Keep focus in the textarea so the caret position survives the click.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => pick(person)}
              className={cn(
                "flex cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm",
                index === selected && "bg-muted",
              )}
            >
              {person.name}
              <span className="text-xs text-muted-foreground">
                {person.role === "AUDITOR" ? "Auditor" : "Staff"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Comment text with @mentions of known people highlighted. */
export function MentionText({ text, people }: { text: string; people: Participant[] }) {
  if (!people.length || !text.includes("@")) return <>{text}</>;
  const names = [...people].map((person) => person.name).sort((a, b) => b.length - a.length);
  const pattern = new RegExp(`(@(?:${names.map(escape).join("|")}))(?![\\p{L}\\p{N}_])`, "giu");
  return (
    <>
      {text.split(pattern).map((part, index) =>
        index % 2 === 1 ? (
          <span key={index} className="rounded bg-primary/10 px-1 font-medium text-primary">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}
