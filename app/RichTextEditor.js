'use client';

import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';

const toolbarItems = [
  { label: 'Título 1', action: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(), active: (editor) => editor.isActive('heading', { level: 1 }) },
  { label: 'Título 2', action: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: (editor) => editor.isActive('heading', { level: 2 }) },
  { label: 'Título 3', action: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: (editor) => editor.isActive('heading', { level: 3 }) },
  { label: 'Negrito', action: (editor) => editor.chain().focus().toggleBold().run(), active: (editor) => editor.isActive('bold') },
  { label: 'Itálico', action: (editor) => editor.chain().focus().toggleItalic().run(), active: (editor) => editor.isActive('italic') },
  { label: 'Sublinhado', action: (editor) => editor.chain().focus().toggleUnderline().run(), active: (editor) => editor.isActive('underline') },
  { label: 'Lista', action: (editor) => editor.chain().focus().toggleBulletList().run(), active: (editor) => editor.isActive('bulletList') },
  { label: 'Lista numerada', action: (editor) => editor.chain().focus().toggleOrderedList().run(), active: (editor) => editor.isActive('orderedList') }
];

export default function RichTextEditor({ value, onChange }) {
  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: value || '',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'rich-editor-content'
      }
    },
    onUpdate: ({ editor: currentEditor }) => onChange(currentEditor.getHTML())
  });

  if (!editor) return <div className="rich-editor-loading">A preparar o editor...</div>;

  return <div className="rich-editor">
    <div className="rich-editor-toolbar" aria-label="Ferramentas de formatação">
      {toolbarItems.map((item) => <button
        key={item.label}
        type="button"
        className={item.active(editor) ? 'editor-tool active' : 'editor-tool'}
        onClick={() => item.action(editor)}
        aria-label={item.label}
        title={item.label}
      >{item.label}</button>)}
    </div>
    <EditorContent editor={editor} />
  </div>;
}
