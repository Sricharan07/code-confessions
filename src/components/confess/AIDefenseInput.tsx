import React from "react";

interface AIDefenseInputProps {
  value: string;
  onChange: (val: string) => void;
  image: string | null;
  onImageChange: (img: string | null) => void;
}

export function AIDefenseInput({ value, onChange, image, onImageChange }: AIDefenseInputProps) {
  const charsLeft = 280 - value.length;
  const isNearLimit = charsLeft <= 30;

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
            resolve(dataUrl);
          } else {
            resolve(e.target?.result as string);
          }
        };
        img.onerror = () => {
          resolve(e.target?.result as string);
        };
        img.src = e.target?.result as string;
      };
      reader.onerror = () => {
        resolve("");
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("Image is too large! Please choose an image smaller than 10MB.");
      return;
    }
    
    try {
      const compressed = await compressImage(file);
      if (compressed) {
        onImageChange(compressed);
      }
    } catch (err) {
      console.error("Failed to compress image:", err);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <label className="font-sans text-xs font-semibold text-ink/75 block">
          AI&apos;s Defense (Optional)
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
          onChange={(e) => onChange(e.target.value.slice(0, 280))}
          rows={3}
          maxLength={280}
          placeholder='Paste the "you&apos;re absolutely right! I apologize for the confusion" moment. This becomes a shareable meme.'
          className="w-full bg-paper border border-ink/20 rounded-lg px-3.5 py-2.5 text-sm font-sans focus:outline-none focus:border-ink/40 focus:ring-1 focus:ring-ink/10 transition-all placeholder:text-ink/45 resize-none"
        />
        <div
          className={`absolute bottom-2 right-3 font-mono text-[9px] font-medium px-1 ${
            isNearLimit ? "bg-hot text-paper rounded border border-hot" : "text-ink/40"
          }`}
        >
          {value.length}/280
        </div>
      </div>

      {image && (
        <div className="relative inline-block mt-1">
          <div className="w-32 h-20 border border-ink/15 rounded-lg overflow-hidden bg-ink/5">
            <img src={image} className="w-full h-full object-cover" alt="Attached AI defense evidence" />
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
