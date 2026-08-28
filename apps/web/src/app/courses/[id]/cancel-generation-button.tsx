"use client";

import { cancelGenerationAction } from "../../actions";

export function CancelGenerationButton({ courseId }: { courseId: string }) {
  return (
    <form
      action={cancelGenerationAction}
      onSubmit={(e) => {
        if (!window.confirm("Are you sure you want to cancel generation? This action cannot be undone.")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="courseId" value={courseId} />
      <button className="button ghost" type="submit">Cancel generation</button>
    </form>
  );
}
