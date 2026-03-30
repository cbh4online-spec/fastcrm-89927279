import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Typography from '@tiptap/extension-typography';
import CharacterCount from '@tiptap/extension-character-count';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import Youtube from '@tiptap/extension-youtube';
import {
  forwardRef,
  useImperativeHandle,
  useEffect,
  useCallback,
} from 'react';
import {
  Bold,
  Italic,
  Strikethrough,
  Underline as UnderlineIcon,
  Link as LinkIcon,
  List,
  ListOrdered,
  ListChecks,
  ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Highlighter,
  Palette,
  Subscript as SubIcon,
  Superscript as SupIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface RichTextEditorRef {
  clearContent: () => void;
  isEmpty: () => boolean;
  getHTML: () => string;
  focus: () => void;
  insertContent: (html: string) => void;
  getCharacterCount: () => number;
}

interface RichTextEditorProps {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  minHeight?: string;
  enableImage?: boolean;
  onImageUpload?: () => void;
  maxCharacters?: number;
  showCharacterCount?: boolean;
}

export const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(
  (
    {
      value,
      onChange,
      placeholder = 'Escreve aqui...',
      disabled,
      className,
      minHeight = '100px',
      enableImage,
      onImageUpload,
      maxCharacters,
      showCharacterCount = false,
    },
    ref,
  ) => {
    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: false,
          codeBlock: false,
          horizontalRule: false,
        }),
        Placeholder.configure({ placeholder }),
        Link.configure({ openOnClick: false, autolink: true }),
        Underline,
        TextStyle,
        Color,
        Highlight.configure({ multicolor: true }),
        Typography,
        CharacterCount.configure({ limit: maxCharacters }),
        TaskList,
        TaskItem.configure({ nested: true }),
        Subscript,
        Superscript,
        Youtube.configure({ controls: true }),
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        ...(enableImage ? [Image.configure({ inline: false })] : []),
      ],
      content: value ?? '',
      editable: !disabled,
      onUpdate: ({ editor: e }) => {
        onChange?.(e.getHTML());
      },
    });

    // Sync external value changes
    useEffect(() => {
      if (!editor) return;
      const current = editor.getHTML();
      if (value !== undefined && value !== current) {
        editor.commands.setContent(value, { emitUpdate: false });
      }
    }, [value, editor]);

    useImperativeHandle(ref, () => ({
      clearContent: () => editor?.commands.clearContent(true),
      isEmpty: () => editor?.isEmpty ?? true,
      getHTML: () => editor?.getHTML() ?? '',
      focus: () => editor?.commands.focus(),
      insertContent: (html: string) => editor?.commands.insertContent(html),
      getCharacterCount: () => editor?.storage.characterCount?.characters() ?? 0,
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
        className={cn(
          'h-7 w-7 rounded',
          active && 'bg-accent text-accent-foreground',
        )}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClick}
        title={title}
      >
        {children}
      </Button>
    );

    const charCount = editor.storage.characterCount?.characters() ?? 0;

    return (
      <div className={cn('flex flex-col', className)}>
        {/* Fixed toolbar */}
        <div className="flex items-center gap-0.5 pb-1.5 mb-1.5 border-b border-border/50 flex-wrap">
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
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive('underline')}
            title="Sublinhado"
          >
            <UnderlineIcon className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive('strike')}
            title="Riscado"
          >
            <Strikethrough className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={toggleLink}
            active={editor.isActive('link')}
            title="Link"
          >
            <LinkIcon className="h-3.5 w-3.5" />
          </ToolbarButton>

          <div className="w-px h-4 bg-border mx-0.5" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHighlight({ color: '#fef08a' }).run()}
            active={editor.isActive('highlight')}
            title="Destacar"
          >
            <Highlighter className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => {
              const color = window.prompt('Cor (hex):', '#ef4444');
              if (color) editor.chain().focus().setColor(color).run();
            }}
            active={!!editor.getAttributes('textStyle').color}
            title="Cor do texto"
          >
            <Palette className="h-3.5 w-3.5" />
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
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            active={editor.isActive('taskList')}
            title="Lista de tarefas"
          >
            <ListChecks className="h-3.5 w-3.5" />
          </ToolbarButton>

          <div className="w-px h-4 bg-border mx-0.5" />

          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            active={editor.isActive({ textAlign: 'left' })}
            title="Alinhar à esquerda"
          >
            <AlignLeft className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            active={editor.isActive({ textAlign: 'center' })}
            title="Centrar"
          >
            <AlignCenter className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            active={editor.isActive({ textAlign: 'right' })}
            title="Alinhar à direita"
          >
            <AlignRight className="h-3.5 w-3.5" />
          </ToolbarButton>

          <div className="w-px h-4 bg-border mx-0.5" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleSubscript().run()}
            active={editor.isActive('subscript')}
            title="Subscript"
          >
            <SubIcon className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleSuperscript().run()}
            active={editor.isActive('superscript')}
            title="Superscript"
          >
            <SupIcon className="h-3.5 w-3.5" />
          </ToolbarButton>

          {enableImage && (
            <>
              <div className="w-px h-4 bg-border mx-0.5" />
              <ToolbarButton
                onClick={() => {
                  if (onImageUpload) {
                    onImageUpload();
                  } else {
                    const url = window.prompt('URL da imagem:');
                    if (url) {
                      editor.chain().focus().setImage({ src: url }).run();
                    }
                  }
                }}
                title="Imagem"
              >
                <ImageIcon className="h-3.5 w-3.5" />
              </ToolbarButton>
            </>
          )}
        </div>

        {/* Editor content */}
        <EditorContent
          editor={editor}
          className={cn(
            'prose prose-sm max-w-none flex-1',
            'text-foreground',
            '[&_.tiptap]:outline-none [&_.tiptap]:min-h-[var(--editor-min-h)]',
            '[&_p]:m-0 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0',
            '[&_ul[data-type=taskList]]:list-none [&_ul[data-type=taskList]]:pl-0',
          )}
          style={{ '--editor-min-h': minHeight } as React.CSSProperties}
        />

        {/* Character count */}
        {showCharacterCount && (
          <div className="text-[11px] text-muted-foreground text-right pt-1 border-t border-border/30 mt-1">
            {charCount}{maxCharacters ? ` / ${maxCharacters}` : ''} caracteres
          </div>
        )}
      </div>
    );
  },
);

RichTextEditor.displayName = 'RichTextEditor';
