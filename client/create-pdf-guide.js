import { jsPDF } from 'jspdf';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const doc = new jsPDF();
const pageWidth = doc.internal.pageSize.width;
const pageHeight = doc.internal.pageSize.height;
const margin = 20;
const lineHeight = 6;
let y = margin;

function addTitle(text, size = 20) {
  doc.setFontSize(size);
  doc.setFont(undefined, 'bold');
  doc.text(text, pageWidth / 2, y, { align: 'center' });
  y += size / 2 + 5;
}

function addSection(title, content) {
  checkNewPage(20);
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text(title, margin, y);
  y += lineHeight + 2;
  
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  content.forEach(line => {
    checkNewPage(lineHeight);
    if (line.bold) {
      doc.setFont(undefined, 'bold');
      doc.text(line.text, margin, y);
      doc.setFont(undefined, 'normal');
    } else {
      const indent = line.indent || 0;
      doc.text(line.text, margin + indent, y);
    }
    y += lineHeight;
  });
  y += 3;
}

function checkNewPage(requiredSpace) {
  if (y + requiredSpace > pageHeight - margin) {
    doc.addPage();
    y = margin;
  }
}

function addLine() {
  checkNewPage(2);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;
}

// Title Page
addTitle('AI Face Detection System', 24);
addTitle('Complete Setup Guide for Beginners', 14);
y += 10;

// Introduction
addSection('1. Introduction', [
  { text: 'Welcome! This guide will help you run the AI Face Detection System.' },
  { text: 'No prior technical experience required - just follow along!' },
  { text: '' },
  { text: 'The system detects faces in real-time using your webcam and identifies:' },
  { text: '• Age (approximate range)', indent: 5 },
  { text: '• Gender', indent: 5 },
  { text: '• Confidence level', indent: 5 }
]);

// What You Need
addSection('2. What You Need', [
  { text: 'OPTION A (Easiest - Recommended): Use Replit', bold: true },
  { text: '✓ Just a web browser and internet connection', indent: 5 },
  { text: '✓ Free account at replit.com', indent: 5 },
  { text: '✓ No installation needed!', indent: 5 },
  { text: '' },
  { text: 'OPTION B (Advanced): Run on Your Computer', bold: true },
  { text: '✓ Node.js version 18+ (download from nodejs.org)', indent: 5 },
  { text: '✓ A webcam for face detection', indent: 5 },
  { text: '✓ 1 GB free disk space', indent: 5 }
]);

// Quick Start Replit
doc.addPage();
y = margin;
addSection('3. Quick Start on Replit (Recommended)', [
  { text: 'Step 1: Create Replit Account', bold: true },
  { text: '→ Go to replit.com', indent: 5 },
  { text: '→ Click "Sign up" and create a free account', indent: 5 },
  { text: '' },
  { text: 'Step 2: Create New Repl', bold: true },
  { text: '→ Click "+ Create Repl" button (top left)', indent: 5 },
  { text: '→ Select "Import from GitHub"', indent: 5 },
  { text: '' },
  { text: 'Step 3: Upload Your Project', bold: true },
  { text: '→ Upload or drag and drop your project folder', indent: 5 },
  { text: '' },
  { text: 'Step 4: Run the Project', bold: true },
  { text: '→ Click the green "Run" button', indent: 5 },
  { text: '→ Wait 1-2 minutes for installation', indent: 5 },
  { text: '' },
  { text: 'Step 5: Access Your App', bold: true },
  { text: '→ App opens in preview window', indent: 5 },
  { text: '→ Allow camera permissions when prompted', indent: 5 },
  { text: '→ Your system is now running!', indent: 5 }
]);

// Running Locally
doc.addPage();
y = margin;
addSection('4. Running on Your Computer', [
  { text: 'STEP 1: Install Node.js', bold: true },
  { text: '1. Go to https://nodejs.org', indent: 5 },
  { text: '2. Download the LTS version', indent: 5 },
  { text: '3. Run the installer with default settings', indent: 5 },
  { text: '4. Restart your computer', indent: 5 },
  { text: '' },
  { text: 'STEP 2: Extract Project Files', bold: true },
  { text: '1. Extract the ZIP file to a folder', indent: 5 },
  { text: '   Example: C:\\Users\\YourName\\face-detection', indent: 5 },
  { text: '' },
  { text: 'STEP 3: Open Terminal/Command Prompt', bold: true },
  { text: 'Windows: Press Win+R, type "cmd", press Enter', indent: 5 },
  { text: 'Mac: Press Cmd+Space, type "terminal", press Enter', indent: 5 },
  { text: '' },
  { text: 'STEP 4: Navigate to Project', bold: true },
  { text: 'Type: cd C:\\Users\\YourName\\face-detection', indent: 5 },
  { text: '(Replace with your actual folder path)', indent: 5 }
]);

addSection('Installation Steps', [
  { text: 'STEP 5: Install Main Dependencies', bold: true },
  { text: 'Type: npm install', indent: 5 },
  { text: 'Wait 2-5 minutes for installation', indent: 5 },
  { text: '' },
  { text: 'STEP 6: Install Frontend Dependencies', bold: true },
  { text: 'Type: cd client', indent: 5 },
  { text: 'Type: npm install', indent: 5 },
  { text: 'Type: cd ..', indent: 5 },
  { text: '' },
  { text: 'STEP 7: Start the Application', bold: true },
  { text: 'Type: npm run dev', indent: 5 },
  { text: 'Keep this window open!', indent: 5 },
  { text: '' },
  { text: 'STEP 8: Open in Browser', bold: true },
  { text: 'Open browser and go to: http://localhost:5000', indent: 5 },
  { text: 'Allow camera permissions when asked', indent: 5 }
]);

