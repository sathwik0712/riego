"use client";

// SensorKeyPanel Component
// Reusable panel (modal by default, or full-width card) to display the newly issued sensor device key.
// Shows the key once; keeps the key in memory only; never logs it or stores it in any persistent cache.

import { useState } from "react";
import { CheckIcon, CopyIcon } from "./icons";

interface SensorKeyPanelProps {
  deviceKey: string;
  onClose: () => void;
  asCard?: boolean;
}

export default function SensorKeyPanel({
  deviceKey,
  onClose,
  asCard = false,
}: SensorKeyPanelProps) {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = async () => {
    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        navigator.clipboard.writeText
      ) {
        await navigator.clipboard.writeText(deviceKey);
      } else if (typeof document !== "undefined") {
        const textarea = document.createElement("textarea");
        textarea.value = deviceKey;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Clipboard write failure ignored silently
    }
  };

  const cardContent = (
    <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 border border-[#DCD6C0] shadow-xl flex flex-col gap-5">
      {/* Title */}
      <div>
        <h2
          id="sensor-key-title"
          className="text-xl sm:text-2xl font-extrabold text-[#1B2D21]"
        >
          Your sensor key
        </h2>
      </div>

      {/* Key in a box — break-all ensures it wraps and never scrolls sideways at 360px */}
      <div className="w-full p-4 rounded-2xl bg-[#FAF7EE] border border-[#DCD6C0] font-mono text-sm sm:text-base font-bold text-[#1B2D21] break-all select-all">
        {deviceKey}
      </div>

      {/* One plain sentence instruction */}
      <p className="text-sm sm:text-base text-[#5F6E62]">
        Save this key now. It is shown only once. Put it in your sensor.
      </p>

      {/* Action buttons (min 56px tall) */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          type="button"
          onClick={handleCopy}
          className="flex-1 min-h-[56px] px-6 py-3 rounded-2xl border-2 border-[#235334] bg-white text-[#235334] font-bold text-base hover:bg-[#FAF7EE] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {copied ? (
            <>
              <CheckIcon className="w-5 h-5 text-[#2E7D32]" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <CopyIcon className="w-5 h-5 text-[#235334]" />
              <span>Copy key</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onClose}
          className="flex-1 min-h-[56px] px-6 py-3 rounded-2xl bg-[#235334] text-[#FAF7EE] font-bold text-base hover:bg-[#1A3E27] active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
        >
          I saved it
        </button>
      </div>
    </div>
  );

  if (asCard) {
    return cardContent;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sensor-key-title"
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
    >
      {cardContent}
    </div>
  );
}
