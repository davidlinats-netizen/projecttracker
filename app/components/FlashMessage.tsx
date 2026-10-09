import { errorMessage } from "@/lib/utils";
export function FlashMessage({ success, error }: { success?: string | string[]; error?: string | string[] }) {
  const successText = errorMessage(success);
  const errorText = errorMessage(error);
  if (!successText && !errorText) return null;
  return <div className={"flash " + (errorText ? "flashError" : "flashSuccess")} role={errorText ? "alert" : "status"}>
    <span aria-hidden="true">{errorText ? "!" : "✓"}</span><p>{errorText || successText}</p>
  </div>;
}