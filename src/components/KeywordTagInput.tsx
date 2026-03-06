import React, { useState, KeyboardEvent } from 'react';
import { X } from 'lucide-react';

interface KeywordTagInputProps {
  keywords: string[];
  onChange: (keywords: string[]) => void;
  maxKeywords?: number;
}

export default function KeywordTagInput({ keywords, onChange, maxKeywords = 2 }: KeywordTagInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      if (keywords.length < maxKeywords) {
        onChange([...keywords, inputValue.trim()]);
        setInputValue('');
      }
    }
  };

  const removeKeyword = (index: number) => {
    onChange(keywords.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 min-h-[42px] p-2 border border-gray-300 rounded-md bg-white">
        {keywords.map((keyword, index) => (
          <span
            key={index}
            className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium"
          >
            {keyword}
            <button
              type="button"
              onClick={() => removeKeyword(index)}
              className="hover:bg-indigo-200 rounded-full p-0.5 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {keywords.length < maxKeywords && (
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={keywords.length === 0 ? "Type keyword and press Enter..." : ""}
            className="flex-1 min-w-[200px] outline-none bg-transparent text-sm"
          />
        )}
      </div>
      <p className="text-xs text-gray-500">
        {keywords.length}/{maxKeywords} keywords added. Press Enter to add.
      </p>
    </div>
  );
}
