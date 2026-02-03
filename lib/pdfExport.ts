import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FinancialData, IncomeEntry, Expense, Category } from '../types';
import { getNetIncome, formatDateString, getDeductionsForEntry } from './utils';

interface CategoryTotal {
  category: string;
  amount: number;
  percentage: number;
}

// Custom currency formatter for Philippine Pesos with PHP symbol
const formatCurrencyPHP = (amount: number): string => {
  const formatted = new Intl.NumberFormat('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Math.abs(amount));
  const sign = amount < 0 ? '-' : '';
  return `${sign}PHP ${formatted}`;
};

export const generateFinancialReportPDF = async (data: FinancialData, userName?: string) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let yPos = 20;

  // Load and add logo
  const logoUrl = '/logo.png';
  let logoDataUrl: string | null = null;
  
  try {
    const response = await fetch(logoUrl);
    const blob = await response.blob();
    logoDataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn('Could not load logo for PDF:', error);
  }

  // Helper function to check if we need a new page
  const checkNewPage = (requiredSpace: number = 20) => {
    if (yPos + requiredSpace > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      yPos = 20;
      return true;
    }
    return false;
  };

  // Calculate all metrics
  const totalNetIncome = data.incomeHistory.reduce((sum, inc) => sum + getNetIncome(inc), 0);
  const totalExpenses = data.expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const netBalance = totalNetIncome - totalExpenses;
  const incomeCount = data.incomeHistory.length || 1;
  const averageNetIncome = totalNetIncome / incomeCount;

  // Calculate date range
  const allDates: Date[] = [];
  data.incomeHistory.forEach(inc => {
    const [y, m, d] = inc.date.split('-').map(Number);
    allDates.push(new Date(y, m - 1, d));
  });
  data.expenses.forEach(exp => {
    const [y, m, d] = exp.date.split('-').map(Number);
    allDates.push(new Date(y, m - 1, d));
  });

  let dateRange = 'No data';
  if (allDates.length > 0) {
    const earliest = new Date(Math.min(...allDates.map(d => d.getTime())));
    const latest = new Date(Math.max(...allDates.map(d => d.getTime())));
    const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    dateRange = earliest.getTime() === latest.getTime() ? formatDate(earliest) : `${formatDate(earliest)} – ${formatDate(latest)}`;
  }

  // Calculate category totals
  const categoryMap = new Map<string, number>();
  data.expenses.forEach(exp => {
    categoryMap.set(exp.category, (categoryMap.get(exp.category) || 0) + exp.amount);
  });

  const categoryTotals: CategoryTotal[] = Array.from(categoryMap.entries())
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
    }))
    .sort((a, b) => b.amount - a.amount);

  // ===== HEADER =====
  doc.setFillColor(220, 38, 38); // Red-600
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  // Add logo to header if available - centered with title
  if (logoDataUrl) {
    try {
      const logoSize = 28;
      const logoX = margin;
      const logoY = 6;
      doc.addImage(logoDataUrl, 'PNG', logoX, logoY, logoSize, logoSize);
    } catch (error) {
      console.warn('Could not add logo to PDF:', error);
    }
  }
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  const titleX = logoDataUrl ? margin + 33 : margin;
  doc.text('KTR Financial Tracker', titleX, 16);
  
  doc.setFontSize(13);
  doc.setFont('helvetica', 'normal');
  doc.text('Financial Report', titleX, 26);
  
  // Add currency indicator
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.text('All amounts in Philippine Peso (PHP)', titleX, 33);

  // Reset text color
  doc.setTextColor(0, 0, 0);
  yPos = 50;

  // ===== USER INFO & DATE RANGE =====
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })}`, margin, yPos);
  yPos += 5;
  
  if (userName) {
    doc.text(`Prepared for: ${userName}`, margin, yPos);
    yPos += 5;
  }
  
  doc.text(`Report Period: ${dateRange}`, margin, yPos);
  yPos += 12;

  // ===== EXECUTIVE SUMMARY =====
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Executive Summary', margin, yPos);
  yPos += 8;

  // Summary metrics in a clean box
  doc.setDrawColor(220, 38, 38);
  doc.setLineWidth(0.5);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 50, 3, 3, 'FD');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  
  const col1X = margin + 6;
  const col2X = pageWidth / 2 + 6;
  let boxY = yPos + 10;

  // Column 1
  doc.text('Total Net Income:', col1X, boxY);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129); // Emerald-600
  doc.text(formatCurrencyPHP(totalNetIncome), col1X, boxY + 6);
  boxY += 15;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text('Average Net Income:', col1X, boxY);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(79, 70, 229); // Indigo-600
  doc.text(formatCurrencyPHP(averageNetIncome), col1X, boxY + 6);
  boxY += 10;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(8);
  doc.text(`Based on ${incomeCount} ${incomeCount === 1 ? 'paycheck' : 'paychecks'}`, col1X, boxY + 3);

  // Column 2
  boxY = yPos + 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text('Total Expenses:', col2X, boxY);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(245, 158, 11); // Amber-600
  doc.text(formatCurrencyPHP(totalExpenses), col2X, boxY + 6);
  boxY += 15;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text('Net Balance:', col2X, boxY);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(netBalance >= 0 ? 16 : 220, netBalance >= 0 ? 185 : 38, netBalance >= 0 ? 129 : 38);
  doc.text(formatCurrencyPHP(netBalance), col2X, boxY + 6);
  boxY += 10;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(8);
  doc.text(`${data.expenses.length} ${data.expenses.length === 1 ? 'transaction' : 'transactions'}`, col2X, boxY + 3);

  yPos += 60;

  // ===== INCOME BREAKDOWN =====
  checkNewPage(40);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Income Breakdown', margin, yPos);
  yPos += 5;

  if (data.incomeHistory.length > 0) {
    const incomeTableData = data.incomeHistory
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(income => [
        formatDateString(income.date),
        formatCurrencyPHP(income.weeklySalary),
        formatCurrencyPHP(getDeductionsForEntry(income)),
        formatCurrencyPHP(getNetIncome(income))
      ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Date', 'Gross Salary', 'Total Deductions', 'Net Income']],
      body: incomeTableData,
      theme: 'grid',
      headStyles: { 
        fillColor: [220, 38, 38], 
        textColor: [255, 255, 255], 
        fontStyle: 'bold',
        fontSize: 10,
        halign: 'center'
      },
      styles: { 
        fontSize: 9, 
        cellPadding: 4,
        lineColor: [220, 220, 220],
        lineWidth: 0.1
      },
      columnStyles: {
        0: { cellWidth: 40, halign: 'center' },
        1: { halign: 'right', cellWidth: 45 },
        2: { halign: 'right', cellWidth: 45 },
        3: { halign: 'right', fontStyle: 'bold', cellWidth: 45, textColor: [16, 185, 129] }
      },
      margin: { left: margin, right: margin },
      alternateRowStyles: { fillColor: [250, 250, 250] }
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  } else {
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.setFont('helvetica', 'italic');
    doc.text('No income entries recorded.', margin, yPos + 5);
    yPos += 15;
  }

  // ===== EXPENSE CATEGORY ANALYSIS =====
  checkNewPage(50);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Expense Category Analysis', margin, yPos);
  yPos += 5;

  if (categoryTotals.length > 0) {
    const categoryTableData = categoryTotals.map(cat => [
      cat.category,
      formatCurrencyPHP(cat.amount),
      `${cat.percentage.toFixed(1)}%`
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Category', 'Total Amount', '% of Total']],
      body: categoryTableData,
      theme: 'grid',
      headStyles: { 
        fillColor: [220, 38, 38], 
        textColor: [255, 255, 255], 
        fontStyle: 'bold',
        fontSize: 10,
        halign: 'center'
      },
      styles: { 
        fontSize: 9, 
        cellPadding: 4,
        lineColor: [220, 220, 220],
        lineWidth: 0.1
      },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { halign: 'right', cellWidth: 55, fontStyle: 'bold', textColor: [245, 158, 11] },
        2: { halign: 'center', cellWidth: 35 }
      },
      margin: { left: margin, right: margin },
      alternateRowStyles: { fillColor: [250, 250, 250] }
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  } else {
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.setFont('helvetica', 'italic');
    doc.text('No expenses recorded.', margin, yPos + 5);
    yPos += 15;
  }

  // ===== DETAILED EXPENSE TRANSACTIONS =====
  checkNewPage(50);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Detailed Expense Transactions', margin, yPos);
  yPos += 5;

  if (data.expenses.length > 0) {
    const expenseTableData = data.expenses
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(expense => [
        formatDateString(expense.date),
        expense.category,
        expense.description.substring(0, 40) + (expense.description.length > 40 ? '...' : ''),
        formatCurrencyPHP(expense.amount)
      ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Date', 'Category', 'Description', 'Amount']],
      body: expenseTableData,
      theme: 'grid',
      headStyles: { 
        fillColor: [220, 38, 38], 
        textColor: [255, 255, 255], 
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'center'
      },
      styles: { 
        fontSize: 8, 
        cellPadding: 3,
        lineColor: [220, 220, 220],
        lineWidth: 0.1
      },
      columnStyles: {
        0: { cellWidth: 30, halign: 'center' },
        1: { cellWidth: 32 },
        2: { cellWidth: 85 },
        3: { halign: 'right', cellWidth: 30, fontStyle: 'bold', textColor: [220, 38, 38] }
      },
      margin: { left: margin, right: margin },
      alternateRowStyles: { fillColor: [250, 250, 250] }
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  } else {
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.setFont('helvetica', 'italic');
    doc.text('No expense transactions recorded.', margin, yPos + 5);
    yPos += 15;
  }

  // ===== FOOTER ON ALL PAGES =====
  const pageCount = doc.getNumberOfPages();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Add subtle line above footer
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
    
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
    doc.text(
      'KTR Financial Tracker | Confidential',
      margin,
      pageHeight - 8
    );
    
    // Currency note on right
    doc.text(
      'Currency: PHP',
      pageWidth - margin - 30,
      pageHeight - 8
    );
  }

  // Generate filename with date
  const fileName = `KTR-Financial-Report-${new Date().toISOString().split('T')[0]}.pdf`;
  
  // Download the PDF
  doc.save(fileName);
};
