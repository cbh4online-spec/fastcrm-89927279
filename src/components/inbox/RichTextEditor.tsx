import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import {
  forwardRef,
  useImperativeHandle,
  useState,
  useCallback,
} from 'react';
import {
  Bold,
  Italic,
  Strikethrough,
  Link as LinkIcon,
  List,
  ListOrdered,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface RichTextEditorRef {
  clearContent: () => void;
  isEmpty: () => boolean;
  getHTML: () => string;
  focus: () => void;
}

interface RichTextEditorProps {
  placeholder?: string;
  disabled?: boolean;
  onEnterSend?: () => void;
  onUpdate?: (html: string) => void;
  onFocusChange?: (focused: boolean) => void;
  className?: string;
}

export const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(
  ({ placeholder, disabled, onEnterSend, onUpdate, onFocusChange, className }, ref) => {
    const [isFocused, setIsFocused] = useState(false);

    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: false,
          codeBlock: false,
          blockquote: false,
          horizontalRule: false,
        }),
        Placeholder.configure({ placeholder: placeholder ?? 'Escreva a sua mensagem...' }),
        Link.configure({ openOnClick: false, autolink: true }),
      ],
      editable: !disabled,
      editorProps: {
        attributes: {
          class: cn(
            'prose prose-sm max-w-none focus:outline-none min-h-[32px] max-h-[120px] overflow-y-auto py-1.5 px-0',
            'text-foreground placeholder:text-muted-foreground',
            '[&_p]:m-0 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0',
          ),
        },
        handleKeyDown: (_view, event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            onEnterSend?.();
            return true;
          }
          return false;
        },
      },
      onUpdate: ({ editor: e }) => {
        onUpdate?.(e.getHTML());
      },
      onFocus: () => {
        setIsFocused(true);
        onFocusChange?.(true);
      },
      onBlur: () => {
        setIsFocused(false);
        onFocusChange?.(false);
      },
    });

    useImperativeHandle(ref, () => ({
      clearContent: () => editor?.commands.clearContent(true),
      isEmpty: () => editor?.isEmpty ?? true,
      getHTML: () => editor?.getHTML() ?? '',
      focus: () => editor?.commands.focus(),
    }));

    const toggleLink = useCallback(() => {
      if (!editor) return;
      if (editor.isActive('link')) {
        editor.chain().focus().unsetLink().run();
        return;
      }
      const url = window.prompt('URL:');
      if (url) {
        editor.chain().focus().setLink({ href: url }).run();
      }
    }, [editor]);

    if (!editor) return null;

    const ToolbarButton = ({
      onClick,
      active,
      children,
      title,
    }: {
      onClick: () => void;
      active?: boolean;
      children: React.ReactNode;
      title: string;
    }) => (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn('h-6 w-6 rounded', active && 'bg-accent text-accent-foreground')}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClick}
        title={title}
      >
        {children}
      </Button>
    );

    const toolbarButtons = (
      <>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="Negrito"
        >
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="Itálico"
        >
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive('strike')}
          title="Riscado"
        >
          <Strikethrough className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={toggleLink} active={editor.isActive('link')} title="Link">
          <LinkIcon className="h-3.5 w-3.5" />
        </ToolbarButton>
        <div className="w-px h-4 bg-border mx-0.5" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="Lista"
        >
          <List className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="Lista numerada"
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarButton>
      </>
    );

    return (
      <div className={cn('flex flex-col flex-1 min-w-0', className)}>
        {/* Toolbar — visible on focus */}
        {isFocused && (
          <div className="flex items-center gap-0.5 pb-1 mb-1 border-b border-border/50 animate-fade-in">
            {toolbarButtons}
          </div>
        )}

        {/* Bubble menu on selection */}
        <BubbleMenu
          editor={editor}
          tippyOptions={{ duration: 150 }}
          className="flex items-center gap-0.5 p-1 rounded-lg bg-popover border shadow-xl"
        >
          {toolbarButtons}
        </BubbleMenu>

        <EditorContent editor={editor} className="flex-1 min-w-0" />
      </div>
    );
  },
);

RichTextEditor.displayName = 'RichTextEditor';
