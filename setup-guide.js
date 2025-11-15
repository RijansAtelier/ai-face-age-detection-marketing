import { jsPDF } from 'jspdf';
import { writeFileSync } from 'fs';

const doc = new jsPDF();
let yPos = 20;

// Title
doc.setFontSize(24);
doc.setFont(undefined, 'bold');
doc.text('AI Face Detection System', 105, yPos, { align: 'center' });
doc.setFontSize(16);
yPos += 10;
doc.text('Complete Setup Guide for Beginners', 105, yPos, { align: 'center' });

// Reset font
doc.setFontSize(12);
doc.setFont(undefined, 'normal');
yPos += 15;

// Section 1: Introduction
doc.setFont(undefined, 'bold');
doc.text('1. Introduction', 20, yPos);
doc.setFont(undefined, 'normal');
yPos += 7;
doc.text('This guide will help you run the AI Face Detection System step by step.', 20, yPos);
yPos += 5;
doc.text('No prior technical experience required!', 20, yPos);
yPos += 12;

// Section 2: What You Need
doc.setFont(undefined, 'bold');
doc.text('2. What You Need', 20, yPos);
doc.setFont(undefined, 'normal');
yPos += 7;
doc.text('Option A (Easiest): Use Replit (free online platform)', 20, yPos);
yPos += 5;
doc.text('  - Just a web browser and internet connection', 25, yPos);
yPos += 5;
doc.text('  - Create a free account at replit.com', 25, yPos);
yPos += 8;
doc.text('Option B (Advanced): Run on Your Computer', 20, yPos);
yPos += 5;
doc.text('  - Node.js version 18 or higher', 25, yPos);
yPos += 5;
doc.text('  - A webcam for face detection', 25, yPos);
yPos += 12;

// Section 3: Quick Start (Replit)
doc.setFont(undefined, 'bold');
doc.text('3. Quick Start on Replit (Recommended)', 20, yPos);
doc.setFont(undefined, 'normal');
yPos += 7;
doc.text('Step 1: Go to replit.com and create a free account', 20, yPos);
yPos += 7;
doc.text('Step 2: Click "Create Repl" button', 20, yPos);
yPos += 7;
doc.text('Step 3: Choose "Import from GitHub" option', 20, yPos);
yPos += 7;
doc.text('Step 4: Upload your downloaded project files', 20, yPos);
yPos += 7;
doc.text('Step 5: Replit will automatically detect and setup the project', 20, yPos);
yPos += 7;
doc.text('Step 6: Click the green "Run" button at the top', 20, yPos);
yPos += 7;
doc.text('Step 7: Wait for installation to complete (1-2 minutes first time)', 20, yPos);
yPos += 7;
doc.text('Step 8: Your app will open in the preview window!', 20, yPos);
yPos += 12;

// New Page
doc.addPage();
yPos = 20;

// Section 4: Running Locally
doc.setFont(undefined, 'bold');
doc.setFontSize(14);
doc.text('4. Running on Your Computer (Advanced)', 20, yPos);
doc.setFontSize(12);
doc.setFont(undefined, 'normal');
yPos += 10;

doc.setFont(undefined, 'bold');
doc.text('Step 1: Install Node.js', 20, yPos);
doc.setFont(undefined, 'normal');
yPos += 6;
doc.text('  - Visit nodejs.org', 25, yPos);
yPos += 5;
doc.text('  - Download and install the LTS version (recommended)', 25, yPos);
yPos += 5;
doc.text('  - Restart your computer after installation', 25, yPos);
yPos += 10;

doc.setFont(undefined, 'bold');
doc.text('Step 2: Extract the Project Files', 20, yPos);
doc.setFont(undefined, 'normal');
yPos += 6;
doc.text('  - Extract the downloaded ZIP file to a folder', 25, yPos);
yPos += 5;
doc.text('  - Example: C:\\Users\\YourName\\face-detection', 25, yPos);
yPos += 10;

doc.setFont(undefined, 'bold');
doc.text('Step 3: Open Command Prompt/Terminal', 20, yPos);
doc.setFont(undefined, 'normal');
yPos += 6;
doc.text('  Windows: Press Win+R, type "cmd", press Enter', 25, yPos);
yPos += 5;
doc.text('  Mac: Press Cmd+Space, type "terminal", press Enter', 25, yPos);
yPos += 10;

