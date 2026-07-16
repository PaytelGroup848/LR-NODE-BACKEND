const sendEmail = async (to, subject, htmlContent) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME;

  if (!apiKey || !senderEmail) {
    console.warn('Brevo config not set, skipping email');
    return;
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: to }],
        subject,
        htmlContent,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Brevo email failed:', errorText);
    }
  } catch (err) {
    console.error('Error sending email:', err);
  }
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
};
