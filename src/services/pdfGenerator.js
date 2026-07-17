const puppeteer = require('puppeteer');
const numberToWords = require('number-to-words');
const invoiceCompanyInfo = require('../config/invoiceCompanyInfo');
const path = require('path');
const fs = require('fs');

const formatINR = (number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(number);
};

const numberToWordsINR = (number) => {
  const rupees = Math.floor(number);
  const paise = Math.round((number - rupees) * 100);
  let words = '';
  if (rupees > 0) {
    words += numberToWords.toWords(rupees) + ' Rupees';
  }
  if (paise > 0) {
    words += ' and ' + numberToWords.toWords(paise) + ' Paise';
  }
  return words.charAt(0).toUpperCase() + words.slice(1);
};

const generateInvoiceHTML = (bill, entity, keys) => {
  const purchasedDate = new Date(bill.purchasedDate).toLocaleDateString('en-IN');
  const renewalDate = new Date(bill.renewalDate).toLocaleDateString('en-IN');
  
  // Try to read logo, fallback to text if not found
  let logoBase64 = '';
  try {
    const logoPath = path.join(__dirname, '../../', invoiceCompanyInfo.logoPath);
    if (fs.existsSync(logoPath)) {
      const logoBuffer = fs.readFileSync(logoPath);
      logoBase64 = `data:image/svg+xml;base64,${logoBuffer.toString('base64')}`;
    }
  } catch (err) {
    console.warn('Logo not found, falling back to text');
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          font-family: 'Arial', sans-serif;
        }
        body {
          padding: 20px;
          background: #f5f5f5;
        }
        .invoice-container {
          width: 100%;
          max-width: 800px;
          margin: 0 auto;
          background: white;
          padding: 30px;
          position: relative;
        }
        .watermark {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-30deg);
          opacity: 0.1;
          font-size: 120px;
          font-weight: bold;
          color: #007bff;
          z-index: 0;
        }
        .header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
          position: relative;
          z-index: 1;
        }
        .company-info {
          text-align: left;
        }
        .company-logo {
          max-height: 60px;
        }
        .invoice-meta {
          text-align: right;
        }
        .invoice-number {
          font-size: 18px;
          font-weight: bold;
          color: #007bff;
        }
        .bill-to {
          margin-bottom: 20px;
          border: 1px solid #ddd;
          padding: 15px;
        }
        .section-title {
          font-weight: bold;
          margin-bottom: 10px;
          color: #333;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        th {
          background-color: #f0f0f0;
        }
        .gst-table th, .gst-table td {
          padding: 5px;
        }
        .amount-in-words {
          margin-top: 10px;
          font-style: italic;
        }
        .bank-details {
          margin-top: 20px;
          border: 1px solid #ddd;
          padding: 15px;
        }
        .terms {
          margin-top: 20px;
          font-size: 12px;
        }
        .page-break {
          page-break-after: always;
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="watermark">LR SOLUTIONS</div>
        
        <!-- Page 1 -->
        <div class="header">
          <div class="company-info">
            ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" class="company-logo" />` : `<h2>${invoiceCompanyInfo.name}</h2>`}
            <p>${invoiceCompanyInfo.address}</p>
            <p>${invoiceCompanyInfo.city}, ${invoiceCompanyInfo.state} - ${invoiceCompanyInfo.pincode}</p>
            <p>GSTIN: ${invoiceCompanyInfo.gstin}</p>
            <p>Phone: ${invoiceCompanyInfo.phone} | Email: ${invoiceCompanyInfo.email}</p>
          </div>
          <div class="invoice-meta">
            <div class="invoice-number">Invoice #: ${bill.billNumber}</div>
            <p>Purchased Date: ${purchasedDate}</p>
            <p>Renewal Date: ${renewalDate}</p>
          </div>
        </div>

        <div class="bill-to">
          <div class="section-title">Bill To:</div>
          <p><strong>${entity.representativeName}</strong></p>
          <p>${entity.companyName || ''}</p>
          <p>${entity.address || ''}</p>
          <p>Email: ${entity.email}</p>
          <p>GSTIN: ${entity.gstNumber || 'N/A'}</p>
        </div>

        <div class="section-title">License Keys:</div>
        <table>
          <thead>
            <tr>
              <th>Sl. No.</th>
              <th>License Key</th>
              <th>Assigned To</th>
              <th>Valid From</th>
              <th>Valid Until</th>
            </tr>
          </thead>
          <tbody>
            ${keys.map((key, index) => `
              <tr>
                <td>${index + 1}</td>
                <td><strong>${key.key}</strong></td>
                <td>${bill.username}</td>
                <td>${new Date(key.issuedAt).toLocaleDateString('en-IN')}</td>
                <td>${new Date(key.expiresAt).toLocaleDateString('en-IN')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <table class="gst-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Amount (INR)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Total Amount without GST</td>
              <td>${formatINR(bill.amountWithoutGST)}</td>
            </tr>
            <tr>
              <td>CGST @ ${bill.gstRate / 2}%</td>
              <td>${formatINR(bill.gstAmount / 2)}</td>
            </tr>
            <tr>
              <td>SGST @ ${bill.gstRate / 2}%</td>
              <td>${formatINR(bill.gstAmount / 2)}</td>
            </tr>
            <tr style="font-weight: bold;">
              <td>Total Amount</td>
              <td>${formatINR(bill.totalAmount)}</td>
            </tr>
          </tbody>
        </table>

        <div class="amount-in-words">
          <strong>Amount in Words:</strong> ${numberToWordsINR(bill.totalAmount)} Only
        </div>

        <div class="bank-details">
          <div class="section-title">Bank Details:</div>
          <p><strong>Account Holder:</strong> ${invoiceCompanyInfo.bankDetails.accountHolder}</p>
          <p><strong>Bank Name:</strong> ${invoiceCompanyInfo.bankDetails.bankName}</p>
          <p><strong>Branch:</strong> ${invoiceCompanyInfo.bankDetails.branch}</p>
          <p><strong>Account Number:</strong> ${invoiceCompanyInfo.bankDetails.accountNumber}</p>
          <p><strong>IFSC Code:</strong> ${invoiceCompanyInfo.bankDetails.ifscCode}</p>
        </div>

        <div class="terms">
          <div class="section-title">Terms & Conditions:</div>
          <ol>
            <li>All keys are valid from purchased date to renewal date.</li>
            <li>Keys are non-refundable and non-transferable.</li>
            <li>Please check the keys at the time of receipt.</li>
            <li>For any queries, contact support at ${invoiceCompanyInfo.email}.</li>
          </ol>
        </div>

        <!-- Page 2 - Terms (placeholder for detailed terms) -->
        <div class="page-break"></div>
        <div class="invoice-container" style="padding-top: 50px;">
          <h3>Detailed Terms & Conditions</h3>
          <!-- TODO: Update these terms as per actual company policy -->
          <p><strong>1. License Key Usage</strong></p>
          <p>Each license key is unique and can be used for a single instance of the LR software product.</p>
          
          <p><strong>2. Validity Period</strong></p>
          <p>License keys are valid for the period specified in this invoice. Renewal is required after expiry.</p>
          
          <p><strong>3. Support</strong></p>
          <p>Technical support is provided during the validity period of the license keys.</p>
          
          <p><strong>4. Jurisdiction</strong></p>
          <p>All disputes subject to ${invoiceCompanyInfo.jurisdiction} jurisdiction only.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const generateInvoicePDF = async (bill, entity, keys) => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  try {
    const page = await browser.newPage();
    const htmlContent = generateInvoiceHTML(bill, entity, keys);
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
    });
    return pdfBuffer;
  } finally {
    await browser.close();
  }
};

module.exports = { generateInvoicePDF, formatINR };
