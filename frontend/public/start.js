const dl = document.getElementById("profile");
const form = document.getElementById("absence-form");
const list = document.getElementById("absences");
const empty = document.getElementById("empty");
const message = document.getElementById("form-message");
const togglePast = document.getElementById("toggle-past");

let absences = [];
let editingId = null;
let showPast = false;

// ---------- Hilfsfunktionen ----------
const fmtDate = (iso) => iso.split("-").reverse().join(".");
const todayIso = () => {
  const t = new Date();
  return new Date(t.getTime() - t.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  node.append(...children.filter((c) => c != null));
  return node;
}

async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { "content-type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    location.assign("/");
    throw new Error("Nicht angemeldet");
  }
  const data = res.status === 204 ? null : await res.json().catch(() => ({}));
  return { res, data };
}

// ---------- Profil ----------
function row(label, value) {
  dl.append(el("dt", {}, label), el("dd", {}, value));
}

async function loadProfile() {
  const { data: u } = await api("GET", "/api/me");
  document.getElementById("greeting").textContent = `Hallo, ${u.first_name}!`;
  const a = u.address;
  row("Name", `${u.first_name} ${u.last_name}`);
  row("E-Mail", u.email);
  row("Adresse", `${a.street} ${a.house_number}, ${a.postal_code} ${a.city}`);
  row("Mobil", u.mobile_phone);
  if (u.birthday) row("Geburtstag", fmtDate(u.birthday));
}

// ---------- Liste ----------
function statusText(a) {
  const today = todayIso();
  if (a.status === "aktuell") {
    const left = daysBetween(today, a.end_date);
    return left === 0 ? "Läuft – heute letzter Tag" : `Läuft – noch ${left + 1} Tage`;
  }
  if (a.status === "vorbei") return "Vorbei";
  const until = daysBetween(today, a.start_date);
  return until === 1 ? "Beginnt morgen" : `Beginnt in ${until} Tagen`;
}

function render() {
  list.replaceChildren();
  empty.hidden = absences.length > 0;
  for (const a of absences) {
    const days = daysBetween(a.start_date, a.end_date) + 1;
    const range = a.start_date === a.end_date
      ? fmtDate(a.start_date)
      : `${fmtDate(a.start_date)} – ${fmtDate(a.end_date)}`;
    const c = a.emergency_contact;
    list.append(el("li", { class: `absence ${a.status}` },
      el("div", { class: "absence-head" },
        el("strong", {}, range),
        el("span", { class: `badge ${a.status}` }, statusText(a)),
      ),
      el("div", { class: "absence-meta" }, `${days} ${days === 1 ? "Tag" : "Tage"}`, a.location ? ` · ${a.location}` : null),
      c ? el("div", {}, "Notfallkontakt: ", el("a", { href: `tel:${c.phone}` }, `${c.name}, ${c.phone}`)) : null,
      a.note ? el("div", { class: "absence-note" }, a.note) : null,
      a.status === "vorbei" ? null : el("div", { class: "absence-actions" },
        el("button", { type: "button", class: "link", onclick: () => openForm(a) }, "Bearbeiten"),
        el("button", { type: "button", class: "link danger", onclick: () => remove(a) }, "Löschen"),
      ),
    ));
  }
}

async function loadAbsences() {
  const { data } = await api("GET", `/api/absences${showPast ? "?include_past=true" : ""}`);
  absences = data;
  render();
}

// ---------- Formular ----------
function showErrors(errors = {}) {
  form.querySelectorAll(".error").forEach((e) => (e.textContent = ""));
  form.querySelectorAll("[aria-invalid]").forEach((e) => e.removeAttribute("aria-invalid"));
  const inputFor = { "emergency_contact.name": "contact_name", "emergency_contact.phone": "contact_phone" };
  for (const [field, msg] of Object.entries(errors)) {
    const slot = form.querySelector(`.error[data-for="${field}"]`);
    if (slot) slot.textContent = msg;
    else setMessage(msg, "error");
    form.elements[inputFor[field] ?? field]?.setAttribute("aria-invalid", "true");
  }
}

function setMessage(text, type) {
  message.textContent = text;
  message.className = text ? `msg ${type}` : "";
}

