// Marks a form label as required.
export function RequiredMark() {
  return (
    <span className="field-required">
      *<span className="sr-only"> required</span>
    </span>
  );
}