// Using the System
doc.addPage();
y = margin;
addSection('5. Using the System', [
  { text: 'PUBLIC VIEW (No Login)', bold: true },
  { text: '• Camera feed displays automatically', indent: 5 },
  { text: '• Real-time face detection', indent: 5 },
  { text: '• Age and gender shown on faces', indent: 5 },
  { text: '• All data saved to database', indent: 5 },
  { text: '' },
  { text: 'ADMIN LOGIN', bold: true },
  { text: '1. Click "Login" button (top-right)', indent: 5 },
  { text: '2. Enter credentials:', indent: 5 },
  { text: '   Username: admin', indent: 10 },
  { text: '   Password: admin123', indent: 10 },
  { text: '3. Click "Login"', indent: 5 },
  { text: '' },
  { text: 'LOGOUT', bold: true },
  { text: 'Click the X button in top-right corner', indent: 5 }
]);

// Troubleshooting
addSection('6. Troubleshooting', [
  { text: 'Camera Not Working:', bold: true },
  { text: '✓ Allow camera permissions in browser', indent: 5 },
  { text: '✓ Close other apps using camera', indent: 5 },
  { text: '✓ Try refreshing the page', indent: 5 },
  { text: '' },
  { text: '"npm not found" Error:', bold: true },
  { text: '✓ Install Node.js from nodejs.org', indent: 5 },
  { text: '✓ Restart your computer', indent: 5 },
  { text: '✓ Open a NEW terminal window', indent: 5 },
  { text: '' },
  { text: 'Port Already in Use:', bold: true },
  { text: '✓ Close apps using ports 3001 or 5000', indent: 5 },
  { text: '✓ Restart your computer', indent: 5 },
  { text: '' },
  { text: 'Blank Screen:', bold: true },
  { text: '✓ Wait 30 seconds for models to load', indent: 5 },
  { text: '✓ Check camera permissions', indent: 5 },
  { text: '✓ Clear browser cache', indent: 5 }
]);

// Security
doc.addPage();
y = margin;
addSection('7. Important Security Notes', [
  { text: 'FOR PRODUCTION USE:', bold: true },
  { text: '' },
  { text: '1. Change default password immediately!', indent: 5 },
  { text: '   Default: admin / admin123 is NOT secure', indent: 8 },
  { text: '' },
  { text: '2. Use HTTPS for secure connections', indent: 5 },
  { text: '' },
  { text: '3. Backup your database regularly', indent: 5 },
  { text: '   Database: server/detections.db', indent: 8 },
  { text: '' },
  { text: '4. Camera Privacy', indent: 5 },
  { text: '   • Users must approve camera access', indent: 8 },
  { text: '   • Data stays in your database', indent: 8 },
  { text: '   • No data sent to third parties', indent: 8 }
]);

// System Info
addSection('8. System Information', [
  { text: 'PORTS USED:', bold: true },
  { text: '• Port 3001: Backend API server', indent: 5 },
  { text: '• Port 5000: Frontend website', indent: 5 },
  { text: '' },
  { text: 'DATABASE:', bold: true },
  { text: '• Location: server/detections.db', indent: 5 },
  { text: '• Type: SQLite', indent: 5 },
  { text: '' },
  { text: 'DEFAULT ADMIN:', bold: true },
  { text: '• Username: admin', indent: 5 },
  { text: '• Password: admin123', indent: 5 },
  { text: '' },
  { text: 'SYSTEM REQUIREMENTS:', bold: true },
  { text: '• Node.js 18+', indent: 5 },
  { text: '• 1GB RAM minimum', indent: 5 },
  { text: '• Webcam', indent: 5 },
  { text: '• Modern browser (Chrome recommended)', indent: 5 }
]);

// Quick Reference
addSection('Quick Command Reference', [
  { text: 'Install dependencies:', indent: 5 },
  { text: 'npm install', indent: 10 },
  { text: 'cd client && npm install && cd ..', indent: 10 },
  { text: '' },
  { text: 'Start application:', indent: 5 },
  { text: 'npm run dev', indent: 10 },
  { text: '' },
  { text: 'Access application:', indent: 5 },
  { text: 'http://localhost:5000', indent: 10 },
  { text: '' },
  { text: 'Stop application:', indent: 5 },
  { text: 'Ctrl+C (in terminal)', indent: 10 }
]);

// Footer
doc.setFontSize(9);
doc.setTextColor(100);
doc.text('AI Face Detection System - Setup Guide v1.0', pageWidth / 2, pageHeight - 10, { align: 'center' });

// Save PDF
const pdfPath = join(__dirname, 'AI-Face-Detection-Setup-Guide.pdf');
const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
writeFileSync(pdfPath, pdfBuffer);

console.log('✅ PDF guide created successfully!');
console.log('📄 File location: AI-Face-Detection-Setup-Guide.pdf');
