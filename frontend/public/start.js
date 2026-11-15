const dl = document.getElementById("profile");

function row(label, value) {
  const dt = document.createElement("dt");
  const dd = document.createElement("dd");
  dt.textContent = label;
  dd.textContent = value;
  dl.append(dt, dd);
}

async function load() {
  const res = await fetch("/api/me");
  if (res.status === 401) return location.assign("/");
  const u = await res.json();
  document.getElementById("greeting").textContent = `Hallo, ${u.first_name}!`;
  const a = u.address;
  row("Name", `${u.first_name} ${u.last_name}`);
  row("E-Mail", u.email);
  row("Adresse", `${a.street} ${a.house_number}, ${a.postal_code} ${a.city}`);
  row("Mobil", u.mobile_phone);
  if (u.birthday) row("Geburtstag", u.birthday.split("-").reverse().join("."));
}

document.getElementById("logout").addEventListener("click", async () => {
  await fetch("/api/logout", { method: "POST" }).catch(() => {});
  location.assign("/");
});

load();
