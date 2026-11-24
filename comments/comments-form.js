import { loadCommentsMovie } from "./comments-movie.js";

const comments = document.querySelector("#comments");
const stage = document.querySelector("#comments-stage");
const pageStatus = document.querySelector("#comments-status");
const testingHosts = ["localhost", "127.0.0.1", "[::1]", "shawnsfolkart.dev", "shawnsfolkart.studio"];
const isProduction = location.hostname === "shawnsfolkart.com";

if (isProduction || testingHosts.includes(location.hostname)) {
  const { dataset } = comments;
  const formspreeEndpoint = isProduction ? dataset.productionFormspreeEndpoint : dataset.formspreeEndpoint;
  const recaptchaSiteKey = isProduction ? dataset.productionRecaptchaSiteKey : dataset.recaptchaSiteKey;
  setupCommentsForm(formspreeEndpoint, recaptchaSiteKey).catch(() => {
    pageStatus.textContent = "The comments form could not load. Please reload the page and try again.";
  });
} else {
  stage.append(document.querySelector("#legacy-comments-movie").content.cloneNode(true));
}

async function setupCommentsForm(formspreeEndpoint, recaptchaSiteKey) {
  const dialog = document.querySelector("#comments-verification");
  const backdrop = document.querySelector("#comments-backdrop");
  const captcha = document.querySelector("#comments-captcha");
  const feedback = document.querySelector("#verification-status");
  const cancel = document.querySelector("#verification-cancel");
  const emailInput = document.createElement("input");
  emailInput.type = "email";
  emailInput.required = true;

  let pending;
  let sending = false;
  let captchaLoader;
  let widget;

  const player = await loadCommentsMovie(stage, receiveComments);
  cancel.addEventListener("click", closeVerification);
  dialog.addEventListener("keydown", event => {
    if (event.key === "Escape") closeVerification();
  });
  dialog.addEventListener("cancel", event => {
    event.preventDefault();
    closeVerification();
  });

  async function receiveComments(rawName, rawEmail, rawMessage) {
    if (dialog.open) return;
    const name = String(rawName ?? "").trim();
    const email = String(rawEmail ?? "").trim();
    const message = String(rawMessage ?? "").trim();
    emailInput.value = email;
    const validEmail = emailInput.validity.valid &&
      emailInput.value === email &&
      /@[^@\s]+\.[^@\s]+$/.test(email);
    if (!name || !message || !validEmail) {
      pageStatus.textContent = "Enter your name, a valid email address, and a message before submitting.";
      return;
    }
    if (!recaptchaSiteKey || !/^https:\/\/formspree\.io\/f\/[a-z0-9]+$/i.test(formspreeEndpoint)) {
      pageStatus.textContent = "Comments are temporarily unavailable.";
      return;
    }
    if (typeof player.showCommentsThankYou !== "function") {
      pageStatus.textContent = "The comments form could not connect. Please reload the page and try again.";
      return;
    }

    const submission = { name, email, message };
    pending = submission;
    pageStatus.textContent = "";
    feedback.textContent = "Loading verification…";
    backdrop.hidden = false;
    // Google appends its image challenge to the page body. Keep that iframe
    // outside the inert stage and above this dialog's regular stacking layer.
    comments.inert = true;
    dialog.show();
    cancel.focus();

    try {
      const api = await loadRecaptcha();
      if (pending !== submission) return;
      feedback.textContent = "";
      if (widget === undefined) {
        widget = api.render(captcha, {
          sitekey: recaptchaSiteKey,
          size: "compact",
          callback: submitVerifiedComments,
          "expired-callback": () => showVerificationIssue("Verification expired. Please try again."),
          "error-callback": () => showVerificationIssue("Verification could not finish. Cancel and submit again."),
        });
      } else {
        api.reset(widget);
      }
    } catch {
      if (pending === submission) feedback.textContent = "Verification could not load. Cancel and try again.";
    }
  }

  function loadRecaptcha() {
    if (!captchaLoader) {
      captchaLoader = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        window.onCommentsRecaptchaReady = () => {
          delete window.onCommentsRecaptchaReady;
          resolve(window.grecaptcha);
        };
        script.onerror = () => {
          script.remove();
          delete window.onCommentsRecaptchaReady;
          captchaLoader = undefined;
          reject(new Error("Could not load reCAPTCHA."));
        };
        script.src = "https://www.google.com/recaptcha/api.js?onload=onCommentsRecaptchaReady&render=explicit";
        document.head.append(script);
      });
    }
    return captchaLoader;
  }

  function showVerificationIssue(message) {
    if (dialog.open && !sending) feedback.textContent = message;
  }

  function closeVerification() {
    if (sending) return;
    pending = undefined;
    dialog.close();
    backdrop.hidden = true;
    comments.inert = false;
    if (widget !== undefined) window.grecaptcha.reset(widget);
    player.focus();
  }

  async function submitVerifiedComments(token) {
    if (!pending || sending || !token) return;
    sending = true;
    cancel.disabled = true;
    feedback.textContent = "Sending your message…";
    let accepted = false;

    try {
      const response = await fetch(formspreeEndpoint, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new URLSearchParams({ ...pending, "g-recaptcha-response": token }),
        signal: AbortSignal.timeout(20000),
      });
      const result = await response.json();
      accepted = response.ok && result.ok === true;
      if (!accepted) feedback.textContent = "Formspree did not accept the message. Verify again to retry.";
    } catch {
      feedback.textContent = "We could not confirm whether the message was sent. You can cancel or verify again.";
    } finally {
      sending = false;
      cancel.disabled = false;
    }

    if (accepted) {
      closeVerification();
      try {
        player.showCommentsThankYou();
      } catch {
        pageStatus.textContent = "Thank you. Your message was submitted.";
      }
    } else {
      window.grecaptcha.reset(widget);
    }
  }
}
