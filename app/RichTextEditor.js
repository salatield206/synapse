'use client';

import { Extension } from '@tiptap/core';
import { EditorContent, useEditor } from '@tiptap/react';
import Color from '@tiptap/extension-color';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import Image from '@tiptap/extension-image';

const FontSize = Extension.create({
  name: 'fontSize',
  addGlobalAttributes() {
    return [{
      types: ['textStyle'],
      attributes: {
        fontSize: {
          default: null,
          parseHTML: (element) => element.style.fontSize || null,
          renderHTML: (attributes) => attributes.fontSize ? { style: `font-size: ${attributes.fontSize}` } : {}
        }
      }
    }];
  }
});

function ToolButton({ label, active, onClick }) {
  return <button type="button" className={active ? 'editor-tool active' : 'editor-tool'} onClick={onClick} aria-label={label} title={label}>{label}</button>;
}

export default function RichTextEditor({ value, onChange }) {
  const editor = useEditor({
    extensions: [StarterKit, Underline, TextStyle, Color, TextAlign.configure({ types: ['heading', 'paragraph'] }), FontSize, Image],
    content: value || '',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'rich-editor-content p-6 leading-relaxed text-[10px]',
        style: 'min-height: 250px; font-size: 10px;'
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        let hasImage = false;
        for (const item of items) {
          if (item.type.indexOf('image') === 0) {
            hasImage = true;
            const file = item.getAsFile();
            const reader = new FileReader();
            reader.onload = (e) => {
              const src = e.target.result;
              const { schema } = view.state;
              const node = schema.nodes.image.create({ src });
              const transaction = view.state.tr.replaceSelectionWith(node);
              view.dispatch(transaction);
            };
            reader.readAsDataURL(file);
          }
        }
        return hasImage;
      }
    },
    onUpdate: ({ editor: currentEditor }) => onChange(currentEditor.getHTML())
  });

  if (!editor) return <div className="rich-editor-loading">A preparar o editor...</div>;

  const setFontSize = (event) => {
    const size = event.target.value;
    const chain = editor.chain().focus();
    if (size) chain.setMark('textStyle', { fontSize: size }).run();
    else chain.unsetMark('textStyle').run();
  };

  const setTextColor = (event) => editor.chain().focus().setColor(event.target.value).run();

  return <div className="rich-editor">
    <div className="rich-editor-toolbar" aria-label="Ferramentas de formatação">
      <select className="editor-select" defaultValue="" onChange={setFontSize} aria-label="Tamanho da fonte">
        <option value="">Tamanho</option><option value="10pt">10</option><option value="12pt">12</option><option value="14pt">14</option><option value="16pt">16</option><option value="18pt">18</option><option value="24pt">24</option><option value="32pt">32</option>
      </select>
      <label className="editor-color" title="Cor do texto">Cor <input type="color" defaultValue="#2D1B33" onChange={setTextColor} aria-label="Cor do texto" /></label>
      <ToolButton label="Título 1" active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} />
      <ToolButton label="Negrito" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} />
      <ToolButton label="Itálico" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} />
      <ToolButton label="Sublinhado" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} />
      <ToolButton label="Alinhar à esquerda" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()} />
      <ToolButton label="Centralizar" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()} />
      <ToolButton label="Alinhar à direita" active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()} />
      <ToolButton label="Justificar" active={editor.isActive({ textAlign: 'justify' })} onClick={() => editor.chain().focus().setTextAlign('justify').run()} />
      <ToolButton label="Lista" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} />
      <ToolButton label="Lista numerada" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
      <ToolButton label="Desfazer" onClick={() => editor.chain().focus().undo().run()} />
      <ToolButton label="Refazer" onClick={() => editor.chain().focus().redo().run()} />
    </div>
    <EditorContent editor={editor} />
  </div>;
}
