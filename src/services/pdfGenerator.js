const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const invoiceCompanyInfo = require("../config/invoiceCompanyInfo");
const os = require("os");

const GST_RATE_DEFAULT = 18;

const getLogoBase64 = () => {
  try {
    const logoPath = path.join(
      __dirname,
      "../../",
      invoiceCompanyInfo.logoPath,
    );
    if (fs.existsSync(logoPath)) {
      const logoBuffer = fs.readFileSync(logoPath);
      const base64Logo = logoBuffer.toString("base64");
      return `data:image/svg+xml;base64,${base64Logo}`;
    }
    console.warn("Logo file not found at:", logoPath);
    return invoiceCompanyInfo.logoFallbackUrl;
  } catch (error) {
    console.error("Error reading logo:", error);
    return invoiceCompanyInfo.logoFallbackUrl;
  }
};

// ---------- Number to Words (Indian system) ----------
const numberToWords = (num) => {
  if (num === 0) return "Zero";
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];
  if (num < 20) return ones[num];
  if (num < 100)
    return tens[Math.floor(num / 10)] + (num % 10 ? " " + ones[num % 10] : "");
  if (num < 1000)
    return (
      ones[Math.floor(num / 100)] +
      " Hundred" +
      (num % 100 ? " and " + numberToWords(num % 100) : "")
    );
  if (num < 100000)
    return (
      numberToWords(Math.floor(num / 1000)) +
      " Thousand" +
      (num % 1000 ? " " + numberToWords(num % 1000) : "")
    );
  if (num < 10000000)
    return (
      numberToWords(Math.floor(num / 100000)) +
      " Lakh" +
      (num % 100000 ? " " + numberToWords(num % 100000) : "")
    );
  return (
    numberToWords(Math.floor(num / 10000000)) +
    " Crore" +
    (num % 10000000 ? " " + numberToWords(num % 10000000) : "")
  );
};

const amountInWords = (amount) => {
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  let words = numberToWords(rupees) + " Rupees";
  if (paise > 0) words += " and " + numberToWords(paise) + " Paise";
  words += " Only";
  return words;
};

const formatINR = (amount) =>
  new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

// ---------- Terms & Conditions (same as Sales-Billing) ----------
const termsAndConditionsPage1 = [
  {
    title: "Scope of Services",
    points: [
      "Cloudedata shall provide secure, cloud-hosted access to its Accounting ERP solution, including storage and management of the Client's accounting data on its dedicated servers.",
    ],
  },
  {
    title: "Data Responsibility & Security",
    points: [
      "Cloudedata takes full responsibility for uptime, access, and safeguarding of the Client's ERP data. In the event of a cyber-attack or malicious intrusion, Cloudedata shall restore the most recent verified backup to resume operations. Cloudedata shall not be liable beyond the point of the last backup.",
    ],
  },
];

const termsAndConditions = [
  {
    title: "Client Conduct & Liability",
    points: [
      "The Client agrees to maintain responsible, lawful, and respectful usage of the provided services. The Client shall be solely liable for any misconduct, abuse, or inappropriate behavior—whether verbal, written, or digital—by themselves or their authorized users toward Cloudedata's personnel or systems. Cloudedata reserves the right to suspend or terminate services in such cases.",
    ],
  },
  {
    title: "Data Access & Client Control",
    points: [
      "Cloudedata shall have no right to access, view, or alter any of the Client's data stored on the cloud platform or within the designated folders assigned to the Client. The Client shall have full and independent control over their data, including the ability to copy, paste, and delete any files or folders within their allocated space. Cloudedata does not interfere with or modify client data under any circumstances. Accordingly, the entire responsibility for managing the data, including copying, pasting, editing, or deletion, lies solely with the Client or members of the Client",
    ],
  },
  {
    title: "Malicious File Policy",
    points: [
      "Uploading or executing any malicious, harmful, or unauthorized files is strictly prohibited. If such actions result in data loss, damage, or service interruption, the Client shall be fully liable for the total loss, and Cloudedata may recover the full cost of the damage.",
    ],
  },
  {
    title: "Backup Policy",
    points: [
      "Data is backed up at regular intervals (e.g., daily). In the event of data loss, the latest backup will be restored within 6–24 hours.",
    ],
  },
  {
    title: "Server Maintenance & Downtime",
    points: [
      "Cloudedata reserves the right to initiate emergency server maintenance at any time in case of a critical issue. The Client will be given at least one (1) hour's prior notice.",
    ],
  },
  {
    title: "Support Availability",
    points: [
      "Support is available only during working hours (Monday to Saturday, 10:00 AM – 7:30 PM IST). No after-hours, weekend, or holiday support is provided. All support will be provided strictly on a ticket basis. Tickets will be generated via our official support portal or by sending an email to the designated support email address.",
    ],
  },
  {
    title: "No Refund Policy",
    points: [
      "All fees paid to Cloudedata are non-refundable under any circumstances, including but not limited to cancellation, discontinuation, dissatisfaction, or downtime caused by third-party or client-side issues.",
    ],
  },
  {
    title: "Fees & Payment",
    points: [
      "The Client agrees to pay the billing amount as mentioned in the invoice according to the selected Plan and Billing Period.",
    ],
  },
  {
    title: "Term, Renewal & Termination",
    points: [
      "This Agreement shall be automatically renewed with each service renewal unless either party provides 30 days' written notice. Upon termination, data will be made available for export for 2–3 days.",
    ],
  },
  {
    title: "Governing Law & Jurisdiction",
    points: [
      "This Agreement shall be governed by the laws of India, and any disputes shall fall under the exclusive jurisdiction of the courts at New Delhi.",
      "By digitally signing this Agreement, the Client confirms having read, understood, and agreed to all the terms and conditions above.",
    ],
  },
];

