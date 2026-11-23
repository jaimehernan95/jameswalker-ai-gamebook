import type { PdfRevampItem, QrExerciseSpec } from '../types/gamebook.ts';

export const LIVE_RENDER_URL = 'https://jameswalker-ai-gamebook.onrender.com';
export const GUMROAD_STORE_URL = 'https://jameswalkerai.gumroad.com';
export const ONLINE_WORK_UNLOCK_CODE = 'ONLINEWORK-2026';

export function normalizeBaseUrl(rawUrl: string): string {
  return rawUrl.trim().replace(/\/+$/, '');
}

export function buildCompanionTargetUrl(baseUrl: string, queryPath: string): string {
  const clean = normalizeBaseUrl(baseUrl);
  if (!clean) return queryPath;
  return `${clean}/${queryPath.replace(/^\/+/, '')}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates a self-contained, print-ready 6-page Companion Workbook HTML file.
 * Open in Chrome/Safari and choose File -> Print -> Save as PDF to produce a crisp
 * Gumroad-ready companion PDF with scannable QR codes and clickable links.
 */
export function buildCompanionWorkbookHtml(
  baseUrl: string,
  qrExercises: QrExerciseSpec[],
  qrImages: Record<string, string>,
  revampChecklist: PdfRevampItem[],
): string {
  const cleanBase = normalizeBaseUrl(baseUrl) || LIVE_RENDER_URL;
  const dispatchUrl = buildCompanionTargetUrl(cleanBase, '?route=dispatch');
  const arenaUrl = buildCompanionTargetUrl(cleanBase, '?route=arena');

  const qrCardsHtml = qrExercises
    .map((item, idx) => {
      const targetUrl = buildCompanionTargetUrl(cleanBase, item.queryPath);
      const qrSrc = qrImages[item.id] ?? '';
      return `
        <div class="qr-card">
          <div class="qr-box">
            ${
              qrSrc
                ? `<img src="${qrSrc}" alt="QR Code for ${escapeHtml(item.title)}" />`
                : `<div class="qr-fallback">QR ${idx + 1}</div>`
            }
          </div>
          <div class="qr-meta">
            <div class="eyebrow">${escapeHtml(item.placementLabel)} · ${escapeHtml(item.pdfPages)}</div>
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.exercisePrompt)}</p>
            <div class="url-line">
              <strong>Direct Link:</strong>
              <a href="${escapeHtml(targetUrl)}">${escapeHtml(targetUrl)}</a>
            </div>
          </div>
        </div>
      `;
    })
    .join('\n');

  const checklistHtml = revampChecklist
    .map(
      (item) => `
      <tr>
        <td class="mono nowrap">${escapeHtml(item.pdfPage)}</td>
        <td><strong>${escapeHtml(item.section)}</strong></td>
        <td>${escapeHtml(item.recommendedUpdate)}</td>
      </tr>
    `,
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AI for Online Work — 2026 Interactive Companion &amp; Living Update Pack</title>
  <style>
    @page {
      size: letter;
      margin: 0.6in 0.65in;
    }
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 24px;
      background: #FAF9F6;
      color: #141413;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.55;
      font-size: 13.5px;
    }
    .print-toolbar {
      max-width: 820px;
      margin: 0 auto 24px;
      padding: 14px 18px;
      background: #141413;
      color: #FAF9F6;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .print-toolbar p {
      margin: 0;
      font-size: 13px;
    }
    .print-toolbar button {
      background: #D94E1F;
      color: #FAF9F6;
      border: none;
      border-radius: 4px;
      padding: 10px 16px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
    }
    .page {
      max-width: 820px;
      margin: 0 auto 28px;
      background: #FFFFFF;
      border: 1px solid #E2E0D8;
      padding: 42px 46px;
      page-break-after: always;
      break-after: page;
    }
    .page:last-of-type {
      page-break-after: auto;
      break-after: auto;
    }
    h1, h2, h3 {
      font-family: Georgia, Cambria, "Times New Roman", serif;
      color: #141413;
      margin-top: 0;
    }
    h1 {
      font-size: 32px;
      line-height: 1.15;
      margin-bottom: 10px;
    }
    h2 {
      font-size: 21px;
      line-height: 1.25;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 1.5px solid #141413;
    }
    h3 {
      font-size: 15px;
      line-height: 1.3;
      margin-bottom: 6px;
    }
    .eyebrow {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 10.5px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #D94E1F;
      margin-bottom: 6px;
    }
    .muted {
      color: #57554F;
    }
    .mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    .nowrap {
      white-space: nowrap;
    }
    .rule {
      border: none;
      border-top: 1px solid #E2E0D8;
      margin: 20px 0;
    }
    .key-box {
      border: 2px solid #141413;
      background: #FAF9F6;
      padding: 20px 24px;
      margin: 22px 0;
    }
    .key-code {
      display: inline-block;
      margin-top: 8px;
      padding: 6px 14px;
      background: #141413;
      color: #FAF9F6;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 18px;
      font-weight: 700;
      letter-spacing: 0.12em;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 14px 0 18px;
      font-size: 12.5px;
    }
    th, td {
      border: 1px solid #E2E0D8;
      padding: 9px 10px;
      text-align: left;
      vertical-align: top;
    }
    th {
      background: #FAF9F6;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 10.5px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #57554F;
    }
    .callout {
      border-left: 3.5px solid #D94E1F;
      background: #FAF9F6;
      padding: 12px 16px;
      margin: 16px 0;
      font-size: 13px;
    }
    .qr-card {
      display: flex;
      gap: 18px;
      align-items: flex-start;
      border: 1px solid #E2E0D8;
      padding: 14px 16px;
      margin-bottom: 14px;
      background: #FFFFFF;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .qr-box {
      width: 108px;
      height: 108px;
      border: 1.5px solid #141413;
      padding: 4px;
      background: #FFFFFF;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .qr-box img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    }
    .qr-meta {
      flex: 1;
      min-width: 0;
    }
    .qr-meta p {
      margin: 0 0 8px;
      font-size: 12.5px;
      color: #33322F;
    }
    .url-line {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 10.5px;
      word-break: break-all;
      color: #57554F;
    }
    .url-line a {
      color: #D94E1F;
      text-decoration: underline;
    }
    .footer-note {
      margin-top: 22px;
      padding-top: 10px;
      border-top: 1px solid #E2E0D8;
      display: flex;
      justify-content: space-between;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 10px;
      color: #57554F;
    }
    .two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin: 16px 0;
    }
    .card {
      border: 1px solid #E2E0D8;
      padding: 14px 16px;
      background: #FAF9F6;
    }
    @media print {
      body {
        background: #FFFFFF;
        padding: 0;
      }
      .print-toolbar {
        display: none !important;
      }
      .page {
        border: none;
        margin: 0;
        padding: 0;
        max-width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="print-toolbar">
    <p><strong>Gumroad PDF Export Ready:</strong> Click Print / Save as PDF, enable <em>Background graphics</em>, and attach the resulting PDF alongside your book on Gumroad.</p>
    <button type="button" onclick="window.print()">Print / Save as PDF</button>
  </div>

  <!-- PAGE 1: COVER INSERT & READER UNLOCK KEY -->
  <section class="page">
    <div class="eyebrow">James Walker AI · 2026 Interactive Companion Pack</div>
    <h1>AI for Online Work:<br />2026 Interactive Companion &amp; Living Update Pack</h1>
    <p class="muted" style="font-size: 15px; margin-bottom: 18px;">
      A practical interactive workbook, live RCTS prompt practice lab, updated 2026 tool &amp; platform policy tables, and scannable QR exercises for <em>AI for Online Work: A Beginner's Roadmap to Practical Digital Skills</em>.
    </p>

    <hr class="rule" />

    <div class="key-box">
      <div class="eyebrow">Included With Your Gumroad Purchase</div>
      <h3 style="font-size: 18px; margin-bottom: 6px;">Unlock Your Full Interactive Game-Book &amp; Free Living Updates</h3>
      <p style="margin: 0 0 8px;">
        AI tools change every month—your book shouldn't go stale. Open the free companion web app on your phone or computer to practice the book's frameworks in live AI-graded simulations and read updated tool tables anytime.
      </p>
      <div style="margin: 10px 0;">
        <div><strong>Companion Web App:</strong> <a href="${escapeHtml(cleanBase)}" style="color: #D94E1F;">${escapeHtml(cleanBase)}</a></div>
        <div><strong>Reader Unlock Code (Unlocks All Interactive Chapters):</strong></div>
        <div class="key-code">${ONLINE_WORK_UNLOCK_CODE}</div>
      </div>
      <p class="muted" style="font-size: 12px; margin: 8px 0 0;">
        How to activate: Visit the companion site → click <strong>Unlock Book</strong> in the top bar → enter <strong>${ONLINE_WORK_UNLOCK_CODE}</strong>.
      </p>
    </div>

    <div class="two-col">
      <div class="card">
        <div class="eyebrow">What Is Inside This Companion</div>
        <ul style="margin: 6px 0 0; padding-left: 18px; font-size: 12.5px;">
          <li><strong>2026 Evergreen Tool Stack</strong> (replaces Pages 11 &amp; 52)</li>
          <li><strong>2026 Platform Policy Update</strong> (replaces Page 53)</li>
          <li><strong>5 Scannable QR Interactive Drills</strong> (Pages 19, 22, 42, 46, 64)</li>
          <li><strong>Free Living AI Dispatch</strong> (weekly/monthly tool updates)</li>
        </ul>
      </div>
      <div class="card">
        <div class="eyebrow">Recommended 30-Day Study Loop</div>
        <ol style="margin: 6px 0 0; padding-left: 18px; font-size: 12.5px;">
          <li>Read Chapters 1–3, then scan <strong>Drill 01</strong> to lock 1 path.</li>
          <li>Read Chapters 4–6, then test your offer in <strong>Drill 02</strong>.</li>
          <li>Read Chapters 9–14, then pitch in <strong>Drill 03</strong>.</li>
          <li>Practice real prompts anytime in the <strong>Live RCTS Arena</strong>.</li>
        </ol>
      </div>
    </div>

    <div class="footer-note">
      <span>James Walker AI · Interactive Companion Pack</span>
      <span>${escapeHtml(GUMROAD_STORE_URL)}</span>
      <span>Page 1</span>
    </div>
  </section>

  <!-- PAGE 2: DROP-IN REPLACEMENT FOR PAGES 11 & 52 -->
  <section class="page">
    <div class="eyebrow">Drop-In Replacement for Main PDF Pages 11 &amp; 52</div>
    <h2>2026 Evergreen AI Tools &amp; Free-Tier Reference Stack</h2>
    <p class="muted">
      Instead of relying on specific model version numbers that change every quarter, organize your beginner workflow around these four evergreen tool categories. Every category has a reliable $0 starting tier.
    </p>

    <table>
      <thead>
        <tr>
          <th style="width: 22%;">Workflow Category</th>
          <th style="width: 33%;">Recommended 2026 Free-Tier Tools</th>
          <th style="width: 45%;">Best Beginner Use Case (Online Work)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Multimodal Reasoning &amp; Writing</strong></td>
          <td>Google Gemini (AI Studio / App), ChatGPT Free, Claude Free</td>
          <td>Outlining guides, applying the RCTS prompt framework, polishing freelance proposals, and auditing product copy.</td>
        </tr>
        <tr>
          <td><strong>Source-Grounded Research</strong></td>
          <td>NotebookLM, Perplexity Free</td>
          <td>Uploading your own notes or PDFs to draft accurate study guides, fact-checking niche claims, and researching buyer questions without hallucinations.</td>
        </tr>
        <tr>
          <td><strong>Design, Covers &amp; Visual Assets</strong></td>
          <td>Canva Free, Google Imagen / Gemini Image Tools, Figma Free</td>
          <td>Designing Gumroad covers, Pinterest pins, lead-magnet checklists, and clean PDF workbook layouts.</td>
        </tr>
        <tr>
          <td><strong>Light Automation &amp; Publishing</strong></td>
          <td>Make.com Free, n8n Community, Gumroad, MailerLite / Brevo Free</td>
          <td>Connecting landing pages to welcome emails, delivering digital products automatically, and handling global VAT via a Merchant of Record.</td>
        </tr>
      </tbody>
    </table>

    <div class="callout">
      <strong>Never-Stale Rule:</strong> Before paying for any $20/month AI subscription, earn your first $50–$100 using free tiers. For the latest monthly changes to free quotas and tools, open the Living Dispatch at
      <a href="${escapeHtml(dispatchUrl)}" style="color: #D94E1F;">${escapeHtml(dispatchUrl)}</a>.
    </div>

    <h3 style="margin-top: 18px;">Quick Refresher: The RCTS Prompt Formula (Practice Live Online)</h3>
    <p style="margin-bottom: 8px;">
      Whenever an AI draft feels generic, check all four letters before hitting send:
    </p>
    <ul style="margin: 0; padding-left: 20px; font-size: 13px;">
      <li><strong>R — Role:</strong> Who the AI should think like (e.g., <em>"Act as a conversion editor for beginner Gumroad creators"</em>).</li>
      <li><strong>C — Context:</strong> Exact audience, price point, and problem (e.g., <em>"$12 checklist for new remote virtual assistants"</em>).</li>
      <li><strong>T — Task:</strong> One concrete deliverable (e.g., <em>"Write a 5-bullet product description and 3 objections with answers"</em>).</li>
      <li><strong>S — Style &amp; Constraints:</strong> Tone, word limit, and banned clichés (e.g., <em>"Under 180 words, plain English, zero hype"</em>).</li>
    </ul>
    <p style="margin-top: 10px; font-size: 12.5px;">
      Practice RCTS live with instant 0–100 rubric grading at: <a href="${escapeHtml(arenaUrl)}" style="color: #D94E1F;">${escapeHtml(arenaUrl)}</a>
    </p>

    <div class="footer-note">
      <span>Replaces PDF Pages 11 &amp; 52</span>
      <span>${escapeHtml(cleanBase)}</span>
      <span>Page 2</span>
    </div>
  </section>

  <!-- PAGE 3: DROP-IN REPLACEMENT FOR PAGE 53 -->
  <section class="page">
    <div class="eyebrow">Drop-In Replacement for Main PDF Page 53</div>
    <h2>2026 Platform Policy &amp; Disclosure Quick-Reference</h2>
    <p class="muted">
      Platform rules around AI-assisted publishing and global digital taxes tightened across 2025–2026. Keep this compliance checklist handy before publishing or selling online.
    </p>

    <table>
      <thead>
        <tr>
          <th style="width: 20%;">Platform</th>
          <th style="width: 45%;">2026 Policy Standard</th>
          <th style="width: 35%;">Safe Beginner Action</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Amazon KDP</strong></td>
          <td>Distinguishes between <em>AI-generated</em> (text/images created by AI) and <em>AI-assisted</em> (brainstorming/editing your own writing). Disclosure is mandatory for AI-generated content.</td>
          <td>Always edit heavily, add personal examples, verify every fact, and answer KDP's upload disclosure honestly.</td>
        </tr>
        <tr>
          <td><strong>Gumroad &amp; Lemon Squeezy</strong></td>
          <td>Act as Merchant of Record (MoR)—handling EU/UK VAT and US state sales tax automatically on digital downloads.</td>
          <td>Sell original value-added templates, guides, and bundles; include a real companion experience so buyers get lasting value.</td>
        </tr>
        <tr>
          <td><strong>Medium Partner Program</strong></td>
          <td>Fully AI-generated stories are ineligible for Partner Program paywall earnings and distribution boosts.</td>
          <td>Use AI strictly for research outlines and proofreading; publish human-written experience, case studies, and tutorials.</td>
        </tr>
        <tr>
          <td><strong>YouTube &amp; Pinterest</strong></td>
          <td>YouTube requires the Altered/Synthetic Content disclosure toggle for realistic AI voice/video; Pinterest favors original, helpful pin visuals over spam batches.</td>
          <td>Check the disclosure box when using synthetic narration, and focus on 3–5 high-value evergreen pins per week instead of mass spam.</td>
        </tr>
        <tr>
          <td><strong>Upwork &amp; Fiverr</strong></td>
          <td>Clients hire you for verified outcomes, accuracy, and reliable turnaround—not raw copy-pasted AI output.</td>
          <td>Lead every proposal with the client's specific problem and a clear human quality-check step.</td>
        </tr>
      </tbody>
    </table>

    <div class="callout">
      <strong>Live Policy Alerts:</strong> Whenever KDP, Gumroad, Medium, or freelance marketplaces update their AI rules, we post a 2-minute summary in the free Living AI Dispatch at
      <a href="${escapeHtml(dispatchUrl)}" style="color: #D94E1F;">${escapeHtml(dispatchUrl)}</a>.
    </div>

    <div class="footer-note">
      <span>Replaces PDF Page 53</span>
      <span>${escapeHtml(cleanBase)}</span>
      <span>Page 3</span>
    </div>
  </section>

  <!-- PAGE 4: INTERACTIVE QR EXERCISES (PART 1 & 2) -->
  <section class="page">
    <div class="eyebrow">Interactive Exercises · Scan on Phone or Click on Desktop</div>
    <h2>5 Scannable QR Drills Linked to the Book</h2>
    <p class="muted" style="margin-bottom: 16px;">
      Point your phone camera at any QR code below (or click the link directly if you are reading on a tablet or laptop) to launch the matching interactive simulation.
    </p>

    ${qrCardsHtml}

    <div class="footer-note">
      <span>Reader Key: ${ONLINE_WORK_UNLOCK_CODE}</span>
      <span>${escapeHtml(cleanBase)}</span>
      <span>Page 4</span>
    </div>
  </section>

  <!-- PAGE 5: EDITORIAL MODERNIZATION SUMMARY & BACK COVER REPLACEMENT -->
  <section class="page">
    <div class="eyebrow">Drop-In Replacement for PDF Page 64 · About the Author &amp; Next Steps</div>
    <h2>Keep Learning With James Walker AI</h2>
    <p>
      Thank you for reading <strong>AI for Online Work: A Beginner's Roadmap to Practical Digital Skills</strong>.
      Because AI tools evolve every month, your purchase includes ongoing access to the free interactive companion website and the Living AI Dispatch.
    </p>

    <div class="two-col">
      <div class="card">
        <div class="eyebrow">1. Free Living AI Dispatch</div>
        <h3>Monthly Tool &amp; Policy Updates</h3>
        <p style="font-size: 12.5px; margin: 0 0 8px;">
          Get concise updates whenever free AI tiers change, new beginner-friendly workflows launch, or new interactive drills go live—zero spam.
        </p>
        <p class="mono" style="font-size: 11px; margin: 0;">
          <a href="${escapeHtml(dispatchUrl)}" style="color: #D94E1F;">${escapeHtml(dispatchUrl)}</a>
        </p>
      </div>
      <div class="card">
        <div class="eyebrow">2. Full Gumroad Library</div>
        <h3>More Practical AI Playbooks</h3>
        <p style="font-size: 12.5px; margin: 0 0 8px;">
          Explore companion guides on prompt engineering, solo digital product launches, and AI productivity systems on the official Gumroad storefront.
        </p>
        <p class="mono" style="font-size: 11px; margin: 0;">
          <a href="${escapeHtml(GUMROAD_STORE_URL)}" style="color: #D94E1F;">${escapeHtml(GUMROAD_STORE_URL)}</a>
        </p>
      </div>
    </div>

    <hr class="rule" />

    <div class="eyebrow">Author Production Notes (Remove Before Sending to Buyers if Merging Into Main PDF)</div>
    <h3 style="font-size: 16px; margin-bottom: 8px;">6-Point Modernization Map for the 64-Page Source File</h3>
    <table>
      <thead>
        <tr>
          <th style="width: 16%;">PDF Page</th>
          <th style="width: 28%;">Section</th>
          <th style="width: 56%;">2026 Update Action</th>
        </tr>
      </thead>
      <tbody>
        ${checklistHtml}
      </tbody>
    </table>

    <div class="footer-note">
      <span>James Walker AI · Official Gumroad Companion</span>
      <span>${escapeHtml(GUMROAD_STORE_URL)}</span>
      <span>Page 5</span>
    </div>
  </section>
</body>
</html>`;
}

