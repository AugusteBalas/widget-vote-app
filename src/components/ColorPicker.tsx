'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  presets?: string[];
}

const DEFAULT_PRESETS = [
  '#4A90D9', // ViaSay Blue
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#ef4444', // Red
  '#f59e0b', // Amber
  '#22c55e', // Green
  '#1f2937', // Dark Gray
];

export default function ColorPicker({
  label,
  value,
  onChange,
  presets = DEFAULT_PRESETS,
}: ColorPickerProps) {
  const [hasEyeDropper, setHasEyeDropper] = useState(false);

  useEffect(() => {
    setHasEyeDropper('EyeDropper' in window);
  }, []);

  const handleEyeDropper = useCallback(async () => {
    try {
      // @ts-expect-error EyeDropper is not in all browsers
      const eyeDropper = new window.EyeDropper();
      const result = await eyeDropper.open();
      onChange(result.sRGBHex);
    } catch {
      // User canceled or not supported
    }
  }, [onChange]);

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-slate-300">{label}</label>

      <div className="flex items-center gap-3">
        {/* Native color input with eyedropper support */}
        <div className="relative w-12 h-12">
          <div
            className="absolute inset-0 rounded-xl border-2 border-slate-600 pointer-events-none"
            style={{ backgroundColor: value }}
          />
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>

        {/* Hex input */}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="#000000"
        />

        {/* Eyedropper button (if supported) */}
        {hasEyeDropper && (
          <button
            type="button"
            onClick={handleEyeDropper}
            className="p-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
            title="Pipette"
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
          </button>
        )}
      </div>

      {/* Presets */}
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <button
            key={preset}
            onClick={() => onChange(preset)}
            className={`w-8 h-8 rounded-lg transition-transform hover:scale-110 ${
              value === preset ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-800' : ''
            }`}
            style={{ backgroundColor: preset }}
            title={preset}
          />
        ))}
      </div>
    </div>
  );
}
