import { jsPDF } from 'jspdf';
import type { PdfRevampItem, QrExerciseSpec } from '../types/gamebook.ts';
import {
  buildCompanionTargetUrl,
  GUMROAD_STORE_URL,
  LIVE_RENDER_URL,
  normalizeBaseUrl,
  ONLINE_WORK_UNLOCK_CODE,
} from './pdfCompanionExport.ts';

const INK: [number, number, number] = [20, 20, 19];
const MUTED: [number, number, number] = [87, 85, 79];
const VERMILION: [number, number, number] = [217, 78, 31];
const PAPER_TINT: [number, number, number] = [250, 249, 246];
const RULE: [number, number, number] = [226, 224, 216];
const WHITE: [number, number, number] = [255, 255, 255];

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function drawPageFooter(doc: jsPDF, leftLabel: string, centerUrl: string, pageNum: number): void {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const y = pageH - 34;

  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.75);
  doc.line(48, y - 10, pageW - 48, y - 10);

  doc.setFont('courier', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(leftLabel, 48, y);
  doc.text(centerUrl, pageW / 2, y, { align: 'center' });
  doc.text(`Page ${pageNum}`, pageW - 48, y, { align: 'right' });
}

function drawSectionHeader(doc: jsPDF, eyebrow: string, title: string, startY = 54): number {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFont('courier', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...VERMILION);
  doc.text(eyebrow.toUpperCase(), 48, startY);

  doc.setFont('times', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...INK);
  const lines = doc.splitTextToSize(title, pageW - 96) as string[];
  doc.text(lines, 48, startY + 20);

  const afterTitleY = startY + 20 + (lines.length - 1) * 23 + 10;
  doc.setDrawColor(...INK);
  doc.setLineWidth(1.2);
  doc.line(48, afterTitleY, pageW - 48, afterTitleY);
  return afterTitleY + 18;
}

/**
 * Generates the real, upload-ready 5-page Gumroad Companion PDF with embedded
 * scannable QR codes and clickable links pointing to the live Render site.
 */