/**
 * Generates ready-to-paste Gumroad v2 product copy, receipt email, and existing-buyer
 * broadcast announcement so James can launch immediately using the 2-file bundle method.
 */
export function buildGumroadLaunchKitMarkdown(
  baseUrl: string,
  qrExercises: QrExerciseSpec[],
  revampChecklist: PdfRevampItem[],
): string {
  const cleanBase = normalizeBaseUrl(baseUrl) || LIVE_RENDER_URL;
  const dispatchUrl = buildCompanionTargetUrl(cleanBase, '?route=dispatch');
  const arenaUrl = buildCompanionTargetUrl(cleanBase, '?route=arena');

  const qrLines = qrExercises
    .map((item) => {
      const target = buildCompanionTargetUrl(cleanBase, item.queryPath);
      return [
        `### ${item.title}`,
        `- **PDF Placement:** ${item.placementLabel} (${item.pdfPages})`,
        `- **Exercise Prompt:** ${item.exercisePrompt}`,
        `- **Live Link / QR Target:** ${target}`,
        `- **SVG Asset:** \`${item.id}-qr.svg\``,
        '',
      ].join('\n');
    })
    .join('\n');

  const checklistLines = revampChecklist
    .map((item) => `- **${item.pdfPage} (${item.section}):** ${item.recommendedUpdate}`)
    .join('\n');

  return `# Gumroad v2 Launch Kit — AI for Online Work (2026 Interactive Edition)

- **Live Companion Website:** ${cleanBase}
- **Living AI Dispatch & Free Newsletter:** ${dispatchUrl}
- **Live RCTS Prompt Practice Arena:** ${arenaUrl}
- **Author Gumroad Storefront:** ${GUMROAD_STORE_URL}
- **Buyer Unlock Key:** \`${ONLINE_WORK_UNLOCK_CODE}\`

---

## Fastest Way to Launch Today (2-File Gumroad Bundle Strategy)

You do **not** need to re-typeset all 64 pages before relaunching! Gumroad lets you attach multiple PDFs to one product:

1. Download **Print-Ready Companion Pack (.html)** from the QR Kit tab.
2. Open it in Chrome or Safari → press **Cmd+P** (Mac) or **Ctrl+P** (Windows) → **Save as PDF** (check *Background graphics*) → save as \`AI_for_Online_Work_2026_Interactive_Companion.pdf\`.
3. In your Gumroad product editor, upload **both files**:
   - File 1: \`AI_for_Online_Work_-_A_Beginners_Roadmap_to_Practical_Digital_Skills.pdf\` (main 64-page book)
   - File 2: \`AI_for_Online_Work_2026_Interactive_Companion.pdf\` (the new 2026 update tables, 5 scannable QR interactive exercises, and reader key \`${ONLINE_WORK_UNLOCK_CODE}\`)
4. Update the Gumroad product title, description, and receipt message using the ready-to-paste copy below.

---

## Ready-to-Paste Gumroad Product Title

**AI for Online Work (2026 Interactive Edition): A Beginner's Roadmap to Practical Digital Skills + Live AI Practice Hub**

---

## Ready-to-Paste Gumroad Product Description

Most AI eBooks go out of date in 90 days—and leave beginners stuck in passive reading mode.

**AI for Online Work (2026 Interactive Edition)** pairs the complete 64-page beginner roadmap with a **free Interactive Companion Web App & Living Update Hub** so you actually practice every skill as you read—and never fall behind when AI tools change.

### What You Get Inside This Bundle
1. **The Complete 64-Page PDF Roadmap** — Clear, hype-free paths for Digital Products (Gumroad/KDP), Freelancing, Content Creation, and Productivity Systems using free AI tiers.
2. **NEW: 2026 Interactive Companion PDF** — Updated 2026 Evergreen Tool Stack, 2026 Platform Policy Quick-Reference (KDP, Gumroad, Medium, YouTube, Upwork), and **5 scannable QR interactive exercises**.
3. **Full Access Key (\`${ONLINE_WORK_UNLOCK_CODE}\`) to the Interactive Game-Book Web App:**
   - **Drill 01:** Escape the Tutorial Trap & Lock Your 30-Day Path
   - **Drill 02:** Build & Stress-Test Your First Digital Product Using the RCTS Framework
   - **Drill 03:** Client-First Freelance Pitch & Organic Traffic Simulation (AI-Graded)
   - **Live RCTS Prompt Sandbox:** Customize prompts and receive instant 0–100 rubric feedback
4. **Free Living AI Dispatch:** Monthly updates on free AI tool tiers and platform policy changes so your handbook stays current all year.

### Who This Is For
- Beginners overwhelmed by endless AI tool hype who want one focused 30-day roadmap
- Aspiring solo creators launching their first Gumroad guide, KDP book, or freelance offer
- Anyone who wants hands-on prompt practice instead of another static PDF collecting dust

---

## Ready-to-Paste Gumroad Receipt / Welcome Email

**Subject:** Your Copy + Interactive Game-Book Key for *AI for Online Work (2026 Edition)*

Thanks for picking up **AI for Online Work (2026 Interactive Edition)**!

Inside your download you'll find both the **64-page main handbook** and your **2026 Interactive Companion PDF** with scannable QR exercises.

**Activate Your Interactive Companion Hub (Free With Purchase):**
1. Open: ${cleanBase}
2. Click **Unlock Book** in the top bar
3. Enter your buyer key: **\`${ONLINE_WORK_UNLOCK_CODE}\`**

Want monthly 2026 AI tool updates and new practice drills? Subscribe free on the Living Dispatch tab: ${dispatchUrl}

— James Walker AI
${GUMROAD_STORE_URL}

---

## Ready-to-Paste Gumroad Post (Free Upgrade Announcement to Existing Buyers)

**Title:** Free 2026 Interactive Upgrade Added to *AI for Online Work*!

Hi everyone,

Because AI tools and platform rules move fast, I just added a **free 2026 Interactive Companion Pack** to your *AI for Online Work* library—no extra cost.

**What's new:**
- Updated **2026 Evergreen AI Tool Stack** & **Platform Policy Guide** (KDP, Gumroad, Medium, YouTube, Upwork)
- **5 Scannable QR Interactive Drills** where you can practice the RCTS prompt framework and client pitches live online
- Your full reader access key: **\`${ONLINE_WORK_UNLOCK_CODE}\`** at ${cleanBase}

You can download the new companion PDF directly from your Gumroad library right now—or jump straight into the live web companion here: ${cleanBase}

Thanks for reading!
— James Walker AI

---

## 5 Embedded QR Exercise Targets

${qrLines}

## 6-Point Modernization Map (When Editing the 64-Page Source File)

${checklistLines}
`;
}
