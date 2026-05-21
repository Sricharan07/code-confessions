import { useState } from "react";

interface CrimeSceneTextareaProps {
  value: string;
  onChange: (val: string) => void;
  image: string | null;
  onImageChange: (img: string | null) => void;
}

export function CrimeSceneTextarea({ value, onChange, image, onImageChange }: CrimeSceneTextareaProps) {
  const [focused, setFocused] = useState(false);

  const charsLeft = 500 - value.length;
  const isNearLimit = charsLeft <= 30;

  // 4 rows default, expands to 8 rows when focused or if text is long
  const numRows = focused || value.length > 150 ? 8 : 4;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2.5 * 1024 * 1024) {
      alert("Image is too large! Please choose an image smaller than 2.5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        onImageChange(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <label className="font-sans text-xs font-semibold text-ink/75 block">
          The Crime Scene (Required)
        </label>
        {!image && (
          <label className="flex items-center gap-1.5 px-3 py-1 border border-ink/20 hover:border-ink/40 rounded-full text-[10px] font-bold text-ink/70 hover:text-ink hover:bg-ink/5 cursor-pointer transition-all">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Attach Screenshot</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        )}
      </div>

      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, 500))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          rows={numRows}
          maxLength={500}
          placeholder="spill. don't ask AI to write, it'll lie."
          className="w-full bg-paper border border-ink/20 rounded-lg px-3.5 py-2.5 text-sm font-sans focus:outline-none focus:border-ink/40 focus:ring-1 focus:ring-ink/10 transition-all placeholder:text-ink/45 resize-none"
        />
        <div
          className={`absolute bottom-2 right-3 font-mono text-[9px] font-medium px-1 ${
            isNearLimit ? "bg-hot text-paper rounded border border-hot" : "text-ink/40"
          }`}
        >
          {value.length}/500
        </div>
      </div>

      {image && (
        <div className="relative inline-block mt-1">
          <div className="w-32 h-20 border border-ink/15 rounded-lg overflow-hidden bg-ink/5">
            <img src={image} className="w-full h-full object-cover" alt="Attached evidence" />
          </div>
          <button
            type="button"
            onClick={() => onImageChange(null)}
            className="absolute -top-1.5 -right-1.5 bg-ink text-paper rounded-full w-4.5 h-4.5 flex items-center justify-center text-[8px] font-bold border border-paper shadow-sm hover:bg-hot transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
