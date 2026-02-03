# PDF Export Feature - Analytics Page

## Overview
The PDF Export feature allows users to download a comprehensive financial tracking report directly from the Analytics page. This feature generates a professional, multi-page PDF document containing all financial data and insights.

## Location
- **Navigation**: Analytics Tab → Export PDF Report Button
- **Button Position**: Top-right corner of the Analytics page, next to the "Visual Insights" heading

## Report Contents

### 1. Executive Summary
- **Total Net Income**: Sum of all net income after deductions
- **Average Net Income**: Average per paycheck
- **Total Expenses**: Sum of all recorded expenses
- **Net Balance**: Income minus expenses (with color-coded status)
- **Report Period**: Date range of all financial data
- **Transaction Counts**: Number of paychecks and expense transactions

### 2. Income Breakdown
A detailed table showing all income entries:
- Date
- Gross Salary
- Total Deductions (SSS, Pag-IBIG, PhilHealth, VUL, Emergency Fund, General Savings)
- Net Income

Sorted by date (most recent first)

### 3. Expense Category Analysis
Summary of expenses grouped by category:
- Category name
- Total amount spent per category
- Percentage of total expenses

Sorted by amount (highest to lowest)

### 4. Detailed Expense Transactions
Complete list of all expense transactions:
- Date
- Category
- Description
- Amount

Sorted by date (most recent first)

## Features

### Design & Branding
- **Clean, Modern Layout**: Simplified professional design with enhanced readability
- **Brand Colors**: KTR Financial Tracker red branding throughout
- **Logo Integration**: KTR logo prominently displayed in the header (28x28px, left-aligned with title)
- **Multi-page Support**: Automatically paginates for large datasets
- **Enhanced Footer**: 
  - Page numbers centered
  - Confidential marking on left
  - Currency indicator (PHP ₱) on right
  - Subtle separator line above footer

### User Information
- Generated timestamp with full date and time
- User name (from profile)
- Date range of data
- Currency disclaimer in header

### Smart Formatting
- **Philippine Peso (PHP) Currency**: 
  - Consistent PHP currency display throughout
  - Format: PHP #,###.## (e.g., PHP 25,000.00)
  - Clear currency indicator in header: "All amounts in Philippine Peso (PHP)"
  - Footer reminder: "Currency: PHP"
  - Removed redundant "(PHP)" labels from table headers for cleaner look
- **Enhanced Typography**:
  - Larger, bold amounts in executive summary (14pt)
  - Color-coded values for easy scanning
  - Clear section headings
- **Improved Tables**:
  - Grid theme with subtle borders
  - Alternating row colors for better readability
  - Right-aligned amounts with appropriate colors
  - Centered column headers
- Date formatting in readable format
- Automatic table pagination
- Color-coded values:
  - Green for net income
  - Amber/Orange for expenses
  - Green/Red for positive/negative balances

### Error Handling
- Disabled when no data available
- Loading state during generation
- Error messages for failed exports

## Technical Details

### Libraries Used
- **jsPDF**: PDF generation
- **jspdf-autotable**: Table formatting
- **Custom Utilities**: Currency and date formatting from existing codebase

### File Naming
Downloads with format: `KTR-Financial-Report-YYYY-MM-DD.pdf`

### Performance
- Generates PDF client-side (no server required)
- Fast generation even with large datasets
- No data sent to external servers (privacy maintained)

## Usage Instructions

1. Navigate to the **Analytics** tab
2. Ensure you have at least some income or expense data
3. Click the **"Export PDF Report"** button in the top-right corner
4. Wait for the "Generating PDF..." message
5. The PDF will automatically download to your browser's download folder
6. Open the PDF to view your comprehensive financial report

## Button States

### Active (Enabled)
- Appears with red background
- Shows Download and FileText icons
- Clickable and ready to generate PDF

### Loading
- Shows spinning animation
- Text changes to "Generating PDF..."
- Temporarily disabled during generation

### Disabled
- Grayed out appearance
- Happens when no income or expense data exists
- Tooltip explains the button is disabled

## Privacy & Security
- All PDF generation happens locally in your browser
- No data is sent to external services
- PDFs are generated on-demand and not stored on servers
- User data remains confidential

## Future Enhancements (Potential)
- Date range filtering
- Custom report templates
- Chart/graph inclusion
- Email export option
- Custom branding options

---

**Version**: 1.0  
**Last Updated**: February 3, 2026  
**Created By**: KTR Financial Tracker Development Team
