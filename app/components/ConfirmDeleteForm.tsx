"use client";
import type { ReactNode } from "react";
import { SubmitButton } from "@/app/components/SubmitButton";
export function ConfirmDeleteForm({ action, id, name, projectName = false, children = "Delete" }: {
  action: (formData: FormData) => void | Promise<void>; id: string; name: string; projectName?: boolean; children?: ReactNode;
}) {
  const subject = projectName ? "project" : "editor";
  return <form action={action} onSubmit={(event) => {
    if (!window.confirm("Delete " + subject + " \"" + name + "\"? This cannot be undone.")) event.preventDefault();
  }}>
    <input type="hidden" name="id" value={id} />
    {projectName ? <input type="hidden" name="project_name" value={name} /> : null}
    <SubmitButton className="button buttonDanger buttonSmall">{children}</SubmitButton>
  </form>;
}