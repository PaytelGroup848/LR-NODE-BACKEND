const sendEmail = async (to, subject, htmlContent, attachments = []) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME;

  if (!apiKey || !senderEmail) {
    console.warn('Brevo config not set, skipping email');
    return;
  }

  try {
    const body = {
      sender: { name: senderName, email: senderEmail },
      to: [{ email: to }],
      subject,
      htmlContent,
    };

    if (attachments.length > 0) {
      body.attachment = attachments;
    }

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Brevo email failed:', errorText);
    }
  } catch (err) {
    console.error('Error sending email:', err);
  }
};

const sendInvoiceEmail = async (to, bill, pdfBuffer) => {
  const subject = `Invoice ${bill.billNumber} - LR License Keys`;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
        }
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #007bff, #0056b3);
          color: white;
          padding: 20px;
          border-radius: 8px 8px 0 0;
        }
        .content {
          padding: 20px;
          background: #f9f9f9;
          border-radius: 0 0 8px 8px;
        }
        .invoice-details {
          background: white;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .footer {
          margin-top: 20px;
          font-size: 12px;
          color: #666;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>LR License Management</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>Please find attached your invoice for LR License Keys.</p>
          
          <div class="invoice-details">
            <h3>Invoice Details</h3>
            <p><strong>Invoice Number:</strong> ${bill.billNumber}</p>
            <p><strong>Purchased Date:</strong> ${new Date(bill.purchasedDate).toLocaleDateString('en-IN')}</p>
            <p><strong>Renewal Date:</strong> ${new Date(bill.renewalDate).toLocaleDateString('en-IN')}</p>
            <p><strong>Key Quantity:</strong> ${bill.keyQuantity}</p>
            <p><strong>Total Amount:</strong> ₹${bill.totalAmount.toFixed(2)}</p>
          </div>
          
          <p>Thank you for your business!</p>
          
          <div class="footer">
            <p>This is an automated email, please do not reply.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const attachments = [
    {
      content: pdfBuffer.toString('base64'),
      name: `Invoice_${bill.billNumber}.pdf`,
    },
  ];

  await sendEmail(to, subject, htmlContent, attachments);
};

const sendSingleKeyEmail = async (user, licenseKey) => {
  const subject = 'Your LR License Key';
  const html = `
    <p>Hello ${user.representativeName},</p>
    <p>Your license key is: <strong>${licenseKey.key}</strong></p>
    <p>Valid until: ${licenseKey.expiresAt.toISOString().split('T')[0]}</p>
    <p>Thank you!</p>
  `;
  await sendEmail(user.email, subject, html);
};

const sendBulkKeysEmail = async (partner, keys) => {
  const subject = 'Your Bulk LR License Keys';
  const keysTable = `
    <table border="1" cellpadding="8" cellspacing="0">
      <thead><tr><th>Key</th><th>Expires At</th></tr></thead>
      <tbody>
        ${keys.map(k => `<tr><td>${k.key}</td><td>${k.expiresAt.toISOString().split('T')[0]}</td></tr>`).join('')}
      </tbody>
    </table>
  `;
  const html = `
    <p>Hello ${partner.representativeName},</p>
    <p>Here are your bulk license keys:</p>
    ${keysTable}
    <p>Thank you!</p>
  `;
  await sendEmail(partner.email, subject, html);
};

module.exports = {
  sendSingleKeyEmail,
  sendBulkKeysEmail,
  sendInvoiceEmail,
};
