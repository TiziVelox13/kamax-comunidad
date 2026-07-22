---
name: Comunidad KAMAX
description: Sistema "EL CUADERNO" — la libreta del vendedor pasada en limpio. Papel frío de marca, birome azul, renglones de ledger, sellos de goma. Escala táctil "VEREDA" (body ≥17px, botones ≥52px) para sol directo y multi-edad. El rojo Kamax arde solo donde importa - avisos, racha, VENTA.

# Fuente de verdad de tokens: src/styles.css (@theme). Este archivo es el export portable.
colors:
  # Papel y tinta
  paper: "oklch(98.4% 0.004 250)"        # #F8FAFC — fondo (frío, de marca; NO cream)
  paper-deep: "oklch(96.2% 0.007 250)"
  surface: "oklch(100% 0 0)"
  ink: "oklch(17.8% 0.032 260)"          # #0A1424 — texto principal
  ink-soft: "oklch(43% 0.022 255)"       # #46505F — texto secundario (7:1 sobre paper)
  line: "oklch(91.5% 0.009 252)"         # #E1E6EE — renglones
  dots: "oklch(82.5% 0.016 252)"         # #B9C4D6 — leader dots del ledger

  # Birome y marca
  birome: "oklch(36% 0.128 262)"         # #0E3580 — color de acción/identidad
  birome-deep: "oklch(29.5% 0.11 263)"   # #0A2660
  birome-bright: "oklch(46% 0.155 262)"  # #1455C4 — focus rings
  rojo: "oklch(46.5% 0.19 28)"           # #C20309 — urgencia/acción crítica
  rojo-vivo: "oklch(56% 0.235 28)"       # #EC0606 — SOLO sellos de celebración
  wa: "oklch(50% 0.125 158)"             # #0F7A42 — acciones de WhatsApp

typography:
  body: "Saira 400-700 · 17px mínimo · line-height 1.45"
  display: "Saira Extra Condensed 600/700 · uppercase · usado para títulos y números de ledger"
  ledger-num: "Saira Extra Condensed 700 · 30-38px"

patterns:
  ledger-row: "fila etiqueta ..... valor con leader dots punteados (2px dotted)"
  recorte: "aviso importante = recorte pegado en el cuaderno (borde 2px dashed rojo)"
  sello: "celebración = sello de goma rotado -5° con textura de tinta (mask SVG noise)"
  titulo-seccion: "Saira EC 21px uppercase birome con renglón inferior"
  indice-row: "navegación = índice del cuaderno (fila 54px con flecha birome)"

interaction:
  touch-target: "≥52px acciones primarias, ≥44px secundarias"
  motion: "ease-out-quint únicamente, sin bounce; prefers-reduced-motion respetado"
  focus: "outline 3px birome-bright"

rules:
  - "Contraste texto ≥4.5:1 SIEMPRE (uso a pleno sol en pantallas baratas)"
  - "El rojo se reserva: aviso pendiente, racha, sello VENTA. Nunca decorativo."
  - "Cards solo cuando son la mejor affordance; jamás anidadas"
  - "Sin gradientes, sin glassmorphism, sin eyebrows, sin hero-metrics"
  - "Dark mode BOXES 23:40 (ink #0A1424, panels #101F3C) reservado para v2"
---

# DESIGN.md — Comunidad KAMAX

Sistema **EL CUADERNO**: la app es la libreta del vendedor pasada en limpio.
Los datos se anotan en renglones con puntitos (ledger), los avisos son recortes
pegados con borde rojo, las ventas se estampan con sello de goma. La metáfora
viene de la libreta de fiado — cultura argentina pura, legible para cualquier edad.

Base: dirección "1c EL CUADERNO" de la exploración en Claude Design (22/07/2026),
con la escala táctil de "1a VEREDA". Identidad heredada de kamax-web (Saira +
rojo #EC0606 + ink #0A1424). Doctrina de diseño: impeccable v3.9.1, register product.