// ---------- Generate HTML ----------
const generateHTML = (bill, entity, keys) => {
  const logoUrl = getLogoBase64();
  const companyInfo = invoiceCompanyInfo;

  const baseAmount = parseFloat(bill.amountWithoutGST) || 0;
  const gstRate = bill.gstRate || GST_RATE_DEFAULT;
  const gstAmount =
    bill.gstAmount != null
      ? parseFloat(bill.gstAmount)
      : parseFloat(((baseAmount * gstRate) / 100).toFixed(2));
  const totalAmount =
    bill.totalAmount != null
      ? parseFloat(bill.totalAmount)
      : parseFloat((baseAmount + gstAmount).toFixed(2));

  const hsnCode = companyInfo.hsnCode;
  const purchasedDateStr = new Date(bill.purchasedDate).toLocaleDateString(
    "en-IN",
    { day: "2-digit", month: "short", year: "numeric" },
  );
  const renewalDateStr = new Date(bill.renewalDate).toLocaleDateString(
    "en-IN",
    { day: "2-digit", month: "short", year: "numeric" },
  );

  const MAX_KEYS_SHOWN = 3;
  const visibleKeys = keys.slice(0, MAX_KEYS_SHOWN);
  const remainingKeysCount = keys.length - visibleKeys.length;

  const keyRowsHTML =
    visibleKeys
      .map(
        (k) => `
    <tr>
      <td style="border-left:1px solid #aaa;border-right:1px solid #aaa;padding:3px 6px;"></td>
      <td style="border-right:1px solid #aaa;padding:3px 6px 3px 18px;font-size:10.5px;color:#333;">
        ${k.key} &nbsp;(${new Date(k.issuedAt).toLocaleDateString("en-IN")} – ${new Date(k.expiresAt).toLocaleDateString("en-IN")})
      </td>
      <td style="border-right:1px solid #aaa;"></td>
      <td style="border-right:1px solid #aaa;"></td>
      <td style="border-right:1px solid #aaa;"></td>
      <td style="border-right:1px solid #aaa;"></td>
      <td style="border-right:1px solid #aaa;"></td>
    </tr>`,
      )
      .join("") +
    (remainingKeysCount > 0
      ? `
    <tr>
      <td style="border-left:1px solid #aaa;border-right:1px solid #aaa;padding:3px 6px;"></td>
      <td style="border-right:1px solid #aaa;padding:3px 6px 3px 18px;font-size:10.5px;color:#666;font-style:italic;">
        ...+${remainingKeysCount} more key${remainingKeysCount > 1 ? "s" : ""}
      </td>
      <td style="border-right:1px solid #aaa;"></td>
      <td style="border-right:1px solid #aaa;"></td>
      <td style="border-right:1px solid #aaa;"></td>
      <td style="border-right:1px solid #aaa;"></td>
      <td style="border-right:1px solid #aaa;"></td>
    </tr>`
      : "");

  const Page1termsHTML = termsAndConditionsPage1
    .map(
      (section) => `
      <div style="margin-bottom:10px;">
        <div style="font-size:11px;font-weight:700;color:#1e293b;margin-bottom:5px;text-transform:uppercase;letter-spacing:0.3px;">${section.title}</div>
        <ul style="margin:0;padding-left:18px;">
          ${section.points.map((p) => `<li style="font-size:10.5px;color:#334155;line-height:1.6;margin-bottom:3px;">${p}</li>`).join("")}
        </ul>
      </div>`,
    )
    .join("");

  const termsHTML = termsAndConditions
    .map(
      (section) => `
      <div style="margin-bottom:10px;">
        <div style="font-size:11px;font-weight:700;color:#1e293b;margin-bottom:5px;text-transform:uppercase;letter-spacing:0.3px;">${section.title}</div>
        <ul style="margin:0;padding-left:18px;">
          ${section.points.map((p) => `<li style="font-size:10.5px;color:#334155;line-height:1.6;margin-bottom:3px;">${p}</li>`).join("")}
        </ul>
      </div>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Invoice ${bill.billNumber}</title>
  <style>
    @page { size: A4; margin: 0; }
    * { margin:0; padding:0; box-sizing:border-box; font-family: Arial, sans-serif; }
    body { background:#fff; color:#1e293b; }

    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 5mm 14mm 0mm 14mm;
      position: relative;
      page-break-after: always;
      overflow: hidden;
    }
    .page:last-child { page-break-after: avoid; }

    .invoice-header {
      position: relative;
      padding-bottom: 6px;
      margin-bottom: 5px;
      min-height: 30px;
    }

    .page::before {
      content: "";
      position: absolute;
      top: 43%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-20deg);
      width: 120mm;
      height: 120mm;
      background: url("${logoUrl}") no-repeat center;
      background-size: contain;
      opacity: 0.2;
      z-index: 0;
      pointer-events: none;
    }

    .page > * { position: relative; z-index: 1; }

    .company-logo {
      position: absolute;
      top: 0;
      left: 0;
      width: 92px;
      height: auto;
    }

    .invoice-title {
      text-align: center;
      font-size: 15px;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #1e293b;
      line-height: 42px;
    }

    .top-grid {
      display:grid;
      grid-template-columns: 1fr 1fr;
      gap:0;
      border:1px solid #ccc;
      margin-bottom:0;
    }
    .top-grid .cell { padding:8px 10px; font-size:10.5px; line-height:1.55; }
    .top-grid .cell.border-right { border-right:1px solid #ccc; }
    .top-grid .cell.border-bottom { border-bottom:1px solid #ccc; }
    .company-name-top { font-size:13px; font-weight:700; color:#1e293b; margin-bottom:3px; }
    .label-sm { font-size:9.5px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.3px; }
    .value-md { font-size:11.5px; font-weight:700; color:#1e293b; }

    .bill-to-section {
      border:1px solid #ccc;
      border-top:none;
      padding:4px 6px;
      font-size:10.5px;
      line-height:1.4;
    }
    .section-head { font-size:10px; font-weight:700; text-transform:uppercase; color:#64748b; letter-spacing:0.4px; margin-bottom:4px; }
    .buyer-name { font-size:13px; font-weight:700; color:#1e293b; }

    .amount-box { border:1px solid #ccc; border-top:none; }
    .amount-row { display:flex; justify-content:space-between; align-items:center; padding:6px 10px; font-size:11px; border-bottom:1px solid #f1f5f9; }
    .amount-row:last-child { border-bottom:none; }
    .amount-row.total-row { background:#EBEBEB; color:#000000; font-weight:700; font-size:12px; }

    .tax-table { width:100%; border-collapse:collapse; margin-top:8px; font-size:10.5px; }
    .tax-table th { border:1px solid #ccc; padding:6px 10px; background:#f1f5f9; font-size:9.5px; font-weight:700; text-transform:uppercase; color:#475569; text-align:center; }
    .tax-table td { border:1px solid #ccc; padding:6px 10px; text-align:center; color:#1e293b; }

    .page1-footer {
      position: absolute;
      left: 14mm;
      right: 14mm;
      bottom: 10mm;
      padding-top: 8px;
      border-top: 1px solid #e2e8f0;
      font-size: 9.5px;
      color: #94a3b8;
      text-align: center;
      line-height: 1.5;
    }

    .terms-page {
      width:210mm;
      height:297mm;
      padding:14mm 14mm 14mm 14mm;
      position: relative;
      overflow: hidden;
      page-break-after: avoid;
      box-sizing: border-box;
    }
    .terms-title {
      font-size:12px; font-weight:700; color:#1e293b; text-transform:uppercase;
      letter-spacing:0.5px; margin-bottom:2px; padding-bottom:4px; margin-top:7px;
      border-bottom:1px solid #D5D5D5;
    }
    .terms-subtitle { font-size:10px; color:#64748b; margin-bottom:8px; }

    .terms-page::before {
      content: "";
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-20deg);
      width: 120mm;
      height: 120mm;
      background: url("${logoUrl}") no-repeat center;
      background-size: contain;
      opacity: 0.2;
      z-index: 0;
      pointer-events: none;
    }
    .terms-page > * { position: relative; z-index: 1; }

    .terms-footer {
      position: absolute;
      left: 14mm;
      right: 14mm;
      bottom: 4mm;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
      font-size: 9.5px;
      color: #64748b;
      text-align: center;
      line-height: 1.6;
    }
  </style>
</head>
<body>

<!-- ==================== PAGE 1: INVOICE ==================== -->
<div class="page">

  <div class="invoice-header">
    <img class="company-logo" src="${logoUrl}" alt="Company Logo" />
    <div class="invoice-title">Tax Invoice</div>
  </div>

  <div class="top-grid">
    <div class="cell border-right border-bottom">
      <div class="company-name-top">${companyInfo.companyName}</div>
      <div>${companyInfo.addressLine1}, ${companyInfo.addressLine2}</div>
      <div>${companyInfo.cityPincode}</div>
      <div>GSTIN: <strong>${companyInfo.gstin}</strong></div>
      <div>State: ${companyInfo.stateName} | Code: ${companyInfo.stateCode}</div>
      <div>CIN: ${companyInfo.cin}</div>
      <div>Email: ${companyInfo.email}</div>
      <div>Website: ${companyInfo.website}</div>
    </div>
    <div class="cell border-bottom">
      <div style="margin-bottom:6px;">
        <div class="label-sm">Invoice No.</div>
        <div class="value-md">${bill.billNumber}</div>
      </div>
      <div style="margin-bottom:6px;">
        <div class="label-sm">Purchased Date</div>
        <div class="value-md">${purchasedDateStr}</div>
      </div>
      <div style="margin-bottom:6px;">
        <div class="label-sm">Renewal Date</div>
        <div class="value-md">${renewalDateStr}</div>
      </div>
      <div>
        <div class="label-sm">Service</div>
        <div class="value-md">LR License Key Management</div>
      </div>
    </div>
  </div>

  <div class="bill-to-section">
    <div class="section-head">Bill To</div>
    <div class="buyer-name">${entity.companyName || entity.representativeName}</div>
    <div>Representative: <strong>${entity.representativeName}</strong></div>
    ${entity.phone ? `<div>Phone: ${entity.phone}</div>` : ""}
    ${entity.email ? `<div>Email: ${entity.email}</div>` : ""}
    ${entity.gstNumber ? `<div>GSTIN: <strong>${entity.gstNumber}</strong></div>` : ""}
    ${entity.address ? `<div>Address: ${entity.address}</div>` : ""}
    ${bill.username ? `<div>License User: <strong>${bill.username}</strong></div>` : ""}
  </div>

  <table style="width:100%;border-collapse:collapse;margin-top:8px;font-size:11px;">
    <thead>
      <tr style="background:#F1F5F9;">
        <th style="border:1px solid #aaa;padding:5px 6px;text-align:center;width:5%;font-size:10px;">Sl<br>No.</th>
        <th style="border:1px solid #aaa;padding:5px 6px;text-align:center;width:36%;font-size:10px;">Description of<br>Services</th>
        <th style="border:1px solid #aaa;padding:5px 6px;text-align:center;width:7%;font-size:10px;">GST<br>Rate</th>
        <th style="border:1px solid #aaa;padding:5px 6px;text-align:center;width:10%;font-size:10px;">Quantity</th>
        <th style="border:1px solid #aaa;padding:5px 6px;text-align:right;width:12%;font-size:10px;">Rate</th>
        <th style="border:1px solid #aaa;padding:5px 6px;text-align:center;width:6%;font-size:10px;">per</th>
        <th style="border:1px solid #aaa;padding:5px 6px;text-align:right;width:14%;font-size:10px;">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="border-left:1px solid #aaa;border-right:1px solid #aaa;padding:5px 6px;text-align:center;font-size:11px;">1</td>
        <td style="border-right:1px solid #aaa;padding:5px 6px;">
          <div style="font-weight:700;font-size:11px;">LR License Keys</div>
          <div style="font-size:10px;color:#555;">From ${purchasedDateStr} to ${renewalDateStr}</div>
        </td>
        <td style="border-right:1px solid #aaa;padding:5px 6px;text-align:center;font-size:11px;">${gstRate}%</td>
        <td style="border-right:1px solid #aaa;padding:5px 6px;text-align:center;font-size:11px;">${bill.keyQuantity} No.</td>
        <td style="border-right:1px solid #aaa;padding:5px 6px;text-align:right;font-size:11px;">${formatINR(baseAmount)}</td>
        <td style="border-right:1px solid #aaa;padding:5px 6px;text-align:center;font-size:11px;">No.</td>
        <td style="border-right:1px solid #aaa;padding:5px 6px;text-align:right;font-weight:700;font-size:11px;">${formatINR(baseAmount)}</td>
      </tr>

      ${keyRowsHTML}

      ${Array(
        Math.max(
          0,
          6 - (visibleKeys.length + (remainingKeysCount > 0 ? 1 : 0)),
        ),
      )
        .fill(
          `
  <tr style="height:18px;">
    <td style="border-left:1px solid #aaa;border-right:1px solid #aaa;"></td>
    <td style="border-right:1px solid #aaa;"></td>
    <td style="border-right:1px solid #aaa;"></td>
    <td style="border-right:1px solid #aaa;"></td>
    <td style="border-right:1px solid #aaa;"></td>
    <td style="border-right:1px solid #aaa;"></td>
    <td style="border-right:1px solid #aaa;"></td>
  </tr>`,
        )
        .join("")}

      <tr>
        <td style="border-left:1px solid #aaa;border-right:1px solid #aaa;border-top:1px solid #aaa;"></td>
        <td style="border-right:1px solid #aaa;border-top:1px solid #aaa;padding:5px 6px;text-align:right;font-size:10.5px;color:#333;">
          IGST Output-${gstRate}% (${companyInfo.stateName})
        </td>
        <td style="border-right:1px solid #aaa;border-top:1px solid #aaa;"></td>
        <td style="border-right:1px solid #aaa;border-top:1px solid #aaa;"></td>
        <td style="border-right:1px solid #aaa;border-top:1px solid #aaa;padding:5px 6px;text-align:center;font-size:10.5px;">${gstRate}</td>
        <td style="border-right:1px solid #aaa;border-top:1px solid #aaa;padding:5px 6px;text-align:center;font-size:10.5px;">%</td>
        <td style="border-right:1px solid #aaa;border-top:1px solid #aaa;padding:5px 6px;text-align:right;font-size:10.5px;">${formatINR(gstAmount)}</td>
      </tr>

      <tr style="background:#F1F5F9;border-top:2px solid #aaa;">
        <td style="border:1px solid #aaa;padding:6px;"></td>
        <td style="border:1px solid #aaa;padding:6px;font-weight:700;font-size:11px;">Total</td>
        <td style="border:1px solid #aaa;"></td>
        <td style="border:1px solid #aaa;padding:6px;text-align:center;font-weight:700;font-size:11px;">${bill.keyQuantity} No.</td>
        <td style="border:1px solid #aaa;"></td>
        <td style="border:1px solid #aaa;"></td>
        <td style="border:1px solid #aaa;padding:6px;text-align:right;font-weight:700;font-size:12px;">₹ ${formatINR(Math.round(totalAmount))}</td>
      </tr>
    </tbody>
  </table>

  <div style="border:1px solid #aaa;border-top:none;display:flex;justify-content:space-between;padding:5px 8px;font-size:10.5px;background:#F1F5F9;">
    <span><strong>Amount Chargeable (in words):</strong> &nbsp; INR ${amountInWords(Math.round(totalAmount))}</span>
    <span style="color:#555;font-style:italic;">E. &amp; O.E.</span>
  </div>

  <table class="tax-table">
    <thead>
      <tr>
        <th>HSN/SAC</th>
        <th>Taxable Value (₹)</th>
        <th>IGST Rate</th>
        <th>IGST Amount (₹)</th>
        <th>Total Amount (₹)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${hsnCode}</td>
        <td>${formatINR(baseAmount)}</td>
        <td>${gstRate}%</td>
        <td>${formatINR(gstAmount)}</td>
        <td><strong>${formatINR(totalAmount)}</strong></td>
      </tr>
    </tbody>
  </table>

  <div class="amount-box" style="margin-top:0;">
    <div class="amount-row">
      <span>Taxable Amount (Before GST)</span>
      <span>₹ ${formatINR(baseAmount)}</span>
    </div>
    <div class="amount-row">
      <span>IGST @ ${gstRate}%</span>
      <span>₹ ${formatINR(gstAmount)}</span>
    </div>
    <div class="amount-row total-row">
      <span>Total Amount Payable</span>
      <span>₹ ${formatINR(totalAmount)}</span>
    </div>
  </div>

  <div style="margin-top:8px;border:1px solid #aaa;padding:10px 14px;page-break-inside:avoid;">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#64748b;letter-spacing:0.4px;margin-bottom:6px;">
      Company's Bank Details
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 20px;font-size:10.5px;">
      <div style="display:flex;gap:8px;">
        <span style="color:#64748b;font-size:10px;min-width:100px;">Account Holder</span>
        <span style="font-weight:600;color:#1e293b;">: ${companyInfo.bankAccountHolder}</span>
      </div>
      <div style="display:flex;gap:8px;">
        <span style="color:#64748b;font-size:10px;min-width:100px;">Account No.</span>
        <span style="font-weight:600;color:#1e293b;">: ${companyInfo.bankAccountNumber}</span>
      </div>
      <div style="display:flex;gap:8px;">
        <span style="color:#64748b;font-size:10px;min-width:100px;">Bank Name</span>
        <span style="font-weight:600;color:#1e293b;">: ${companyInfo.bankName}</span>
      </div>
      <div style="display:flex;gap:8px;">
        <span style="color:#64748b;font-size:10px;min-width:100px;">Branch</span>
        <span style="font-weight:600;color:#1e293b;">: ${companyInfo.bankBranch}</span>
      </div>
      <div style="display:flex;gap:8px;">
        <span style="color:#64748b;font-size:10px;min-width:100px;">IFSC Code</span>
        <span style="font-weight:600;color:#1e293b;">: ${companyInfo.bankIFSC}</span>
      </div>
    </div>
  </div>

  <div class="terms-title">Terms &amp; Conditions</div>
  <div class="terms-subtitle">
    Invoice No: <strong>${bill.billNumber}</strong> &nbsp;|&nbsp;
    ${companyInfo.companyName} &nbsp;|&nbsp;
    ${companyInfo.website}
  </div>
  ${Page1termsHTML}

  <div class="page1-footer" style="position:static;padding-top:8px;border-top:1px solid #e2e8f0;font-size:9.5px;color:#94a3b8;text-align:center;line-height:1.5; page-break-inside:avoid;">
    <strong>SUBJECT TO ${companyInfo.jurisdiction} JURISDICTION</strong> &nbsp;|&nbsp;
    This is a System Generated Invoice |&nbsp; Page 1 of 2
  </div>
</div>

<!-- ==================== PAGE 2: TERMS & CONDITIONS ==================== -->
<div class="terms-page">
  ${termsHTML}

  <div class="terms-footer">
    <strong>${companyInfo.companyName}</strong><br>
    ${companyInfo.addressLine1}, ${companyInfo.addressLine2}, ${companyInfo.cityPincode}<br>
    Email: ${companyInfo.email} &nbsp;|&nbsp; Website: ${companyInfo.website}<br>
    GSTIN: ${companyInfo.gstin} &nbsp;|&nbsp; CIN: ${companyInfo.cin}<br><br>
    <strong>SUBJECT TO ${companyInfo.jurisdiction} JURISDICTION</strong>
    &nbsp;|&nbsp; Page 2 of 2
  </div>
</div>

</body>
</html>`;
};

// ---------- Main export ----------
const generateInvoicePDF = async (bill, entity, keys) => {
  console.log(`Generating PDF for bill: ${bill.billNumber}`);

  let browser = null;
  try {
    const isWindows = os.platform() === "win32";

    const launchArgs = isWindows
      ? ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
      : [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--no-zygote",
          "--single-process",
          "--disable-web-security",
          "--disable-features=IsolateOrigins",
        ];

    browser = await puppeteer.launch({
      headless: "new",
      args: launchArgs,
      protocolTimeout: 60000, // gives more time before "Target closed"-type failures
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 1 });

    const html = generateHTML(bill, entity, keys);

    await page.setContent(html, {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "20px", bottom: "20px", left: "20px", right: "20px" },
      displayHeaderFooter: false,
      landscape: false,
    });

    console.log(
      `PDF generated. Size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`,
    );
    return Buffer.from(pdfBuffer);
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw new Error(`Failed to generate PDF: ${error.message}`);
  } finally {
    if (browser) await browser.close();
  }
};

module.exports = { generateInvoicePDF, formatINR };
