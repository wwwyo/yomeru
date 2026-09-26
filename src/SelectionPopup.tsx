import { forwardRef } from "react";
import type { SelectionInfo } from "./selection";

interface SelectionPopupProps {
  selection: SelectionInfo;
  noteDraft: string;
  onNoteDraftChange: (value: string) => void;
  onHighlight: () => void;
  onQuestion: () => void;
}

export const SelectionPopup = forwardRef<HTMLDivElement, SelectionPopupProps>(function SelectionPopup(
  { selection, noteDraft, onNoteDraftChange, onHighlight, onQuestion },
  ref,
) {
  const { anchorClientRect } = selection;
  const style = {
    left: `${anchorClientRect.left + anchorClientRect.width / 2}px`,
    top: `${anchorClientRect.bottom + window.scrollY + 8}px`,
  };

  return (
    <div ref={ref} className="selection-popup" style={style}>
      <textarea
        className="selection-popup-note"
        placeholder="メモ（任意）"
        value={noteDraft}
        onChange={(e) => onNoteDraftChange(e.target.value)}
      />
      <div className="selection-popup-actions">
        <button type="button" onClick={onHighlight}>
          ハイライト <kbd>h</kbd>
        </button>
        <button type="button" onClick={onQuestion}>
          Claude に聞く <kbd>q</kbd>
        </button>
      </div>
    </div>
  );
});
