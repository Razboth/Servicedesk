'use client';

import { useState } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { Button } from '@/components/ui/button';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Image as ImageIcon,
  Loader2,
  Upload
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  editable?: boolean;
}

// Helper function to upload image to server
const uploadImageToServer = async (file: File): Promise<string | null> => {
  try {
    // Convert file to base64
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve, reject) => {
      reader.onload = () => {
        const base64 = reader.result as string;
        const base64Content = base64.split(',')[1];
        resolve(base64Content);
      };
      reader.onerror = reject;
    });

    reader.readAsDataURL(file);
    const base64Content = await base64Promise;

    // Send as JSON with base64 content
    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename: file.name,
        mimeType: file.type,
        size: file.size,
        content: base64Content
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return `/api/files/${data.filename}`;
    } else {
      const error = await response.json();
      toast.error(`Failed to upload image: ${error.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Error uploading image:', error);
    toast.error('Failed to upload image');
  }
  return null;
};

const MenuBar = ({ editor, setUploading }: { editor: Editor | null; setUploading: (value: boolean) => void }) => {
  if (!editor) return null;

  const handleImageUpload = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setUploading(true);
        const url = await uploadImageToServer(file);
        setUploading(false);
        if (url) {
          editor.chain().focus().setImage({ src: url }).run();
        }
      }
    };
    input.click();
  };

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 p-2 flex flex-wrap gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={cn(
          "h-8 w-8 p-0",
          editor.isActive('bold') ? 'bg-gray-200 dark:bg-gray-700' : ''
        )}
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={cn(
          "h-8 w-8 p-0",
          editor.isActive('italic') ? 'bg-gray-200 dark:bg-gray-700' : ''
        )}
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={cn(
          "h-8 w-8 p-0",
          editor.isActive('bulletList') ? 'bg-gray-200 dark:bg-gray-700' : ''
        )}
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={cn(
          "h-8 w-8 p-0",
          editor.isActive('orderedList') ? 'bg-gray-200 dark:bg-gray-700' : ''
        )}
      >
        <ListOrdered className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={cn(
          "h-8 w-8 p-0",
          editor.isActive('blockquote') ? 'bg-gray-200 dark:bg-gray-700' : ''
        )}
      >
        <Quote className="h-4 w-4" />
      </Button>
      <div className="w-px h-8 bg-gray-300 dark:bg-gray-600 mx-1" />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleImageUpload}
        className="h-8 w-8 p-0"
        title="Upload Image"
      >
        <Upload className="h-4 w-4" />
      </Button>
      <div className="w-px h-8 bg-gray-300 dark:bg-gray-600 mx-1" />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().chain().focus().undo().run()}
        className="h-8 w-8 p-0"
      >
        <Undo className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().chain().focus().redo().run()}
        className="h-8 w-8 p-0"
      >
        <Redo className="h-4 w-4" />
      </Button>
    </div>
  );
};

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Type your comment here...',
  className,
  editable = true
}: RichTextEditorProps) {
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    immediatelyRender: false, // Prevent SSR hydration issues
    extensions: [
      StarterKit,
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg my-2',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'min-h-[120px] max-h-[400px] overflow-y-auto px-3 py-2 focus:outline-none prose prose-sm dark:prose-invert max-w-none',
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (const item of Array.from(items)) {
          if (item.type.indexOf('image') === 0) {
            event.preventDefault();
            const file = item.getAsFile();
            if (!file) continue;

            // Upload image to server
            setUploading(true);
            uploadImageToServer(file).then((url) => {
              setUploading(false);
              if (url) {
                // Use view to insert image at current position
                const { schema } = view.state;
                const node = schema.nodes.image.create({ src: url });
                const transaction = view.state.tr.replaceSelectionWith(node);
                view.dispatch(transaction);
              }
            });
            return true;
          }
        }
        return false;
      },
      handleDrop: (view, event) => {
        const files = event.dataTransfer?.files;
        if (!files || files.length === 0) return false;

        const file = files[0];
        if (!file.type.startsWith('image/')) return false;

        event.preventDefault();

        const coordinates = view.posAtCoords({
          left: event.clientX,
          top: event.clientY
        });

        if (coordinates) {
          // Upload image to server
          setUploading(true);
          uploadImageToServer(file).then((url) => {
            setUploading(false);
            if (url) {
              const { schema } = view.state;
              const node = schema.nodes.image.create({ src: url });
              const transaction = view.state.tr.insert(coordinates.pos, node);
              view.dispatch(transaction);
            }
          });
        }
        return true;
      },
    },
  });

  return (
    <div className={cn("border rounded-lg bg-white dark:bg-gray-800 relative", className)}>
      {editable && <MenuBar editor={editor} setUploading={setUploading} />}
      <EditorContent editor={editor} />
      {uploading && (
        <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 flex items-center justify-center rounded-lg">
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-md">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Uploading image...</span>
          </div>
        </div>
      )}
    </div>
  );
}

interface RichTextViewerProps {
  content: string;
  className?: string;
}

export function RichTextViewer({ content, className }: RichTextViewerProps) {
  return (
    <div 
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none",
        "prose-img:max-w-full prose-img:h-auto prose-img:rounded-lg prose-img:my-2",
        className
      )}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}