function openForm(a = null) {
  editingId = a?.id ?? null;
  form.reset();
  showErrors();
  setMessage("", "");
  document.getElementById("form-title").textContent = a ? "Abwesenheit bearbeiten" : "Neue Abwesenheit";
  const today = todayIso();
  form.start_date.min = a?.status === "aktuell" ? a.start_date : today;
  form.end_date.min = today;
  if (a) {
    form.start_date.value = a.start_date;
    form.end_date.value = a.end_date;
    form.location.value = a.location ?? "";
    form.contact_name.value = a.emergency_contact?.name ?? "";
    form.contact_phone.value = a.emergency_contact?.phone ?? "";
    form.note.value = a.note ?? "";
  } else {
    // Notfallkontakt der letzten Abwesenheit vorschlagen
    const last = [...absences].reverse().find((x) => x.emergency_contact);
    if (last) {
      form.contact_name.value = last.emergency_contact.name;
      form.contact_phone.value = last.emergency_contact.phone;
    }
  }
  form.hidden = false;
  form.start_date.focus();
  form.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function closeForm() {
  form.hidden = true;
  editingId = null;
}

// "Bis" darf nicht vor "Von" liegen – Mindestdatum mitziehen
form.start_date.addEventListener("change", () => {
  const start = form.start_date.value;
  if (start) {
    form.end_date.min = start > todayIso() ? start : todayIso();
    if (!form.end_date.value || form.end_date.value < start) form.end_date.value = start;
  }
});

function collect() {
  const v = (n) => form.elements[n].value.trim();
  return {
    start_date: v("start_date"),
    end_date: v("end_date"),
    location: v("location") || null,
    emergency_contact: v("contact_name") || v("contact_phone")
      ? { name: v("contact_name"), phone: v("contact_phone") }
      : null,
    note: v("note") || null,
  };
}

function clientValidate(d) {
  const errors = {};
  if (!d.start_date) errors.start_date = "Bitte Beginn wählen";
  if (!d.end_date) errors.end_date = "Bitte Ende wählen";
  if (d.start_date && d.end_date && d.end_date < d.start_date) errors.end_date = "Das Ende darf nicht vor dem Beginn liegen";
  if (d.emergency_contact && !d.emergency_contact.name) errors["emergency_contact.name"] = "Bitte Namen angeben";
  if (d.emergency_contact && !d.emergency_contact.phone) errors["emergency_contact.phone"] = "Bitte Telefonnummer angeben";
  return errors;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  setMessage("", "");
  const data = collect();
  const errors = clientValidate(data);
  showErrors(errors);
  if (Object.keys(errors).length) return;

  const button = form.querySelector("button[type=submit]");
  button.disabled = true;
  try {
    const { res, data: body } = editingId
      ? await api("PUT", `/api/absences/${editingId}`, data)
      : await api("POST", "/api/absences", data);
    if (res.ok) {
      closeForm();
      await loadAbsences();
    } else if (body?.errors) {
      showErrors(body.errors);
      if (!message.textContent) setMessage("Bitte prüfe die markierten Felder.", "error");
    } else {
      setMessage(body?.detail ?? "Speichern fehlgeschlagen", "error");
    }
  } catch {
    setMessage("Keine Verbindung zum Server.", "error");
  } finally {
    button.disabled = false;
  }
});

async function remove(a) {
  const range = `${fmtDate(a.start_date)} – ${fmtDate(a.end_date)}`;
  if (!confirm(`Abwesenheit ${range} wirklich löschen?`)) return;
  await api("DELETE", `/api/absences/${a.id}`);
  if (editingId === a.id) closeForm();
  await loadAbsences();
}

document.getElementById("new-absence").addEventListener("click", () => openForm());
document.getElementById("cancel").addEventListener("click", closeForm);
togglePast.addEventListener("click", (e) => {
  e.preventDefault();
  showPast = !showPast;
  togglePast.textContent = showPast ? "Vergangene ausblenden" : "Vergangene anzeigen";
  loadAbsences();
});

document.getElementById("logout").addEventListener("click", async () => {
  await fetch("/api/logout", { method: "POST" }).catch(() => {});
  location.assign("/");
});

loadProfile();
loadAbsences();