doc.setFont(undefined, 'bold');
doc.text('Step 4: Navigate to Project Folder', 20, yPos);
doc.setFont(undefined, 'normal');
yPos += 6;
doc.text('  Type: cd C:\\Users\\YourName\\face-detection', 25, yPos);
yPos += 5;
doc.text('  (Replace with your actual folder path)', 25, yPos);
yPos += 10;

doc.setFont(undefined, 'bold');
doc.text('Step 5: Install Dependencies', 20, yPos);
doc.setFont(undefined, 'normal');
yPos += 6;
doc.text('  Type: npm install', 25, yPos);
yPos += 5;
doc.text('  Press Enter and wait (this may take 2-5 minutes)', 25, yPos);
yPos += 10;

doc.setFont(undefined, 'bold');
doc.text('Step 6: Install Client Dependencies', 20, yPos);
doc.setFont(undefined, 'normal');
yPos += 6;
doc.text('  Type: cd client', 25, yPos);
yPos += 5;
doc.text('  Type: npm install', 25, yPos);
yPos += 5;
doc.text('  Type: cd ..', 25, yPos);
yPos += 10;

doc.setFont(undefined, 'bold');
doc.text('Step 7: Start the Application', 20, yPos);
doc.setFont(undefined, 'normal');
yPos += 6;
doc.text('  Type: npm run dev', 25, yPos);
yPos += 5;
doc.text('  Press Enter', 25, yPos);
yPos += 10;

doc.setFont(undefined, 'bold');
doc.text('Step 8: Open in Browser', 20, yPos);
doc.setFont(undefined, 'normal');
yPos += 6;
doc.text('  Open your web browser', 25, yPos);
yPos += 5;
doc.text('  Go to: http://localhost:5000', 25, yPos);

// New Page
doc.addPage();
yPos = 20;

// Section 5: Using the System
doc.setFont(undefined, 'bold');
doc.setFontSize(14);
doc.text('5. Using the System', 20, yPos);
doc.setFontSize(12);
doc.setFont(undefined, 'normal');
yPos += 10;

doc.setFont(undefined, 'bold');
doc.text('Public View (No Login):', 20, yPos);
doc.setFont(undefined, 'normal');
yPos += 6;
doc.text('  - Camera feed displays automatically', 25, yPos);
yPos += 5;
doc.text('  - Faces are detected in real-time', 25, yPos);
yPos += 5;
doc.text('  - Age and gender shown on screen', 25, yPos);
yPos += 5;
doc.text('  - All data is saved to database', 25, yPos);
yPos += 10;

doc.setFont(undefined, 'bold');
doc.text('Admin Login:', 20, yPos);
doc.setFont(undefined, 'normal');
yPos += 6;
doc.text('  1. Click the "Login" button in top-right corner', 25, yPos);
yPos += 5;
doc.text('  2. Enter credentials:', 25, yPos);
yPos += 5;
doc.text('     Username: admin', 30, yPos);
yPos += 5;
doc.text('     Password: admin123', 30, yPos);
yPos += 5;
doc.text('  3. Click "Login"', 25, yPos);
yPos += 10;

doc.setFont(undefined, 'bold');
doc.text('Admin Features:', 20, yPos);
doc.setFont(undefined, 'normal');
yPos += 6;
doc.text('  - View all detections in real-time', 25, yPos);
yPos += 5;
doc.text('  - Click the X button to logout', 25, yPos);
yPos += 15;

// Section 6: Troubleshooting
doc.setFont(undefined, 'bold');
doc.setFontSize(14);
doc.text('6. Common Issues & Solutions', 20, yPos);
doc.setFontSize(12);
doc.setFont(undefined, 'normal');
yPos += 10;

doc.setFont(undefined, 'bold');
doc.text('Camera Not Working:', 20, yPos);
doc.setFont(undefined, 'normal');
yPos += 6;
doc.text('  - Allow camera permissions when browser asks', 25, yPos);
yPos += 5;
doc.text('  - Check if another app is using the camera', 25, yPos);
yPos += 5;
doc.text('  - Try refreshing the page', 25, yPos);
yPos += 10;

