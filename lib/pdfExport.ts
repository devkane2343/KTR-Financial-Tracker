import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FinancialData, IncomeEntry, Expense, Category } from '../types';
import { getNetIncome, formatDateString, getDeductionsForEntry } from './utils';

interface CategoryTotal {
  category: string;
  amount: number;
  percentage: number;
}

// Custom currency formatter for Philippine Pesos
const formatCurrencyPHP = (amount: number): string => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2
  }).format(amount);
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
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  // Add logo to header if available
  if (logoDataUrl) {
    try {
      const logoSize = 22;
      const logoX = pageWidth - margin - logoSize - 5;
      const logoY = 6;
      doc.addImage(logoDataUrl, 'PNG', logoX, logoY, logoSize, logoSize);
    } catch (error) {
      console.warn('Could not add logo to PDF:', error);
    }
  }
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('KTR - Financial Tracker', margin, 15);
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'normal');
  doc.text('Comprehensive Financial Report', margin, 25);

  // Reset text color
  doc.setTextColor(0, 0, 0);
  yPos = 45;

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

  // Summary metrics in a box
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 45, 2, 2, 'FD');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  
  const col1X = margin + 5;
  const col2X = pageWidth / 2 + 5;
  let boxY = yPos + 8;

  // Column 1
  doc.text('Total Net Income (PHP):', col1X, boxY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(16, 185, 129); // Emerald-600
  doc.text(formatCurrencyPHP(totalNetIncome), col1X + 50, boxY);
  boxY += 7;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('Average Net Income (PHP):', col1X, boxY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(79, 70, 229); // Indigo-600
  doc.text(formatCurrencyPHP(averageNetIncome), col1X + 50, boxY);
  boxY += 7;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9);
  doc.text(`Based on ${incomeCount} ${incomeCount === 1 ? 'paycheck' : 'paychecks'}`, col1X, boxY);

  // Column 2
  boxY = yPos + 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('Total Expenses (PHP):', col2X, boxY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(245, 158, 11); // Amber-600
  doc.text(formatCurrencyPHP(totalExpenses), col2X + 48, boxY);
  boxY += 7;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('Net Balance (PHP):', col2X, boxY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(netBalance >= 0 ? 37 : 220, netBalance >= 0 ? 99 : 38, netBalance >= 0 ? 235 : 38);
  doc.text(formatCurrencyPHP(netBalance), col2X + 48, boxY);
  boxY += 7;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9);
  doc.text(`${data.expenses.length} ${data.expenses.length === 1 ? 'transaction' : 'transactions'}`, col2X, boxY);

  yPos += 55;

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
      head: [['Date', 'Gross Salary (PHP)', 'Total Deductions (PHP)', 'Net Income (PHP)']],
      body: incomeTableData,
      theme: 'striped',
      headStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right', fontStyle: 'bold' }
      },
      margin: { left: margin, right: margin }
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
      head: [['Category', 'Total Amount (PHP)', '% of Total']],
      body: categoryTableData,
      theme: 'striped',
      headStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { halign: 'right', cellWidth: 50 },
        2: { halign: 'center', cellWidth: 30 }
      },
      margin: { left: margin, right: margin }
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
      head: [['Date', 'Category', 'Description', 'Amount (PHP)']],
      body: expenseTableData,
      theme: 'striped',
      headStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2.5 },
      columnStyles: {
        0: { cellWidth: 32 },
        1: { cellWidth: 35 },
        2: { cellWidth: 80 },
        3: { halign: 'right', cellWidth: 30, fontStyle: 'bold' }
      },
      margin: { left: margin, right: margin }
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  } else {
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.setFont('helvetica', 'italic');
    doc.text('No expense transactions recorded.', margin, yPos + 5);
    yPos += 15;
  }

  // ===== FOOTER ON LAST PAGE =====
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
    doc.text(
      'KTR - Financial Tracker | Confidential',
      margin,
      doc.internal.pageSize.getHeight() - 10
    );
  }

  // Generate filename with date
  const fileName = `KTR-Financial-Report-${new Date().toISOString().split('T')[0]}.pdf`;
  
  // Download the PDF
  doc.save(fileName);
};
