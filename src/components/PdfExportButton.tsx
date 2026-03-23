"use client";

import { useCallback } from "react";
import { Download } from "lucide-react";

interface PdfExportButtonProps {
  title: string;
  filename?: string;
  htmlContent: string;
  className?: string;
  label?: string;
}

export default function PdfExportButton({
  title,
  filename = "document",
  htmlContent,
  className,
  label = "ייצוא PDF",
}: PdfExportButtonProps) {
  const handleExport = useCallback(() => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("אנא אפשרי חלונות קופצים בדפדפן");
      return;
    }

    const styledHtml = `
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>
    @page {
      size: A4;
      margin: 20mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      background: #1a1a1a;
      color: #e8e8e8;
      direction: rtl;
      padding: 40px;
      line-height: 1.6;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: #222;
      border: 1px solid #c9a84c;
      border-radius: 12px;
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
      border-bottom: 2px solid #c9a84c;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      font-size: 28px;
      color: #c9a84c;
      margin-bottom: 4px;
      font-weight: 700;
    }
    .header .brand {
      font-size: 14px;
      color: #999;
      letter-spacing: 2px;
    }
    .body-content {
      padding: 30px;
    }
    .doc-title {
      font-size: 22px;
      color: #c9a84c;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 1px solid #333;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
    }
    th {
      background: #2a2a2a;
      color: #c9a84c;
      padding: 10px 14px;
      text-align: right;
      font-size: 13px;
      border-bottom: 2px solid #c9a84c;
    }
    td {
      padding: 10px 14px;
      border-bottom: 1px solid #333;
      font-size: 14px;
      color: #ddd;
    }
    tr:last-child td {
      border-bottom: none;
    }
    .total-row {
      background: rgba(201, 168, 76, 0.1);
      font-weight: bold;
    }
    .total-row td {
      color: #c9a84c;
      font-size: 16px;
      padding: 14px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #333;
      font-size: 14px;
    }
    .info-label {
      color: #999;
    }
    .info-value {
      color: #e8e8e8;
      font-weight: 500;
    }
    .footer {
      border-top: 1px solid #333;
      padding: 20px 30px;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
    @media print {
      body {
        background: #1a1a1a !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>זירת האדריכלות</h1>
      <div class="brand">ZIRAT ARCHITECTURE</div>
    </div>
    <div class="body-content">
      <div class="doc-title">${title}</div>
      ${htmlContent}
    </div>
    <div class="footer">
      זירת האדריכלות &mdash; ${new Date().toLocaleDateString("he-IL")}
    </div>
  </div>
</body>
</html>`;

    printWindow.document.write(styledHtml);
    printWindow.document.close();
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 300);
    };
  }, [title, htmlContent]);

  return (
    <button
      onClick={handleExport}
      className={className || "text-xs px-3 py-1.5 rounded-btn border border-border-subtle text-text-muted hover:text-gold flex items-center gap-1"}
    >
      <Download className="w-3 h-3" />
      {label}
    </button>
  );
}
