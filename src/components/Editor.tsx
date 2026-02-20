import React from 'react';

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
}

const Editor: React.FC<EditorProps> = ({ value, onChange }) => {
  return (
    <div className="editor-container">
      <textarea
        className="editor-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Markdown yazmaya başla..."
        autoFocus
      />
    </div>
  );
};

export default Editor;
