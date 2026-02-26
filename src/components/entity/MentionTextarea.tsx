import { useState, useRef, useCallback, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useWorkspaceMembers, WorkspaceMember } from '@/hooks/useWorkspaceMembers';

interface MentionTextareaProps {
  value: string;
  onChange: (value: string, mentions: string[]) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  placeholder?: string;
  className?: string;
}

export function MentionTextarea({ value, onChange, onKeyDown, placeholder, className }: MentionTextareaProps) {
  const { data: members = [] } = useWorkspaceMembers();
  const [showDropdown, setShowDropdown] = useState(false);
  const [search, setSearch] = useState('');
  const [dropdownIndex, setDropdownIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [mentionIds, setMentionIds] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filtered = members.filter(m => {
    const name = m.profile?.full_name || m.profile?.email || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const cursor = e.target.selectionStart || 0;

    // Detect @ trigger
    const textBefore = val.slice(0, cursor);
    const lastAt = textBefore.lastIndexOf('@');

    if (lastAt >= 0) {
      const charBefore = lastAt > 0 ? textBefore[lastAt - 1] : ' ';
      const textAfterAt = textBefore.slice(lastAt + 1);
      const hasSpace = /\s/.test(charBefore) || lastAt === 0;
      const noNewline = !textAfterAt.includes('\n');

      if (hasSpace && noNewline) {
        setShowDropdown(true);
        setSearch(textAfterAt);
        setMentionStart(lastAt);
        setDropdownIndex(0);
      } else {
        setShowDropdown(false);
      }
    } else {
      setShowDropdown(false);
    }

    onChange(val, mentionIds);
  };

  const insertMention = useCallback((member: WorkspaceMember) => {
    if (mentionStart === null || !textareaRef.current) return;
    const name = member.profile?.full_name || member.profile?.email || 'Membro';
    const before = value.slice(0, mentionStart);
    const cursor = textareaRef.current.selectionStart || 0;
    const after = value.slice(cursor);
    const newValue = `${before}@${name} ${after}`;
    const newIds = [...mentionIds];
    if (!newIds.includes(member.user_id)) newIds.push(member.user_id);
    setMentionIds(newIds);
    onChange(newValue, newIds);
    setShowDropdown(false);
    setMentionStart(null);

    // Restore focus
    setTimeout(() => {
      const pos = before.length + name.length + 2; // @name + space
      textareaRef.current?.setSelectionRange(pos, pos);
      textareaRef.current?.focus();
    }, 0);
  }, [mentionStart, value, mentionIds, onChange]);

  const handleKeyDownInternal = (e: React.KeyboardEvent) => {
    if (showDropdown && filtered.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setDropdownIndex(i => Math.min(i + 1, filtered.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setDropdownIndex(i => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(filtered[dropdownIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowDropdown(false);
        return;
      }
    }
    onKeyDown?.(e);
  };

  // Reset mentions when value is cleared externally
  useEffect(() => {
    if (!value) setMentionIds([]);
  }, [value]);

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDownInternal}
        placeholder={placeholder}
        className={className}
      />
      {showDropdown && filtered.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 bottom-full mb-1 z-50 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto"
        >
          {filtered.slice(0, 8).map((member, idx) => {
            const name = member.profile?.full_name || member.profile?.email || 'Membro';
            const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
            return (
              <button
                key={member.id}
                type="button"
                className={`flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-accent transition-colors ${idx === dropdownIndex ? 'bg-accent' : ''}`}
                onMouseDown={(e) => { e.preventDefault(); insertMention(member); }}
                onMouseEnter={() => setDropdownIndex(idx)}
              >
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{name}</span>
                {member.profile?.email && member.profile?.full_name && (
                  <span className="text-xs text-muted-foreground truncate ml-auto">{member.profile.email}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Renders note content with @mentions highlighted */
export function renderNoteContent(content: string) {
  const mentionRegex = /@([\p{L}\p{M}\s]+?)(?=\s@|\s[^@]|$)/gu;
  const parts: (string | JSX.Element)[] = [];
  let lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = mentionRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }
    parts.push(
      <span key={match.index} className="font-semibold text-primary">
        @{match[1].trim()}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts.length > 0 ? parts : content;
}
