import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FinancialData } from '../types';
import {
  getNetIncome,
  formatDateString,
  getDeductionsForEntry,
  isSavingsCategory,
  getSavingsBreakdown,
} from './utils';

interface CategoryTotal {
  category: string;
  amount: number;
  percentage: number;
}

/** Point-in-time net-worth inputs. Optional — the report still renders without them. */
export interface NetWorthSnapshot {
  wallet: number;
  debit: number;
  custom: { name: string; balance: number; liquidity: 'liquid' | 'nonliquid' }[];
}

// ---------------------------------------------------------------------------
// Modern-minimal palette — near-black ink, one indigo accent, muted greys and
// hairline rules. No heavy fills; hierarchy comes from weight and whitespace.
// ---------------------------------------------------------------------------
const INK: [number, number, number] = [24, 24, 27];       // zinc-900
const MUTED: [number, number, number] = [113, 113, 122];  // zinc-500
const FAINT: [number, number, number] = [161, 161, 170];  // zinc-400
const RULE: [number, number, number] = [228, 228, 231];   // zinc-200
const ACCENT: [number, number, number] = [79, 70, 229];   // indigo-600
const POSITIVE: [number, number, number] = [22, 163, 74]; // green-600
const NEGATIVE: [number, number, number] = [220, 38, 38]; // red-600

