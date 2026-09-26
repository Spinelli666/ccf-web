// Monta um PDF de verdade (texto selecionável, não uma imagem/print da tela) com o
// estado atual da ficha — espelha os cálculos derivados usados em StatsPanel/EquipmentPanel.
import { jsPDF } from "jspdf";
import { computeDerived, equippedArmorSum, equippedArmorPericiaBonus, getPericiaBonuses, orderPericias, num, clamp } from "@/lib/derived";
import type { FullSheetData } from "@/lib/sheet-types";

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 42;
const CONTENT_W = PAGE_W - MARGIN * 2;
const GOLD: [number, number, number] = [200, 140, 40];
const INK: [number, number, number] = [40, 32, 22];
const INK_SOFT: [number, number, number] = [95, 82, 62];

// As fontes padrão do jsPDF (WinAnsi/CP1252) cobrem acentos e pontuação tipográfica
// (—, ·, •) mas não emoji — sem isso, ícones do texto de habilidades/custo viravam
// caracteres quebrados no PDF em vez de sumirem ou virarem texto legível.
function sanitizeForPdf(text: string): string {
  return String(text ?? "")
    .replace(/🔸/g, "PA ")
    .replace(/⚡/g, " PE")
    .replace(/🪙/g, " moedas")
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, "")
    .replace(/[\u{2600}-\u{27BF}]/gu, "")
    .replace(/[\u{2B00}-\u{2BFF}]/gu, "")
    .replace(/[\u{FE0F}\u{200D}]/gu, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function buildSheetPdf(sheet: FullSheetData, ownerName: string): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  let y = MARGIN;

  function ensureSpace(h: number) {
    if (y + h > PAGE_H - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  }

  function heading(text: string) {
    ensureSpace(30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...INK);
    doc.text(sanitizeForPdf(text).toUpperCase(), MARGIN, y);
    y += 8;
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(1);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 16;
  }

  // Sub-título dentro de uma seção (ex: "Armas" / "Armaduras" dentro de "Equipamento") —
  // evita que uma lista longa quebre de página sem nenhuma indicação do que é.
  function subheading(text: string) {
    ensureSpace(28);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...INK_SOFT);
    doc.text(sanitizeForPdf(text).toUpperCase(), MARGIN, y);
    y += 14;
  }

  function keyValueRow(pairs: [string, string][]) {
    const colW = CONTENT_W / pairs.length;
    ensureSpace(30);
    pairs.forEach(([label, value], i) => {
      const x = MARGIN + i * colW;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...INK_SOFT);
      doc.text(sanitizeForPdf(label).toUpperCase(), x, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(...INK);
      doc.text(sanitizeForPdf(value), x, y + 13);
    });
    y += 30;
  }

  function paragraph(text: string, opts: { size?: number; bold?: boolean; indent?: number; color?: [number, number, number] } = {}) {
    const size = opts.size ?? 10;
    const indent = opts.indent ?? 0;
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...(opts.color ?? INK));
    const lines: string[] = doc.splitTextToSize(sanitizeForPdf(text) || "—", CONTENT_W - indent);
    for (const l of lines) {
      ensureSpace(size + 3);
      doc.text(l, MARGIN + indent, y);
      y += size + 3;
    }
  }

  function spacer(h = 8) {
    y += h;
  }

  // --- Cabeçalho ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...INK);
  doc.text(sanitizeForPdf(sheet.name) || "Personagem", MARGIN, y);
  y += 20;
  const subtitulo = [
    ownerName && `Jogador: ${ownerName}`,
    sheet.racaTitulo && `Raça: ${sheet.racaTitulo}`,
    sheet.classeTitulo && `Classe: ${sheet.classeTitulo}`,
    `Nível ${sheet.nivel}`,
  ]
    .filter(Boolean)
    .join("   ·   ");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...INK_SOFT);
  doc.text(sanitizeForPdf(subtitulo), MARGIN, y);
  y += 26;

  // --- Recursos ---
  heading("Recursos");
  const derived = computeDerived(sheet);
  const pvBonusTemp = Math.max(0, num(sheet.pvBonusTemp, 0));
  const peBonusTemp = Math.max(0, num(sheet.peBonusTemp, 0));
  const pvMaxTotal = derived.pvMax + pvBonusTemp;
  const peMaxTotal = derived.peMax + peBonusTemp;
  const pvAtual = clamp(num(sheet.stats.pvAtual), -derived.pvMax, pvMaxTotal);
  const peAtual = clamp(num(sheet.stats.peAtual), 0, peMaxTotal);
  const armaduraBonus = num(sheet.armaduraBonusManual, 0);
  const armaduraMaximo = derived.armaduraNatural + equippedArmorSum(sheet.armaduras) + armaduraBonus;
  const armaduraAtual =
    sheet.armaduraAtual === null || sheet.armaduraAtual === undefined
      ? armaduraMaximo
      : clamp(num(sheet.armaduraAtual), 0, armaduraMaximo);

  keyValueRow([
    ["PV", `${pvAtual} / ${pvMaxTotal}`],
    ["PE", `${peAtual} / ${peMaxTotal}`],
    ["Armadura", `${armaduraAtual} / ${armaduraMaximo}`],
  ]);
  keyValueRow([
    ["Deslocamento", `${derived.deslocamento}m`],
    ["Acerto Crítico", `${derived.critRange}+`],
    ["XP", `${clamp(num(sheet.xp, 0), 0, 100)} / 100`],
    ["Fraturas", `${clamp(num(sheet.fraturas), 0, 5)} / 5`],
  ]);
  keyValueRow([
    ["Sanidade", `${clamp(num(sheet.insania), 0, 5)} / 5`],
    ["Toxidade", `${clamp(num(sheet.toxidade), 0, 5)} / 5`],
    ["Fome", `${clamp(num(sheet.fome), 0, 3)} / 3`],
    ["Sede", `${clamp(num(sheet.sede), 0, 3)} / 3`],
  ]);
  spacer(4);

  // --- Perícias --- (mesma ordem fixa usada em PericiasPanel, pra ficar consistente com a UI)
  heading("Perícias");
  const periciasOrdenadas = orderPericias(sheet.pericias);
  const half = Math.ceil(periciasOrdenadas.length / 2);
  const colL = periciasOrdenadas.slice(0, half);
  const colR = periciasOrdenadas.slice(half);
  const rowH = 15;
  ensureSpace(rowH * Math.max(colL.length, colR.length));
  const yPericias = y;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  function periciaLine(p: (typeof periciasOrdenadas)[number]) {
    const bonusTxt = num(p.bonus) ? ` (+${p.bonus})` : "";
    const equipBonus = equippedArmorPericiaBonus(sheet.armaduras, p.nome);
    const equipTxt = equipBonus ? ` +${equipBonus} equip.` : "";
    return `${p.nome}: ${p.valor}${bonusTxt}${equipTxt}`;
  }
  colL.forEach((p, i) => {
    doc.text(sanitizeForPdf(periciaLine(p)), MARGIN, yPericias + i * rowH);
  });
  colR.forEach((p, i) => {
    doc.text(sanitizeForPdf(periciaLine(p)), MARGIN + CONTENT_W / 2, yPericias + i * rowH);
  });
  y = yPericias + Math.max(colL.length, colR.length) * rowH + 10;

  // --- Efeitos ---
  heading("Efeitos");
  paragraph(sheet.efeitosAtivos.length ? sheet.efeitosAtivos.join(", ") : "Nenhum efeito ativo.");
  spacer(6);

  // --- Habilidades de Raça ---
  if (sheet.racaTitulo) {
    heading(`Habilidades de Raça — ${sheet.racaTitulo}`);
    sheet.racaHabilidades.forEach((h) => {
      paragraph(h.nome, { bold: true, size: 10.5 });
      paragraph(h.desc, { indent: 10, color: INK_SOFT });
      spacer(4);
    });
  }

  // --- Habilidades de Classe ---
  if (sheet.classeTitulo) {
    heading(`Habilidades de Classe — ${sheet.classeTitulo}`);
    sheet.classeHabilidades.forEach((h) => {
      const prefixo = h.indent ? "↳ " : "";
      const meta = [h.tipo, h.custo].filter((x) => x && x !== "—").join(" · ");
      paragraph(`${prefixo}${h.nome}${meta ? ` (${meta})` : ""}`, { bold: true, size: 10.5, indent: h.indent ? 10 : 0 });
      paragraph(h.efeito, { indent: h.indent ? 20 : 10, color: INK_SOFT });
      spacer(4);
    });
  }

  // Bônus extras de uma Armadura (inventário/deslocamento/PE/perícia) num texto só, pra
  // exibir junto do item — mesmos campos mostrados no detalhe do EquipmentPanel.
  function armaduraExtras(a: FullSheetData["armaduras"][number]): string {
    const extras: string[] = [];
    if (num(a.inventarioBonus, 0) > 0) extras.push(`+${num(a.inventarioBonus, 0)} Espaços de Inventário`);
    if (num(a.deslocamentoBonus, 0) > 0) extras.push(`+${num(a.deslocamentoBonus, 0)} Deslocamento`);
    if (num(a.pvBonus, 0) > 0) extras.push(`+${num(a.pvBonus, 0)} PV`);
    if (num(a.peBonus, 0) > 0) extras.push(`+${num(a.peBonus, 0)} PE`);
    getPericiaBonuses(a).forEach((b) => {
      if (num(b.valor, 0) > 0) extras.push(`+${num(b.valor, 0)} ${b.pericia}`);
    });
    return extras.length ? ` · ${extras.join(" · ")}` : "";
  }

  // --- Equipamento ---
  heading("Equipamento");
  const armasEquipadas = sheet.armas.filter((a) => a.item && a.equipado);
  const armadurasEquipadas = sheet.armaduras.filter((a) => a.item && a.equipado);
  if (armasEquipadas.length === 0 && armadurasEquipadas.length === 0) {
    paragraph("Nada equipado.");
  } else {
    if (armasEquipadas.length) {
      subheading("Armas");
      armasEquipadas.forEach((a) => {
        const protecaoTxt = num(a.protecao, 0) > 0 ? ` · +${num(a.protecao, 0)} Armadura quando equipada` : "";
        paragraph(
          `${a.item} — Dano ${a.dano}${a.propriedades && a.propriedades !== "—" ? ` · ${a.propriedades}` : ""}${protecaoTxt} · Durab. ${a.durabilidadeAtual}/${a.durabilidadeMax}`
        );
      });
      spacer(4);
    }
    if (armadurasEquipadas.length) {
      subheading("Armaduras");
      armadurasEquipadas.forEach((a) => {
        paragraph(
          `${a.item} (${a.parte}) — Armadura ${a.armadura}${armaduraExtras(a)} · Durab. ${a.durabilidadeAtual}/${a.durabilidadeMax}`
        );
      });
    }
  }
  spacer(6);

  // --- Inventário ---
  heading("Inventário");
  const armasInv = sheet.armas.filter((a) => a.item && !a.equipado);
  const armadurasInv = sheet.armaduras.filter((a) => a.item && !a.equipado);
  const remedios = sheet.remedios.filter((r) => r.item);
  if (armasInv.length === 0 && armadurasInv.length === 0 && remedios.length === 0) {
    paragraph("Inventário vazio.");
  } else {
    if (armasInv.length) {
      subheading("Armas");
      armasInv.forEach((a) => paragraph(`• ${a.item} — Dano ${a.dano}`));
      spacer(4);
    }
    if (armadurasInv.length) {
      subheading("Armaduras");
      armadurasInv.forEach((a) => paragraph(`• ${a.item} (${a.parte}) — Armadura ${a.armadura}${armaduraExtras(a)}`));
      spacer(4);
    }
    if (remedios.length) {
      subheading("Itens");
      remedios.forEach((r) => paragraph(`• ${r.item}${r.efeito ? ` — ${r.efeito}` : ""}`));
    }
  }
  spacer(6);

  // --- Biografia ---
  heading("Biografia");
  paragraph(sheet.biografia || "Sem biografia cadastrada.");

  // --- Rodapé (número de página) ---
  const totalPaginas = doc.getNumberOfPages();
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...INK_SOFT);
    doc.text(`Página ${i} de ${totalPaginas}`, PAGE_W - MARGIN, PAGE_H - 20, { align: "right" });
  }

  return doc;
}
