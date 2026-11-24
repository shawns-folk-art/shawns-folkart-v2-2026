import { loadCommentsMovie } from "./comments-movie.js";
const status = document.querySelector("#status");
const dialog = document.querySelector("#result-dialog");
const fields = document.querySelector("#received-fields");

async function run() {
  if (!["localhost", "127.0.0.1", "[::1]"].includes(location.hostname)) {
    throw new Error("Open this simulation through a local web server.");
  }

  const player = await loadCommentsMovie(document.querySelector("#stage"), (name, email, message) => {
    if (dialog.open) return;
    fields.textContent = JSON.stringify({ name, email, message }, null, 2);
    dialog.returnValue = "cancel";
    dialog.showModal();
  });
  player.style.width = "760px";
  player.style.height = "420px";

  dialog.addEventListener("close", () => {
    fields.textContent = "";
    if (dialog.returnValue === "accept") {
      if (typeof player.showCommentsThankYou !== "function") {
        status.textContent = "The page received the fields, but Ruffle did not expose the thank-you callback.";
        return;
      }
      player.showCommentsThankYou();
      status.textContent = "Acceptance simulated. Check the Flash stage for its thank-you message.";
      return;
    }
    status.textContent = "No submission. Check that the Flash fields are still editable.";
    player.focus();
  });

  status.textContent = "Ready for dummy values.";
}

run().catch(error => {
  status.textContent = error.message;
});
