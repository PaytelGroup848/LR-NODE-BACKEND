// Invoice Company Configuration for LR License Management
// Note: Update these values with actual company details before going live
const invoiceCompanyInfo = {
  name: "LR Solutions Private Limited", // TODO: Replace with actual company name
  address: "123 Business Avenue, Tech Park", // TODO: Replace with actual address
  city: "Mumbai", // TODO: Replace with actual city
  state: "Maharashtra", // TODO: Replace with actual state
  pincode: "400001", // TODO: Replace with actual pincode
  gstin: "27AAACXXXXXXXXX", // TODO: Replace with actual GSTIN
  phone: "+91-98765-43210", // TODO: Replace with actual phone number
  email: "contact@lrsolutions.com", // TODO: Replace with actual email
  website: "https://www.lrsolutions.com", // TODO: Replace with actual website
  logoPath: "frontend/public/Cloudedata.svg", // Path to company logo
  bankDetails: {
    accountHolder: "LR Solutions Private Limited", // TODO: Replace with actual account holder name
    bankName: "State Bank of India", // TODO: Replace with actual bank name
    branch: "Main Branch, Mumbai", // TODO: Replace with actual branch
    accountNumber: "1234567890123456", // TODO: Replace with actual account number
    ifscCode: "SBIN0001234", // TODO: Replace with actual IFSC code
  },
  jurisdiction: "Mumbai", // TODO: Replace with actual jurisdiction
};

module.exports = invoiceCompanyInfo;
