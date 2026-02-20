import React from 'react';
import ReactMarkdown from 'react-markdown';

interface PreviewProps {
  markdown: string;
}

const Preview: React.FC<PreviewProps> = ({ markdown }) => {
  return (
    <div className="preview-container">
      <div className="preview-content markdown-body">
        <ReactMarkdown
          components={{
            h1: ({ children }) => <h1 id={children?.toString().toLowerCase().replace(/\s+/g, '-')}>{children}</h1>,
            h2: ({ children }) => <h2 id={children?.toString().toLowerCase().replace(/\s+/g, '-')}>{children}</h2>,
            h3: ({ children }) => <h3 id={children?.toString().toLowerCase().replace(/\s+/g, '-')}>{children}</h3>,
          }}
        >
          {markdown}
        </ReactMarkdown>
      </div>
    </div>
  );
};

export default Preview;