doc.setFont(undefined, 'bold');
doc.text('"npm not found" Error:', 20, yPos);
doc.setFont(undefined, 'normal');
yPos += 6;
doc.text('  - Install Node.js from nodejs.org', 25, yPos);
yPos += 5;
doc.text('  - Restart your computer after installation', 25, yPos);
yPos += 5;
doc.text('  - Open a NEW command prompt/terminal window', 25, yPos);
yPos += 10;

doc.setFont(undefined, 'bold');
doc.text('Port Already in Use:', 20, yPos);
doc.setFont(undefined, 'normal');
yPos += 6;
doc.text('  - Close other applications using ports 3001 or 5000', 25, yPos);
yPos += 5;
doc.text('  - Restart your computer', 25, yPos);
yPos += 10;

doc.setFont(undefined, 'bold');
doc.text('Installation Taking Too Long:', 20, yPos);
doc.setFont(undefined, 'normal');
yPos += 6;
doc.text('  - Be patient, first install can take 5-10 minutes', 25, yPos);
yPos += 5;
doc.text('  - Make sure you have stable internet connection', 25, yPos);

// New Page
doc.addPage();
yPos = 20;

// Section 7: System Architecture
doc.setFont(undefined, 'bold');
doc.setFontSize(14);
doc.text('7. How It Works', 20, yPos);
doc.setFontSize(12);
doc.setFont(undefined, 'normal');
yPos += 10;

doc.text('The system has two main parts:', 20, yPos);
yPos += 8;
doc.setFont(undefined, 'bold');
doc.text('Backend Server (Port 3001):', 20, yPos);
doc.setFont(undefined, 'normal');
yPos += 6;
doc.text('  - Processes face detection requests', 25, yPos);
yPos += 5;
doc.text('  - Stores data in SQLite database', 25, yPos);
yPos += 5;
doc.text('  - Handles user authentication', 25, yPos);
yPos += 10;

doc.setFont(undefined, 'bold');
doc.text('Frontend Website (Port 5000):', 20, yPos);
doc.setFont(undefined, 'normal');
yPos += 6;
doc.text('  - Displays the camera feed', 25, yPos);
yPos += 5;
doc.text('  - Shows detection results', 25, yPos);
yPos += 5;
doc.text('  - Provides admin interface', 25, yPos);
yPos += 15;

// Section 8: Important Notes
doc.setFont(undefined, 'bold');
doc.setFontSize(14);
doc.text('8. Important Security Notes', 20, yPos);
doc.setFontSize(12);
doc.setFont(undefined, 'normal');
yPos += 10;

doc.text('For Production Use:', 20, yPos);
yPos += 6;
doc.text('  - Change default admin password immediately!', 25, yPos);
yPos += 5;
doc.text('  - Use HTTPS for secure connections', 25, yPos);
yPos += 5;
doc.text('  - Set up environment variables for secrets', 25, yPos);
yPos += 5;
doc.text('  - Regularly backup your database', 25, yPos);
yPos += 15;

// Section 9: Support
doc.setFont(undefined, 'bold');
doc.setFontSize(14);
doc.text('9. Need Help?', 20, yPos);
doc.setFontSize(12);
doc.setFont(undefined, 'normal');
yPos += 10;

doc.text('Quick Tips:', 20, yPos);
yPos += 6;
doc.text('  - Make sure Node.js version is 18 or higher', 25, yPos);
yPos += 5;
doc.text('  - Run all commands in the project root folder', 25, yPos);
yPos += 5;
doc.text('  - Check firewall settings if cant access localhost', 25, yPos);
yPos += 5;
doc.text('  - Use Chrome or Firefox for best compatibility', 25, yPos);
yPos += 15;

doc.setFont(undefined, 'bold');
doc.text('Database Location:', 20, yPos);
doc.setFont(undefined, 'normal');
yPos += 6;
doc.text('  - SQLite database: server/detections.db', 25, yPos);
yPos += 5;
doc.text('  - Contains all face detection records', 25, yPos);
yPos += 15;

// Footer
doc.setFontSize(10);
doc.setTextColor(100);
doc.text('AI Face Detection System - Setup Guide v1.0', 105, 280, { align: 'center' });

// Save the PDF
const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
writeFileSync('AI-Face-Detection-Setup-Guide.pdf', pdfBuffer);
console.log('PDF created successfully!');
