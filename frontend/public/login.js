const form = document.getElementById("login-form");
const message = document.getElementById("form-message");

function setMessage(text, type) {
  message.textContent = text;
  message.className = text ? `msg ${type}` : "";
}

function setFieldError(name, text) {
  form.querySelector(`.error[data-for="${name}"]`).textContent = text;
  form[name].toggleAttribute("aria-invalid", Boolean(text));
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  setMessage("", "");
  const email = form.email.value.trim();
  const password = form.password.value;
  setFieldError("email", email ? "" : "Bitte E-Mail-Adresse eingeben");
  setFieldError("password", password ? "" : "Bitte Passwort eingeben");
  if (!email || !password) return;

  const button = form.querySelector("button");
  button.disabled = true;
  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password, remember: form.remember.checked }),
    });
    if (res.ok) {
      location.assign("/start");
      return;
    }
    const body = await res.json().catch(() => ({}));
    setMessage(body.detail ?? "Anmeldung fehlgeschlagen", "error");
    form.password.value = "";
    form.password.focus();
  } catch {
    setMessage("Keine Verbindung zum Server.", "error");
  } finally {
    button.disabled = false;
  }
});
