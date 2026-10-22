export function shouldOpenAddNoteOnEnter(event) {
  if (event.key !== "Enter" || event.isComposing) return false;
  if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return false;
  if (!document.querySelector("#notesPanel")?.classList.contains("is-active")) return false;
  if (document.querySelector("dialog[open]")) return false;
  if (document.body.classList.contains("guide-is-active")) return false;
  if (document.querySelector("#summonOverlay") && !document.querySelector("#summonOverlay").hidden) return false;

  const element = event.target;
  if (!element || typeof element.closest !== "function") return true;
  if (element.closest("#summonOverlay")) return false;
  if (element.closest("#editNoteForm")) return false;
  if (element.isContentEditable) return false;
  return true;
}