// Custom currency formatter for Philippine Pesos with PHP symbol
const formatCurrencyPHP = (amount: number): string => {
  const formatted = new Intl.NumberFormat('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
  const sign = amount < 0 ? '-' : '';
  return `${sign}PHP ${formatted}`;
};

export const generateFinancialReportPDF = async (
  data: FinancialData,
  userName?: string,
  netWorth?: NetWorthSnapshot,
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentW = pageWidth - 2 * margin;
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

  // ---- small drawing helpers, all in the minimal style --------------------
  const setColor = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);

  const checkNewPage = (requiredSpace = 24) => {
    if (yPos + requiredSpace > pageHeight - 22) {
      doc.addPage();
      yPos = 22;
      return true;
    }
    return false;
  };

  // Section heading: small indigo eyebrow tick + bold ink title + hairline rule.
  const sectionHeading = (title: string) => {
    checkNewPage(28);
    doc.setFillColor(ACCENT[0], ACCENT[1], ACCENT[2]);
    doc.rect(margin, yPos - 3.2, 2.4, 4.2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12.5);
    setColor(INK);
    doc.text(title, margin + 5, yPos);
    yPos += 3;
    doc.setDrawColor(RULE[0], RULE[1], RULE[2]);
    doc.setLineWidth(0.3);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 7;
  };

  const emptyNote = (msg: string) => {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9.5);
    setColor(FAINT);
    doc.text(msg, margin, yPos + 4);
    yPos += 14;
  };

  // ===== METRICS ===========================================================
  const totalNetIncome = data.incomeHistory.reduce((sum, inc) => sum + getNetIncome(inc), 0);
  const totalExpenses = data.expenses
    .filter((exp) => !isSavingsCategory(exp.category))
    .reduce((sum, exp) => sum + exp.amount, 0);
  const netBalance = totalNetIncome - totalExpenses;
  const incomeCount = data.incomeHistory.length || 1;
  const averageNetIncome = totalNetIncome / incomeCount;
  const savingsRate = totalNetIncome > 0 ? (netBalance / totalNetIncome) * 100 : 0;

  // Date range
  const allDates: Date[] = [];
  data.incomeHistory.forEach((inc) => {
    const [y, m, d] = inc.date.split('-').map(Number);
    allDates.push(new Date(y, m - 1, d));
  });
  data.expenses.forEach((exp) => {
    const [y, m, d] = exp.date.split('-').map(Number);
    allDates.push(new Date(y, m - 1, d));
  });

  let dateRange = 'No data';
  if (allDates.length > 0) {
    const earliest = new Date(Math.min(...allDates.map((d) => d.getTime())));
    const latest = new Date(Math.max(...allDates.map((d) => d.getTime())));
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    dateRange = earliest.getTime() === latest.getTime() ? fmt(earliest) : `${fmt(earliest)} - ${fmt(latest)}`;
  }

  // Category totals
  const categoryMap = new Map<string, number>();
  data.expenses
    .filter((exp) => !isSavingsCategory(exp.category))
    .forEach((exp) => {
      categoryMap.set(exp.category, (categoryMap.get(exp.category) || 0) + exp.amount);
    });
  const categoryTotals: CategoryTotal[] = Array.from(categoryMap.entries())
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // ===== HEADER (clean, on white; thin accent rule) ========================
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', margin, yPos - 6, 16, 16);
    } catch (error) {
      console.warn('Could not add logo to PDF:', error);
    }
  }
  const titleX = logoDataUrl ? margin + 21 : margin;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19);
  setColor(INK);
  doc.text('Fintech', titleX, yPos);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  setColor(MUTED);
  doc.text('Financial Report', titleX, yPos + 6.5);
  yPos += 14;

  // Accent rule under the header
  doc.setFillColor(ACCENT[0], ACCENT[1], ACCENT[2]);
  doc.rect(margin, yPos, contentW, 0.8, 'F');
  yPos += 7;

  // Meta line: period · generated · prepared-for, in muted grey
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.6);
  setColor(MUTED);
  const generated = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  const metaLeft = `Period: ${dateRange}`;
  const metaRight = `Generated ${generated}${userName ? `  •  Prepared for ${userName}` : ''}`;
  doc.text(metaLeft, margin, yPos);
  doc.text('All amounts in Philippine Peso (PHP)', margin, yPos + 4.5);
  doc.text(metaRight, pageWidth - margin, yPos, { align: 'right' });
  yPos += 14;

  // ===== KPI ROW (four hairline cells) =====================================
  const kpis: { label: string; value: string; color: [number, number, number]; sub?: string }[] = [
    { label: 'NET INCOME', value: formatCurrencyPHP(totalNetIncome), color: INK, sub: `${incomeCount} ${incomeCount === 1 ? 'paycheck' : 'paychecks'}` },
    { label: 'EXPENSES', value: formatCurrencyPHP(totalExpenses), color: INK, sub: `${data.expenses.length} ${data.expenses.length === 1 ? 'txn' : 'txns'}` },
    { label: 'NET BALANCE', value: formatCurrencyPHP(netBalance), color: netBalance >= 0 ? POSITIVE : NEGATIVE, sub: `${savingsRate >= 0 ? '+' : ''}${savingsRate.toFixed(0)}% of income` },
    { label: 'AVG / PAYCHECK', value: formatCurrencyPHP(averageNetIncome), color: INK, sub: 'net' },
  ];

  const gap = 4;
  const cellW = (contentW - gap * (kpis.length - 1)) / kpis.length;
  const cellH = 24;
  kpis.forEach((kpi, i) => {
    const x = margin + i * (cellW + gap);
    doc.setDrawColor(RULE[0], RULE[1], RULE[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, yPos, cellW, cellH, 1.6, 1.6, 'S');
    // top accent tick
    doc.setFillColor(ACCENT[0], ACCENT[1], ACCENT[2]);
    doc.rect(x + 4, yPos + 4.6, 5, 0.8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.6);
    setColor(FAINT);
    doc.text(kpi.label, x + 4, yPos + 9.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    setColor(kpi.color);
    doc.text(kpi.value, x + 4, yPos + 15.5);
    if (kpi.sub) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.6);
      setColor(MUTED);
      doc.text(kpi.sub, x + 4, yPos + 20.5);
    }
  });
  yPos += cellH + 14;

  // Shared table styling — minimal: plain theme, thin bottom rules, ink header.
  const tableBase = {
    theme: 'plain' as const,
    headStyles: {
      fillColor: [255, 255, 255] as [number, number, number],
      textColor: FAINT,
      fontStyle: 'bold' as const,
      fontSize: 7.4,
      cellPadding: { top: 1, bottom: 3, left: 2, right: 2 },
      lineColor: INK,
      lineWidth: { bottom: 0.4 } as any,
    },
    styles: {
      fontSize: 8.6,
      cellPadding: { top: 3, bottom: 3, left: 2, right: 2 },
      lineColor: RULE,
      lineWidth: { bottom: 0.2 } as any,
      textColor: INK,
    },
    margin: { left: margin, right: margin },
  };

  // ===== NET WORTH (point-in-time, labeled "as of today") ==================
  if (netWorth) {
    const savings = getSavingsBreakdown(data.incomeHistory, data.expenses);
    const customTotal = netWorth.custom.reduce((s, c) => s + c.balance, 0);
    const customNonLiquid = netWorth.custom
      .filter((c) => c.liquidity === 'nonliquid')
      .reduce((s, c) => s + c.balance, 0);
    const savingsTotal = savings.total + customTotal;
    const nw = netWorth.wallet + netWorth.debit + savingsTotal;
    const nonLiquid = savings.pagibigMP2 + customNonLiquid;
    const liquid = nw - nonLiquid;
    const liquidPct = nw > 0 ? Math.round((liquid / nw) * 100) : 0;

    sectionHeading('Net Worth');
    // "as of today" clarifier — balances are point-in-time, not period-scoped.
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    setColor(FAINT);
    doc.text(`Balances as of ${new Date().toLocaleDateString('en-US', { dateStyle: 'medium' })} (not affected by the report period)`, margin, yPos);
    yPos += 8;

    // Headline net-worth figure + liquid/non-liquid split
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    setColor(FAINT);
    doc.text('TOTAL NET WORTH', margin, yPos);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    setColor(INK);
    doc.text(formatCurrencyPHP(nw), margin, yPos + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.4);
    setColor(MUTED);
    doc.text(
      `${liquidPct}% liquid  ${formatCurrencyPHP(liquid)}      ${100 - liquidPct}% non-liquid  ${formatCurrencyPHP(nonLiquid)}`,
      margin,
      yPos + 14,
    );
    yPos += 22;

    // Breakdown table — every pot + custom cards
    const nwRows: (string | { content: string; styles?: any })[][] = [
      ['Wallet (cash)', 'Liquid', formatCurrencyPHP(netWorth.wallet)],
      ['Debit Card', 'Liquid', formatCurrencyPHP(netWorth.debit)],
      ['Emergency Fund', 'Liquid', formatCurrencyPHP(savings.emergencyFund)],
      ['General Savings', 'Liquid', formatCurrencyPHP(savings.generalSavings)],
      ['Pag-IBIG MP2', 'Non-liquid', formatCurrencyPHP(savings.pagibigMP2)],
    ];
    if (savings.other > 0) nwRows.push(['Other Savings', 'Liquid', formatCurrencyPHP(savings.other)]);
    netWorth.custom.forEach((c) =>
      nwRows.push([c.name, c.liquidity === 'nonliquid' ? 'Non-liquid' : 'Liquid', formatCurrencyPHP(c.balance)]),
    );

    autoTable(doc, {
      ...tableBase,
      startY: yPos,
      head: [['Account', 'Liquidity', 'Balance']],
      body: nwRows as any,
      foot: [['Total', '', formatCurrencyPHP(nw)]],
      footStyles: {
        fontStyle: 'bold',
        fontSize: 9,
        textColor: INK,
        fillColor: [250, 250, 251],
        cellPadding: { top: 3, bottom: 3, left: 2, right: 2 },
        lineColor: INK,
        lineWidth: { top: 0.4 } as any,
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 34, textColor: MUTED, fontSize: 8 },
        2: { halign: 'right', cellWidth: 45, fontStyle: 'bold' },
      },
    });
    yPos = (doc as any).lastAutoTable.finalY + 12;
  }

  // ===== INCOME BREAKDOWN ==================================================
  sectionHeading('Income Breakdown');
  if (data.incomeHistory.length > 0) {
    const incomeTableData = data.incomeHistory
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((income) => [
        formatDateString(income.date),
        formatCurrencyPHP(income.weeklySalary),
        formatCurrencyPHP(getDeductionsForEntry(income)),
        formatCurrencyPHP(getNetIncome(income)),
      ]);

    autoTable(doc, {
      ...tableBase,
      startY: yPos,
      head: [['Date', 'Gross Salary', 'Deductions', 'Net Income']],
      body: incomeTableData,
      columnStyles: {
        0: { cellWidth: 42 },
        1: { halign: 'right', cellWidth: 'auto' },
        2: { halign: 'right', cellWidth: 'auto' },
        3: { halign: 'right', fontStyle: 'bold', cellWidth: 'auto', textColor: POSITIVE },
      },
    });
    yPos = (doc as any).lastAutoTable.finalY + 12;
  } else {
    emptyNote('No income entries recorded for this period.');
  }

  // ===== EXPENSE CATEGORY ANALYSIS ========================================
  sectionHeading('Expense Category Analysis');
  if (categoryTotals.length > 0) {
    // A slim proportion bar rendered inside the % column via a custom hook.
    const categoryTableData = categoryTotals.map((cat) => [
      cat.category,
      formatCurrencyPHP(cat.amount),
      `${cat.percentage.toFixed(1)}%`,
    ]);

    autoTable(doc, {
      ...tableBase,
      startY: yPos,
      head: [['Category', 'Amount', 'Share']],
      body: categoryTableData,
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { halign: 'right', cellWidth: 50, fontStyle: 'bold' },
        2: { halign: 'right', cellWidth: 40, textColor: MUTED },
      },
      // Draw a faint indigo proportion bar behind the Share cell.
      didParseCell: (hook) => {
        if (hook.section === 'body' && hook.column.index === 2) {
          (hook.cell as any)._pct = categoryTotals[hook.row.index]?.percentage ?? 0;
        }
      },
      didDrawCell: (hook) => {
        if (hook.section === 'body' && hook.column.index === 2) {
          const pct = (hook.cell as any)._pct ?? 0;
          const barMax = hook.cell.width - 4;
          const barW = Math.max(0.5, (pct / 100) * barMax);
          doc.setFillColor(ACCENT[0], ACCENT[1], ACCENT[2]);
          // thin bar hugging the bottom of the cell
          doc.rect(hook.cell.x + 2, hook.cell.y + hook.cell.height - 1.6, barW, 0.8, 'F');
        }
      },
    });
    yPos = (doc as any).lastAutoTable.finalY + 12;
  } else {
    emptyNote('No expenses recorded for this period.');
  }

  // ===== DETAILED EXPENSE TRANSACTIONS ====================================
  sectionHeading('Detailed Expense Transactions');
  if (data.expenses.length > 0) {
    const expenseTableData = data.expenses
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((expense) => [
        formatDateString(expense.date),
        expense.category,
        expense.description.substring(0, 42) + (expense.description.length > 42 ? '…' : ''),
        formatCurrencyPHP(expense.amount),
      ]);

    autoTable(doc, {
      ...tableBase,
      startY: yPos,
      head: [['Date', 'Category', 'Description', 'Amount']],
      body: expenseTableData,
      styles: { ...tableBase.styles, fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 34, textColor: MUTED },
        2: { cellWidth: 'auto' },
        3: { halign: 'right', cellWidth: 32, fontStyle: 'bold' },
      },
    });
    yPos = (doc as any).lastAutoTable.finalY + 12;
  } else {
    emptyNote('No expense transactions recorded for this period.');
  }

  // ===== FOOTER (thin rule, muted, page numbers) ===========================
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(RULE[0], RULE[1], RULE[2]);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.6);
    setColor(FAINT);
    doc.text('Fintech  •  Confidential', margin, pageHeight - 8.5);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 8.5, { align: 'center' });
    doc.text('PHP', pageWidth - margin, pageHeight - 8.5, { align: 'right' });
  }

  const fileName = `Fintech-Financial-Report-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};
