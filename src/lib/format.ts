export const hoyLargo = () =>
  new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long" })
    .format(new Date())
    .replace(/^\w/, (c) => c.toUpperCase());

export const horaCorta = (iso: string) =>
  new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

export const fechaCorta = (iso: string) =>
  new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit" }).format(new Date(iso));

export const iniciales = (nombre: string) =>
  nombre.trim().split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();

/** Link de WhatsApp con texto prellenado. Teléfono argentino → 549… */
export const waLink = (phone: string, text: string) => {
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("0")) d = d.slice(1);
  if (!d.startsWith("54")) d = "549" + d;
  else if (!d.startsWith("549")) d = "549" + d.slice(2);
  return `https://wa.me/${d}?text=${encodeURIComponent(text)}`;
};

export const STAGES: { id: string; label: string; emoji: string }[] = [
  { id: "hablando", label: "Hablando", emoji: "💬" },
  { id: "pidio_precio", label: "Pidió precio", emoji: "💲" },
  { id: "paso_dni", label: "Pasó DNI", emoji: "✅" },
  { id: "en_validacion", label: "En validación", emoji: "⏳" },
  { id: "venta", label: "VENTA", emoji: "🎉" },
  { id: "perdido", label: "No siguió", emoji: "❌" },
];
export const stageInfo = (id: string) => STAGES.find((s) => s.id === id) ?? STAGES[0];

/** Racha: días consecutivos hasta hoy */
export const calcRacha = (days: string[]) => {
  const set = new Set(days);
  let racha = 0;
  const d = new Date();
  for (;;) {
    const key = d.toISOString().slice(0, 10);
    if (set.has(key)) { racha++; d.setDate(d.getDate() - 1); }
    else break;
  }
  return racha;
};
