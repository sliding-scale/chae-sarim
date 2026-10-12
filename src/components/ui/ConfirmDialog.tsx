"use client";

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from "react";

export type ConfirmOptions = {
  title: string;
  body: string;
  confirmLabel: string;
  tone: "primary" | "danger";
  noteLabel?: string;
};

export type ConfirmResult = {
  accepted: boolean;
  note: string;
};

const ConfirmContext = createContext<((options: ConfirmOptions) => Promise<ConfirmResult>) | null>(null);

// Asks the signed-in person to confirm a decision before it is saved.
export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("Confirmation is only available inside the dashboard.");
  return confirm;
}

// Shows one confirmation dialog for the dashboard page that asks for it.
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((result: ConfirmResult) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<ConfirmResult>((resolve) => {
      resolveRef.current = resolve;
      setRequest(options);
    });
  }, []);

  const finish = useCallback((result: ConfirmResult) => {
    resolveRef.current?.(result);
    resolveRef.current = null;
    setRequest(null);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {request ? <ConfirmDialog request={request} onFinish={finish} /> : null}
    </ConfirmContext.Provider>
  );
}

// Renders the confirmation card and closes it from the buttons, Escape, or the backdrop.
function ConfirmDialog({
  request,
  onFinish,
}: {
  request: ConfirmOptions;
  onFinish: (result: ConfirmResult) => void;
}) {
  const titleId = useId();
  const bodyId = useId();
  const noteId = useId();
  const confirmRef = useRef<HTMLButtonElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    (request.noteLabel ? noteRef.current : confirmRef.current)?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onFinish({ accepted: false, note: "" });
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onFinish, request.noteLabel]);

  return (
    <div
      className="confirm-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onFinish({ accepted: false, note: "" });
      }}
    >
      <section
        className="saas-card confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
      >
        <h2 id={titleId} className="panel-title">
          {request.title}
        </h2>
        <p id={bodyId} className="panel-copy">
          {request.body}
        </p>
        {request.noteLabel ? (
          <div className="confirm-note">
            <label className="form-label" htmlFor={noteId}>
              {request.noteLabel} <span className="field-optional">(optional)</span>
            </label>
            <textarea
              ref={noteRef}
              id={noteId}
              className="input-saas timesheet-comments"
              maxLength={500}
              value={note}
              placeholder="The worker will see this with the rejection."
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
        ) : null}
        <div className="confirm-actions">
          <button type="button" className="btn-secondary" onClick={() => onFinish({ accepted: false, note: "" })}>
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={request.tone === "danger" ? "btn-danger" : "btn-primary"}
            onClick={() => onFinish({ accepted: true, note: note.trim() })}
          >
            {request.confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
