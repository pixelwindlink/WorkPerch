import { setButtonKeyboardLabel } from "./keyboard.js";

let pending = null;

function confirmElements() {
  return {
    dialog: document.querySelector("#confirmDialog"),
    form: document.querySelector("#confirmDialogForm"),
    title: document.querySelector("#confirmDialogTitle"),
    message: document.querySelector("#confirmDialogMessage"),
    confirmButton: document.querySelector("#confirmDialogConfirm"),
    cancelButton: document.querySelector("#confirmDialogCancel"),
  };
}

function settle(result) {
  const current = pending;
  pending = null;
  current?.resolve(result);
}

export function bindConfirmDialog() {
  const { dialog, form } = confirmElements();
  if (!dialog || dialog.dataset.bound === "true") return;
  dialog.dataset.bound = "true";
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const confirmed = event.submitter?.value === "confirm";
    dialog.close(confirmed ? "confirm" : "cancel");
  });
  dialog.addEventListener("close", () => {
    if (!pending) return;
    settle(dialog.returnValue === "confirm");
  });
}

export function requestConfirm({
  title = "确认操作",
  message = "",
  confirmLabel = "确认",
  cancelLabel = "取消",
  danger = false,
} = {}) {
  bindConfirmDialog();
  const { dialog, title: titleEl, message: messageEl, confirmButton, cancelButton } = confirmElements();
  if (!dialog) return Promise.resolve(false);
  if (pending) settle(false);

  titleEl.textContent = title;
  messageEl.textContent = message;
  setButtonKeyboardLabel(confirmButton, confirmLabel, "Enter");
  setButtonKeyboardLabel(cancelButton, cancelLabel, "Esc");
  confirmButton.classList.toggle("danger-confirm", Boolean(danger));
  dialog.returnValue = "";

  return new Promise((resolve) => {
    pending = { resolve };
    if (!dialog.open) dialog.showModal();
    setTimeout(() => confirmButton.focus(), 0);
  });
}
