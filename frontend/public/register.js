const form = document.getElementById("register-form");
const message = document.getElementById("form-message");

function showErrors(errors) {
  form.querySelectorAll(".error").forEach((el) => (el.textContent = ""));
  form.querySelectorAll("input").forEach((el) => el.removeAttribute("aria-invalid"));
  for (const [field, msg] of Object.entries(errors)) {
    const el = form.querySelector(`.error[data-for="${field}"]`);
    const input = form.querySelector(`[name="${field}"]`);
    if (el) el.textContent = msg;
    if (input) input.setAttribute("aria-invalid", "true");
  }
}

function setMessage(text, type) {
  message.textContent = text;
  message.className = text ? `msg ${type}` : "";
}

function collect() {
  const fd = new FormData(form);
  const v = (k) => (fd.get(k) ?? "").toString().trim();
  return {
    first_name: v("first_name"),
    last_name: v("last_name"),
    email: v("email"),
    password: fd.get("password"),
    mobile_phone: v("mobile_phone"),
    birthday: v("birthday") || null,
    address: {
      street: v("address.street"),
      house_number: v("address.house_number"),
      postal_code: v("address.postal_code"),
      city: v("address.city"),
    },
  };
}

function clientValidate(data) {
  const errors = {};
  const req = {
    first_name: data.first_name, last_name: data.last_name, email: data.email,
    mobile_phone: data.mobile_phone, "address.street": data.address.street,
    "address.house_number": data.address.house_number,
    "address.postal_code": data.address.postal_code, "address.city": data.address.city,
  };
  for (const [k, val] of Object.entries(req)) if (!val) errors[k] = "Pflichtfeld";
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = "Ungültige E-Mail-Adresse";
  if (data.address.postal_code && !/^\d{5}$/.test(data.address.postal_code))
    errors["address.postal_code"] = "5 Ziffern";
  if (!data.password || data.password.length < 8) errors.password = "Mindestens 8 Zeichen";
  if (data.password !== form.password_confirm.value) errors.password_confirm = "Passwörter stimmen nicht überein";
  return errors;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  setMessage("", "");
  const data = collect();
  const errors = clientValidate(data);
  showErrors(errors);
  if (Object.keys(errors).length) return;

  const button = form.querySelector("button");
  button.disabled = true;
  try {
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    });
    const body = await res.json().catch(() => ({}));
    if (res.status === 201) {
      setMessage(`Willkommen, ${body.first_name}! Dein Konto wurde erstellt.`, "success");
      setTimeout(() => location.assign("/start"), 1200);
    } else if (res.status === 422 && body.errors) {
      showErrors(body.errors);
      setMessage("Bitte prüfe die markierten Felder.", "error");
    } else if (res.status === 409) {
      showErrors({ email: body.detail });
      setMessage(body.detail, "error");
    } else {
      setMessage(body.detail ?? "Unbekannter Fehler", "error");
    }
  } catch {
    setMessage("Keine Verbindung zum Server.", "error");
  } finally {
    button.disabled = false;
  }
});
