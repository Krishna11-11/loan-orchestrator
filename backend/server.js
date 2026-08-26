import express from 'express';
import cors from 'cors';
import crypto from 'crypto';

const app = express();
app.use(cors());
app.use(express.json());

// In-memory Database Store
const applications = {};

// 1. Create Loan Application API
app.post('/api/v1/applications', (req, res) => {
  const { loanType, requestedAmount, fullName, mobile, email } = req.body;
  const appNo = `LOAN-${Math.floor(100000 + Math.random() * 900000)}`;
  
  const newApp = {
    id: crypto.randomUUID(),
    applicationNo: appNo,
    applicant: { fullName, mobile, email },
    loanType: loanType || "OD",
    requestedAmount: requestedAmount || 2500000,
    status: "DOCUMENTS_PENDING",
    readinessScore: 0,
    documents: [],
    createdAt: new Date().toISOString()
  };

  applications[newApp.id] = newApp;
  return res.status(201).json({ success: true, application: newApp });
});

// 2. AI Document Verification API
app.post('/api/v1/applications/:appId/upload', (req, res) => {
  const { appId } = req.params;
  const { fileName, categoryHint } = req.body;
  const app = applications[appId];

  if (!app) return res.status(404).json({ success: false, message: "Application not found" });

  const fileHash = crypto.createHash('sha256').update(fileName + Date.now()).digest('hex');
  
  let extractedMetrics = { verified: true };
  let detectedCategory = categoryHint || "FINANCIAL_STATEMENT";

  if (fileName.toLowerCase().includes("gst")) {
    detectedCategory = "GST";
    extractedMetrics = { turnover: 12500000, gstin: "07AAAAA0000A1Z5", filingStatus: "ACTIVE" };
  } else if (fileName.toLowerCase().includes("bank")) {
    detectedCategory = "BANK_STATEMENT";
    extractedMetrics = { avgMonthlyBalance: 450000, creditScoreEstimate: 780 };
  }

  app.documents.push({
    id: crypto.randomUUID(),
    fileName,
    category: detectedCategory,
    extractedData: extractedMetrics,
    fileHash,
    uploadedAt: new Date().toISOString()
  });

  app.readinessScore = Math.min(100, app.documents.length * 34);
  if (app.readinessScore >= 100) {
    app.status = "APPLICATION_READY";
  }

  return res.json({
    success: true,
    readinessScore: app.readinessScore,
    status: app.status,
    documents: app.documents
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Loan engine running on port ${PORT}`));