export function generateCompanionPdfBlob(
  baseUrl: string,
  qrExercises: QrExerciseSpec[],
  qrImages: Record<string, string>,
): Blob {
  const cleanBase = normalizeBaseUrl(baseUrl) || LIVE_RENDER_URL;
  const dispatchUrl = buildCompanionTargetUrl(cleanBase, '?route=dispatch');
  const arenaUrl = buildCompanionTargetUrl(cleanBase, '?route=arena');

  const doc = new jsPDF({ unit: 'pt', format: 'letter', compress: true });
  const pageW = doc.internal.pageSize.getWidth();
  const contentW = pageW - 96;

  // =========================================================================
  // PAGE 1: COVER INSERT & READER UNLOCK KEY
  // =========================================================================
  doc.setFont('courier', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...VERMILION);
  doc.text('JAMES WALKER AI  ·  2026 INTERACTIVE COMPANION PACK', 48, 64);

  doc.setFont('times', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(...INK);
  doc.text('AI for Online Work:', 48, 102);
  doc.text('2026 Interactive Companion', 48, 134);
  doc.text('& Living Update Pack', 48, 166);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11.5);
  doc.setTextColor(...MUTED);
  const coverSub = doc.splitTextToSize(
    'Your interactive practice workbook, live RCTS prompt grading lab, updated 2026 AI tool & platform policy tables, and 5 scannable QR exercises for "AI for Online Work: A Beginner\'s Roadmap to Practical Digital Skills."',
    contentW,
  ) as string[];
  doc.text(coverSub, 48, 194);

  // Unlock Key Box
  const boxY = 256;
  const boxH = 164;
  doc.setFillColor(...PAPER_TINT);
  doc.setDrawColor(...INK);
  doc.setLineWidth(1.5);
  doc.rect(48, boxY, contentW, boxH, 'FD');

  doc.setFont('courier', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...VERMILION);
  doc.text('INCLUDED WITH YOUR GUMROAD PURCHASE', 68, boxY + 24);

  doc.setFont('times', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...INK);
  doc.text('Unlock Your Full Interactive Game-Book & Living Updates', 68, boxY + 46);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(...INK);
  doc.text('1. Open the free companion web app on your phone or computer:', 68, boxY + 70);

  doc.setFont('courier', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...VERMILION);
  doc.textWithLink(cleanBase, 82, boxY + 88, { url: cleanBase });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(...INK);
  doc.text('2. Click "Unlock Book" in the top bar and enter your buyer code:', 68, boxY + 110);

  // Code badge
  doc.setFillColor(...INK);
  doc.rect(82, boxY + 120, 168, 28, 'F');
  doc.setFont('courier', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...WHITE);
  doc.text(ONLINE_WORK_UNLOCK_CODE, 166, boxY + 139, { align: 'center' });

  // Two-column summary cards
  const colY = 446;
  const colW = (contentW - 18) / 2;
  const colH = 192;

  doc.setFillColor(...PAPER_TINT);
  doc.setDrawColor(...RULE);
  doc.setLineWidth(1);
  doc.rect(48, colY, colW, colH, 'FD');
  doc.rect(48 + colW + 18, colY, colW, colH, 'FD');

  doc.setFont('courier', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...VERMILION);
  doc.text('WHAT IS INSIDE THIS PACK', 64, colY + 24);
  doc.text('30-DAY STUDY LOOP', 64 + colW + 18, colY + 24);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  const leftBullets = [
    '• 2026 Evergreen Free-Tier AI Tool Stack (updates Pages 11 & 52)',
    '• 2026 Platform Policy & Disclosure Guide (updates Page 53)',
    '• 5 Scannable QR Interactive Drills (clickable on desktop too)',
    '• Free Living AI Dispatch (monthly tool & policy updates)',
  ];
  let ly = colY + 46;
  for (const item of leftBullets) {
    const wrapped = doc.splitTextToSize(item, colW - 32) as string[];
    doc.text(wrapped, 64, ly);
    ly += wrapped.length * 14 + 8;
  }

  const rightBullets = [
    '1. Read Ch. 1–3, then scan Drill 01 to commit to 1 beginner path.',
    '2. Read Ch. 4–6, then test your product pitch in Drill 02.',
    '3. Read Ch. 9–14, then practice a client hook in Drill 03.',
    '4. Use the Live RCTS Arena anytime for 0–100 prompt scoring.',
  ];
  let ry = colY + 46;
  for (const item of rightBullets) {
    const wrapped = doc.splitTextToSize(item, colW - 32) as string[];
    doc.text(wrapped, 64 + colW + 18, ry);
    ry += wrapped.length * 14 + 8;
  }

  drawPageFooter(doc, 'James Walker AI · Interactive Companion', GUMROAD_STORE_URL, 1);

  // =========================================================================
  // PAGE 2: 2026 EVERGREEN TOOL STACK (REPLACES PAGES 11 & 52)
  // =========================================================================
  doc.addPage();
  let y = drawSectionHeader(
    doc,
    'Drop-In Update for Main Book Pages 11 & 52',
    '2026 Evergreen AI Tools & Free-Tier Reference Stack',
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(...MUTED);
  const p2Intro = doc.splitTextToSize(
    'Model version numbers change every quarter. Instead of memorizing dated tool names, build your workflow around these four evergreen categories—every one has a reliable $0 starting tier.',
    contentW,
  ) as string[];
  doc.text(p2Intro, 48, y);
  y += p2Intro.length * 14 + 14;

  const toolRows = [
    {
      cat: 'Multimodal Reasoning & Writing',
      tools: 'Google Gemini (Free / AI Studio), ChatGPT Free, Claude Free',
      use: 'Outlining guides, applying the RCTS prompt framework, refining freelance proposals, and auditing Gumroad copy.',
    },
    {
      cat: 'Source-Grounded Research',
      tools: 'NotebookLM, Perplexity Free',
      use: 'Uploading your own notes/PDFs for accurate study guides, fact-checking claims, and researching buyer questions.',
    },
    {
      cat: 'Design, Covers & Visuals',
      tools: 'Canva Free, Gemini Image Tools, Figma Free',
      use: 'Designing Gumroad book covers, Pinterest pins, checklists, and clean PDF workbook layouts.',
    },
    {
      cat: 'Light Automation & Publishing',
      tools: 'Make.com Free, n8n, Gumroad, MailerLite / Brevo Free',
      use: 'Delivering digital downloads automatically, handling global VAT via Merchant of Record, and sending welcome emails.',
    },
  ];

  // Table header
  doc.setFillColor(...PAPER_TINT);
  doc.setDrawColor(...RULE);
  doc.rect(48, y, contentW, 24, 'FD');
  doc.setFont('courier', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  doc.text('CATEGORY', 56, y + 15);
  doc.text('2026 FREE-TIER TOOLS', 184, y + 15);
  doc.text('BEST BEGINNER USE CASE', 346, y + 15);
  y += 24;

  for (const row of toolRows) {
    const cLines = doc.splitTextToSize(row.cat, 118) as string[];
    const tLines = doc.splitTextToSize(row.tools, 152) as string[];
    const uLines = doc.splitTextToSize(row.use, contentW - 310) as string[];
    const maxLines = Math.max(cLines.length, tLines.length, uLines.length);
    const rowH = maxLines * 13 + 16;

    doc.setDrawColor(...RULE);
    doc.rect(48, y, contentW, rowH, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...INK);
    doc.text(cLines, 56, y + 15);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...INK);
    doc.text(tLines, 184, y + 15);
    doc.setTextColor(...MUTED);
    doc.text(uLines, 346, y + 15);

    y += rowH;
  }

  y += 18;
  // Never-stale callout
  doc.setFillColor(...PAPER_TINT);
  doc.setDrawColor(...VERMILION);
  doc.setLineWidth(2.5);
  doc.rect(48, y, contentW, 56, 'F');
  doc.line(48, y, 48, y + 56);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  doc.text('Never-Stale Rule:', 62, y + 19);
  doc.setFont('helvetica', 'normal');
  doc.text(
    'Earn your first $50–$100 using free tiers before paying for subscriptions. Monthly free-tier changes:',
    152,
    y + 19,
  );
  doc.setFont('courier', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...VERMILION);
  doc.textWithLink(dispatchUrl, 62, y + 39, { url: dispatchUrl });

  y += 80;
  doc.setFont('times', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...INK);
  doc.text('Quick Refresher: The RCTS Prompt Formula (Practice Live Online)', 48, y);
  y += 18;

  const rcts = [
    ['R — Role:', 'Tell the AI who to think like (e.g., "Act as a conversion editor for Gumroad creators").'],
    ['C — Context:', 'Specify audience, price point, and real pain point (e.g., "$12 guide for new virtual assistants").'],
    ['T — Task:', 'Ask for one concrete deliverable (e.g., "Write a 5-bullet product description and 3 FAQs").'],
    ['S — Style:', 'Set tone, word limit, and banned hype phrases (e.g., "Under 180 words, plain English").'],
  ];

  doc.setFontSize(10);
  for (const [label, desc] of rcts) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...INK);
    doc.text(label, 56, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED);
    const dLines = doc.splitTextToSize(desc, contentW - 92) as string[];
    doc.text(dLines, 134, y);
    y += dLines.length * 14 + 6;
  }

  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...INK);
  doc.text('Practice RCTS with instant 0–100 AI rubric grading:', 48, y);
  doc.setFont('courier', 'bold');
  doc.setTextColor(...VERMILION);
  doc.textWithLink(arenaUrl, 48, y + 15, { url: arenaUrl });

  drawPageFooter(doc, 'Replaces Main Book Pages 11 & 52', cleanBase, 2);

  // =========================================================================
  // PAGE 3: 2026 PLATFORM POLICY UPDATE (REPLACES PAGE 53)
  // =========================================================================
  doc.addPage();
  y = drawSectionHeader(
    doc,
    'Drop-In Update for Main Book Page 53',
    '2026 Platform Policy & Disclosure Quick-Reference',
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(...MUTED);
  const p3Intro = doc.splitTextToSize(
    'Platform policies around AI-assisted publishing and global digital taxes tightened across 2025–2026. Review this compliance summary before publishing digital products, articles, or freelance services.',
    contentW,
  ) as string[];
  doc.text(p3Intro, 48, y);
  y += p3Intro.length * 14 + 14;

  const policyRows = [
    {
      platform: 'Amazon KDP',
      rule: 'Separates AI-generated (text/images made by AI) from AI-assisted (brainstorming/editing your own writing). Mandatory disclosure for AI-generated content.',
      action: 'Edit heavily, add personal examples, verify every claim, and answer the upload disclosure honestly.',
    },
    {
      platform: 'Gumroad & Lemon Squeezy',
      rule: 'Act as Merchant of Record (MoR)—calculating and remitting EU/UK VAT and US state sales tax automatically on digital downloads.',
      action: 'Sell original value-added guides, templates, and companion workbooks that deliver lasting utility.',
    },
    {
      platform: 'Medium Partner Program',
      rule: 'Fully AI-generated stories are ineligible for Partner Program paywall earnings and distribution boosts.',
      action: 'Use AI only for outlines and proofreading; write human tutorials, reflections, and real case studies.',
    },
    {
      platform: 'YouTube & Pinterest',
      rule: 'YouTube requires the Altered/Synthetic Content disclosure toggle for realistic AI voice/video; Pinterest filters mass low-effort spam pins.',
      action: 'Enable synthetic disclosure when applicable and publish 3–5 helpful evergreen pins weekly.',
    },
    {
      platform: 'Upwork & Fiverr',
      rule: 'Clients pay for verified outcomes, accuracy, and reliability—not raw unedited AI output.',
      action: 'Lead every proposal with the client\'s specific bottleneck and include a clear human quality-check step.',
    },
  ];

  doc.setFillColor(...PAPER_TINT);
  doc.setDrawColor(...RULE);
  doc.setLineWidth(1);
  doc.rect(48, y, contentW, 24, 'FD');
  doc.setFont('courier', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  doc.text('PLATFORM', 56, y + 15);
  doc.text('2026 POLICY STANDARD', 158, y + 15);
  doc.text('SAFE BEGINNER ACTION', 376, y + 15);
  y += 24;

  for (const row of policyRows) {
    const pLines = doc.splitTextToSize(row.platform, 94) as string[];
    const rLines = doc.splitTextToSize(row.rule, 208) as string[];
    const aLines = doc.splitTextToSize(row.action, contentW - 340) as string[];
    const maxLines = Math.max(pLines.length, rLines.length, aLines.length);
    const rowH = maxLines * 13 + 16;

    doc.setDrawColor(...RULE);
    doc.rect(48, y, contentW, rowH, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...INK);
    doc.text(pLines, 56, y + 15);

    doc.setFont('helvetica', 'normal');
    doc.text(rLines, 158, y + 15);
    doc.setTextColor(...MUTED);
    doc.text(aLines, 376, y + 15);
    y += rowH;
  }

  y += 22;
  doc.setFillColor(...PAPER_TINT);
  doc.setDrawColor(...VERMILION);
  doc.setLineWidth(2.5);
  doc.rect(48, y, contentW, 54, 'F');
  doc.line(48, y, 48, y + 54);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  doc.text('Live Policy Alerts:', 62, y + 20);
  doc.setFont('helvetica', 'normal');
  doc.text('Read 2-minute policy change alerts anytime on the free Living AI Dispatch:', 158, y + 20);
  doc.setFont('courier', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...VERMILION);
  doc.textWithLink(dispatchUrl, 62, y + 39, { url: dispatchUrl });

  drawPageFooter(doc, 'Replaces Main Book Page 53', cleanBase, 3);

  // =========================================================================
  // PAGE 4: 5 SCANNABLE QR INTERACTIVE DRILLS (DRILLS 1–4) + PAGE 5 (DRILL 5 + BACK COVER)
  // =========================================================================
  doc.addPage();
  y = drawSectionHeader(
    doc,
    'Scan With Your Phone Camera or Click on Desktop',
    'Interactive QR Exercises Linked to the Book',
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text(
    `Unlock Code for Chapters 2 & 3: ${ONLINE_WORK_UNLOCK_CODE}   ·   Every link below is clickable in PDF readers.`,
    48,
    y,
  );
  y += 18;

  const drawQrCard = (item: QrExerciseSpec, cardY: number): number => {
    const targetUrl = buildCompanionTargetUrl(cleanBase, item.queryPath);
    const qrSrc = qrImages[item.id];
    const cardH = 124;

    doc.setFillColor(...WHITE);
    doc.setDrawColor(...RULE);
    doc.setLineWidth(1);
    doc.rect(48, cardY, contentW, cardH, 'FD');

    // QR frame
    const qrSize = 96;
    doc.setDrawColor(...INK);
    doc.setLineWidth(1);
    doc.rect(62, cardY + 14, qrSize, qrSize, 'S');
    if (qrSrc) {
      doc.addImage(qrSrc, 'PNG', 65, cardY + 17, qrSize - 6, qrSize - 6);
    }

    const textX = 174;
    const textW = contentW - 140;

    doc.setFont('courier', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...VERMILION);
    doc.text(`${item.placementLabel.toUpperCase()}`, textX, cardY + 24);

    doc.setFont('times', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...INK);
    const titleLines = doc.splitTextToSize(item.title, textW) as string[];
    doc.text(titleLines, textX, cardY + 41);

    const promptY = cardY + 41 + titleLines.length * 14 + 2;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.2);
    doc.setTextColor(...MUTED);
    const promptLines = doc.splitTextToSize(item.exercisePrompt, textW) as string[];
    doc.text(promptLines.slice(0, 3), textX, promptY);

    doc.setFont('courier', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(...VERMILION);
    doc.textWithLink(targetUrl, textX, cardY + cardH - 14, { url: targetUrl });

    return cardY + cardH + 14;
  };

  const firstPageDrills = qrExercises.slice(0, 4);
  const remainingDrills = qrExercises.slice(4);

  for (const item of firstPageDrills) {
    y = drawQrCard(item, y);
  }
  drawPageFooter(doc, `Reader Unlock Key: ${ONLINE_WORK_UNLOCK_CODE}`, cleanBase, 4);

  // =========================================================================
  // PAGE 5: DRILL 5 + CLEAN PAGE 64 BACK COVER & CATALOG
  // =========================================================================
  doc.addPage();
  y = drawSectionHeader(
    doc,
    'Drop-In Update for Main Book Page 64 · Back Cover & Living Dispatch',
    'Stay Updated & Explore All James Walker AI Books',
  );

  for (const item of remainingDrills) {
    y = drawQrCard(item, y);
  }

  y += 10;
  doc.setFont('times', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...INK);
  doc.text('Thank You for Reading AI for Online Work', 48, y);
  y += 18;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(...MUTED);
  const thanksLines = doc.splitTextToSize(
    'Your purchase includes ongoing access to the free Interactive Game-Book Web App and the Living AI Dispatch so your digital skills stay current as AI platforms evolve.',
    contentW,
  ) as string[];
  doc.text(thanksLines, 48, y);
  y += thanksLines.length * 15 + 18;

  // Back cover two-column promo
  const promoH = 148;
  doc.setFillColor(...PAPER_TINT);
  doc.setDrawColor(...INK);
  doc.setLineWidth(1);
  doc.rect(48, y, colW, promoH, 'FD');
  doc.rect(48 + colW + 18, y, colW, promoH, 'FD');

  doc.setFont('courier', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...VERMILION);
  doc.text('1. FREE LIVING AI DISPATCH', 64, y + 24);
  doc.text('2. FULL GUMROAD LIBRARY', 64 + colW + 18, y + 24);

  doc.setFont('times', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...INK);
  doc.text('Monthly AI Tool Updates', 64, y + 44);
  doc.text('More Practical AI Playbooks', 64 + colW + 18, y + 44);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...MUTED);
  const leftPromo = doc.splitTextToSize(
    'Receive concise updates whenever free AI tiers change, platform rules shift, or new interactive practice drills launch.',
    colW - 32,
  ) as string[];
  doc.text(leftPromo, 64, y + 64);

  const rightPromo = doc.splitTextToSize(
    'Browse companion guides on prompt engineering, solo digital product launches, and AI productivity systems.',
    colW - 32,
  ) as string[];
  doc.text(rightPromo, 64 + colW + 18, y + 64);

  doc.setFont('courier', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...VERMILION);
  doc.textWithLink(dispatchUrl, 64, y + 126, { url: dispatchUrl });
  doc.textWithLink(GUMROAD_STORE_URL, 64 + colW + 18, y + 126, { url: GUMROAD_STORE_URL });

  drawPageFooter(doc, 'James Walker AI · Official Gumroad Companion', GUMROAD_STORE_URL, 5);

  return doc.output('blob');
}

/**
 * Generates a dedicated 2-page Publisher Handover PDF specifically for James,
 * explaining what NOT to rename/change and the exact 5-minute Gumroad upload steps.
 */
export function generatePublisherHandoverPdfBlob(
  baseUrl: string,
  revampChecklist: PdfRevampItem[],
): Blob {
  const cleanBase = normalizeBaseUrl(baseUrl) || LIVE_RENDER_URL;
  const doc = new jsPDF({ unit: 'pt', format: 'letter', compress: true });
  const pageW = doc.internal.pageSize.getWidth();
  const contentW = pageW - 96;

  // PAGE 1: DO NOT CHANGE RULES & 5-MINUTE GUMROAD UPLOAD STEPS
  let y = drawSectionHeader(
    doc,
    'Private Handover Guide for James Walker AI · Do Not Upload This File to Buyers',
    'READ FIRST: How to Publish the 2026 Interactive Edition on Gumroad',
  );

  // Critical DO NOT CHANGE warning box
  doc.setFillColor(...PAPER_TINT);
  doc.setDrawColor(...VERMILION);
  doc.setLineWidth(2);
  doc.rect(48, y, contentW, 186, 'FD');

  doc.setFont('courier', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...VERMILION);
  doc.text('IMPORTANT — DO NOT CHANGE OR RENAME THESE 4 ITEMS', 66, y + 24);

  const rules = [
    [
      '1. DO NOT change the Reader Unlock Code:',
      `${ONLINE_WORK_UNLOCK_CODE} — This exact code unlocks Chapters 2 & 3 on the live companion website.`,
    ],
    [
      '2. DO NOT change the Companion Website URL:',
      `${cleanBase} — All 5 QR codes printed inside the Companion PDF point directly here.`,
    ],
    [
      '3. DO NOT rename the Companion PDF file:',
      'Keep "AI_for_Online_Work_2026_Interactive_Companion.pdf" clean so buyers recognize it beside the main 64-page book.',
    ],
    [
      '4. DO NOT delete your existing Gumroad product link:',
      'Upload the new PDF inside the existing product (2-file bundle) so past buyers keep access and receive your free update email.',
    ],
  ];

  let ry = y + 46;
  for (const [heading, detail] of rules) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...INK);
    doc.text(heading, 66, ry);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.2);
    doc.setTextColor(...MUTED);
    const dLines = doc.splitTextToSize(detail, contentW - 44) as string[];
    doc.text(dLines, 78, ry + 13);
    ry += 13 + dLines.length * 12 + 8;
  }

  y += 206;

  doc.setFont('times', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...INK);
  doc.text('5-Minute Gumroad Launch Steps (2-File Bundle)', 48, y);
  y += 20;

  const steps = [
    'Step 1 — Open your existing "AI for Online Work" product in your Gumroad dashboard (jameswalkerai.gumroad.com).',
    'Step 2 — In the Content / Files tab, keep your original 64-page PDF AND upload "AI_for_Online_Work_2026_Interactive_Companion.pdf" from this Google Drive folder as File #2. (Do NOT upload this READ_FIRST guide.)',
    'Step 3 — Open "GUMROAD_COPY_PASTE_TEXT.txt" in this folder. Copy & paste the updated Product Title and Product Description.',
    `Step 4 — Paste the Buyer Receipt Message (which includes unlock code ${ONLINE_WORK_UNLOCK_CODE} and ${cleanBase}) into Gumroad's Receipt / Content message.`,
    'Step 5 — Click Save Changes, then go to Gumroad Posts and send the included "Free 2026 Upgrade" email to existing buyers.',
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  for (const step of steps) {
    const lines = doc.splitTextToSize(step, contentW - 12) as string[];
    doc.text(lines, 54, y);
    y += lines.length * 14 + 10;
  }

  drawPageFooter(doc, 'Publisher Handover · Internal Only', GUMROAD_STORE_URL, 1);

  // PAGE 2: OPTIONAL 6-POINT CHECKLIST WHEN EDITING THE ORIGINAL 64-PAGE SOURCE FILE
  doc.addPage();
  y = drawSectionHeader(
    doc,
    'Optional Later Edit · When Updating Your 64-Page Source File',
    '6 Pages to Refresh in Canva / Word / InDesign',
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  const p2Text = doc.splitTextToSize(
    'You can launch immediately using the 2-file Gumroad bundle on Page 1. Whenever you also decide to edit the original 64-page manuscript directly, update these 6 spots:',
    contentW,
  ) as string[];
  doc.text(p2Text, 48, y);
  y += p2Text.length * 14 + 14;

  for (const item of revampChecklist) {
    const updateLines = doc.splitTextToSize(item.recommendedUpdate, contentW - 24) as string[];
    const cardH = updateLines.length * 13 + 38;

    doc.setFillColor(...PAPER_TINT);
    doc.setDrawColor(...RULE);
    doc.setLineWidth(1);
    doc.rect(48, y, contentW, cardH, 'FD');

    doc.setFont('courier', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...VERMILION);
    doc.text(`${item.pdfPage.toUpperCase()}  ·  ${item.section.toUpperCase()}`, 60, y + 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...INK);
    doc.text(updateLines, 60, y + 34);

    y += cardH + 10;
  }

  drawPageFooter(doc, 'Publisher Handover · Internal Only', cleanBase, 2);

  return doc.output('blob');
}
