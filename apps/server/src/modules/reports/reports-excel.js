import ExcelJS from 'exceljs';

const COLORS = {
  navy: '123B66',
  blue: '0870BD',
  paleBlue: 'EAF4FC',
  slate: '475569',
  paleSlate: 'F1F5F9',
  white: 'FFFFFF',
  red: 'B91C1C',
};

const PESO_FORMAT = '"₱"#,##0.00;[Red]("₱"#,##0.00);"-"';
const COUNT_FORMAT = '#,##0;[Red](#,##0);-';

export async function buildReportsWorkbook(report, { generatedAt = new Date() } = {}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'DD Auto Spa Management System';
  workbook.company = 'DD Auto Spa';
  workbook.created = generatedAt;
  workbook.modified = generatedAt;
  workbook.calcProperties.fullCalcOnLoad = true;

  addSummarySheet(workbook, report, generatedAt);
  addDailySheet(workbook, report.dailyBreakdown, report.summary);
  addSalesSheet(workbook, 'Service Sales', report.transactions.serviceSales);
  addSalesSheet(workbook, 'Tire Sales', report.transactions.tireSales);
  addSalesSheet(workbook, 'Canteen Sales', report.transactions.canteenSales);
  addPurchasesSheet(workbook, report.purchases);
  addExpensesSheet(workbook, report.expenses);

  workbook.views = [{ activeTab: 0 }];
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function addSummarySheet(workbook, report, generatedAt) {
  const sheet = workbook.addWorksheet('Summary', {
    properties: { tabColor: { argb: COLORS.blue } },
    views: [{ showGridLines: false }],
  });
  sheet.columns = [
    { key: 'label', width: 31 },
    { key: 'value', width: 23 },
    { key: 'note', width: 54 },
  ];

  sheet.mergeCells('A1:C1');
  sheet.getCell('A1').value = 'DD AUTO SPA · 30-DAY BUSINESS REPORT';
  styleTitle(sheet.getCell('A1'));
  sheet.getRow(1).height = 31;

  sheet.getCell('A3').value = 'Reporting period';
  sheet.getCell('B3').value = `${report.period.start} to ${report.period.end}`;
  sheet.getCell('A4').value = 'Generated';
  sheet.getCell('B4').value = generatedAt;
  sheet.getCell('B4').numFmt = 'mmm d, yyyy h:mm AM/PM';
  sheet.getCell('A5').value = 'Activity days';
  sheet.getCell('B5').value = report.activityDayCount;
  for (let row = 3; row <= 5; row += 1) {
    sheet.getCell(row, 1).font = { bold: true, color: { argb: COLORS.slate } };
    sheet.getCell(row, 2).fill = solidFill(COLORS.paleSlate);
    sheet.getCell(row, 2).border = outlineBorder('D7E2EC');
  }

  const totalRow = report.dailyBreakdown.length + 4;
  const metrics = [
    [
      'Combined sales',
      `'Daily Summary'!E${totalRow}`,
      report.summary.totalSalesCentavos,
      'Services + tires + canteen',
    ],
    [
      'Service sales',
      `'Daily Summary'!B${totalRow}`,
      report.summary.serviceSalesCentavos,
      'Carwash and service tickets',
    ],
    [
      'Tire sales',
      `'Daily Summary'!C${totalRow}`,
      report.summary.tireSalesCentavos,
      'Tire product sales only',
    ],
    [
      'Canteen sales',
      `'Daily Summary'!D${totalRow}`,
      report.summary.canteenSalesCentavos,
      'Drinks, snacks, and other products',
    ],
    [
      'Product cost',
      `'Daily Summary'!F${totalRow}`,
      report.summary.productCostCentavos,
      'Cost of tire and canteen items sold',
    ],
    [
      'Outside labor',
      `'Daily Summary'!G${totalRow}`,
      report.summary.externalLaborCentavos,
      'External-contractor service labor',
    ],
    [
      'Operating expenses',
      `'Daily Summary'!H${totalRow}`,
      report.summary.expenseCentavos,
      'Includes finalized payroll and staff meals',
    ],
    [
      'Stock purchases',
      `'Daily Summary'!I${totalRow}`,
      report.summary.purchaseCentavos,
      'Tire and canteen purchases paid',
    ],
    [
      'Estimated gross profit',
      `'Daily Summary'!J${totalRow}`,
      report.summary.estimatedGrossProfitCentavos,
      'Sales less product cost and outside labor',
    ],
    [
      'Estimated net',
      `'Daily Summary'!K${totalRow}`,
      report.summary.estimatedNetCentavos,
      'Gross profit less operating expenses',
    ],
    [
      'Cash movement',
      `'Daily Summary'!L${totalRow}`,
      report.summary.cashMovementCentavos,
      'Sales less purchases, expenses, and outside labor',
    ],
  ];

  sheet.getRow(7).values = ['Key metric', '30-day total', 'Definition'];
  styleHeader(sheet.getRow(7), 3);
  metrics.forEach(([label, formula, resultCentavos, note], index) => {
    const row = 8 + index;
    sheet.getCell(row, 1).value = label;
    sheet.getCell(row, 2).value = { formula, result: centavosToPesos(resultCentavos) };
    sheet.getCell(row, 2).numFmt = PESO_FORMAT;
    sheet.getCell(row, 3).value = note;
    if (['Combined sales', 'Estimated net', 'Cash movement'].includes(label)) {
      styleRange(sheet.getRow(row), 3, {
        fill: solidFill(COLORS.paleBlue),
        font: { bold: true, color: { argb: COLORS.navy } },
      });
    }
  });

  const countStart = 21;
  sheet.getRow(countStart).values = ['Transaction count', 'Total'];
  styleHeader(sheet.getRow(countStart), 3);
  [
    [
      'Service transactions',
      `'Daily Summary'!M${totalRow}`,
      report.summary.serviceTransactionCount,
    ],
    ['Tire transactions', `'Daily Summary'!N${totalRow}`, report.summary.tireTransactionCount],
    [
      'Canteen transactions',
      `'Daily Summary'!O${totalRow}`,
      report.summary.canteenTransactionCount,
    ],
  ].forEach(([label, formula, result], index) => {
    const row = countStart + 1 + index;
    sheet.getCell(row, 1).value = label;
    sheet.getCell(row, 2).value = { formula, result };
    sheet.getCell(row, 2).numFmt = COUNT_FORMAT;
  });

  sheet.getCell('A26').value = 'Important';
  sheet.getCell('A26').font = { bold: true, color: { argb: COLORS.navy } };
  sheet.mergeCells('A27:C28');
  sheet.getCell('A27').value =
    'Voided records remain visible on the detail sheets for audit history, but their values are excluded from the Summary and Daily Summary totals.';
  sheet.getCell('A27').alignment = { vertical: 'top', wrapText: true };
  sheet.getCell('A27').fill = solidFill(COLORS.paleSlate);
  sheet.getCell('A27').border = outlineBorder('CBD5E1');
  sheet.getRow(27).height = 25;
  sheet.getRow(28).height = 25;

  styleBody(sheet, 3, 28, 3);
  sheet.pageSetup = { fitToPage: true, fitToWidth: 1, fitToHeight: 1, orientation: 'portrait' };
  sheet.headerFooter.oddFooter = '&LDD Auto Spa&CPage &P of &N&RConfidential owner report';
}

function addDailySheet(workbook, breakdown, summary) {
  const sheet = workbook.addWorksheet('Daily Summary', {
    properties: { tabColor: { argb: COLORS.navy } },
    views: [{ state: 'frozen', ySplit: 3, showGridLines: false }],
  });
  const columns = [
    ['Date', 14],
    ['Service Sales', 17],
    ['Tire Sales', 17],
    ['Canteen Sales', 17],
    ['Total Sales', 17],
    ['Product Cost', 17],
    ['Outside Labor', 17],
    ['Expenses', 17],
    ['Purchases', 17],
    ['Est. Gross Profit', 19],
    ['Est. Net', 17],
    ['Cash Movement', 18],
    ['Service Txns', 14],
    ['Tire Txns', 12],
    ['Canteen Txns', 15],
  ];
  sheet.columns = columns.map(([header, width]) => ({ header, width }));
  addSheetHeading(
    sheet,
    '30-Day Daily Summary',
    'One row per business date; zero-activity days are retained.',
  );
  sheet.getRow(3).values = columns.map(([header]) => header);
  styleHeader(sheet.getRow(3), columns.length);

  [...breakdown].reverse().forEach((day, index) => {
    const row = sheet.getRow(index + 4);
    row.values = [
      excelDate(day.businessDate),
      centavosToPesos(day.serviceSalesCentavos),
      centavosToPesos(day.tireSalesCentavos),
      centavosToPesos(day.canteenSalesCentavos),
      centavosToPesos(day.totalSalesCentavos),
      centavosToPesos(day.productCostCentavos),
      centavosToPesos(day.externalLaborCentavos),
      centavosToPesos(day.expenseCentavos),
      centavosToPesos(day.purchaseCentavos),
      centavosToPesos(day.estimatedGrossProfitCentavos),
      centavosToPesos(day.estimatedNetCentavos),
      centavosToPesos(day.cashMovementCentavos),
      day.serviceTransactionCount,
      day.tireTransactionCount,
      day.canteenTransactionCount,
    ];
    row.getCell(1).numFmt = 'mmm d, yyyy';
    for (let column = 2; column <= 12; column += 1) row.getCell(column).numFmt = PESO_FORMAT;
    for (let column = 13; column <= 15; column += 1) row.getCell(column).numFmt = COUNT_FORMAT;
    if (!day.hasActivity) row.font = { color: { argb: '94A3B8' } };
  });

  const totalRow = breakdown.length + 4;
  sheet.getCell(totalRow, 1).value = '30-DAY TOTAL';
  const summaryFields = [
    'serviceSalesCentavos',
    'tireSalesCentavos',
    'canteenSalesCentavos',
    'totalSalesCentavos',
    'productCostCentavos',
    'externalLaborCentavos',
    'expenseCentavos',
    'purchaseCentavos',
    'estimatedGrossProfitCentavos',
    'estimatedNetCentavos',
    'cashMovementCentavos',
    'serviceTransactionCount',
    'tireTransactionCount',
    'canteenTransactionCount',
  ];
  for (let column = 2; column <= 15; column += 1) {
    const letter = sheet.getColumn(column).letter;
    const rawResult = summary[summaryFields[column - 2]];
    sheet.getCell(totalRow, column).value = {
      formula: `SUM(${letter}4:${letter}${totalRow - 1})`,
      result: column <= 12 ? centavosToPesos(rawResult) : rawResult,
    };
    sheet.getCell(totalRow, column).numFmt = column <= 12 ? PESO_FORMAT : COUNT_FORMAT;
  }
  styleRange(sheet.getRow(totalRow), columns.length, {
    fill: solidFill(COLORS.navy),
    font: { bold: true, color: { argb: COLORS.white } },
  });
  sheet.autoFilter = { from: 'A3', to: `O${Math.max(3, totalRow - 1)}` };
  styleBody(sheet, 4, totalRow - 1, 15);
  sheet.pageSetup = { fitToPage: true, fitToWidth: 1, fitToHeight: 0, orientation: 'landscape' };
}

function addSalesSheet(workbook, name, transactions) {
  const sheet = workbook.addWorksheet(name, {
    views: [{ state: 'frozen', ySplit: 3, showGridLines: false }],
  });
  const columns = [
    ['Date', 14],
    ['Reference', 14],
    ['Description', 28],
    ['Secondary detail', 22],
    ['Items', 48],
    ['Status', 12],
    ['Sales amount', 17],
    ['Direct cost', 17],
    ['Void reason', 32],
  ];
  sheet.columns = columns.map(([header, width]) => ({ header, width }));
  addSheetHeading(sheet, name, 'Individual records in the selected 30-day period.');
  sheet.getRow(3).values = columns.map(([header]) => header);
  styleHeader(sheet.getRow(3), columns.length);

  transactions.forEach((transaction, index) => {
    const row = sheet.getRow(index + 4);
    row.values = [
      excelDate(transaction.businessDate),
      `#${transaction.sequence}`,
      transaction.description,
      transaction.secondaryDescription || null,
      transaction.items
        .map((item) => `${item.name}${item.quantity ? ` × ${item.quantity}` : ''}`)
        .join(' · '),
      transaction.status,
      centavosToPesos(transaction.totalCentavos),
      centavosToPesos(transaction.costCentavos),
      transaction.voidReason || null,
    ];
    row.getCell(1).numFmt = 'mmm d, yyyy';
    row.getCell(7).numFmt = PESO_FORMAT;
    row.getCell(8).numFmt = PESO_FORMAT;
    row.getCell(5).alignment = { vertical: 'top', wrapText: true };
    row.getCell(9).alignment = { vertical: 'top', wrapText: true };
    if (transaction.status === 'VOIDED') {
      styleRange(row, columns.length, {
        fill: solidFill('FEF2F2'),
        font: { color: { argb: COLORS.red }, italic: true },
      });
    }
  });
  finishDetailSheet(sheet, transactions.length, columns.length);
}

function addPurchasesSheet(workbook, purchases) {
  const sheet = workbook.addWorksheet('Purchases', {
    views: [{ state: 'frozen', ySplit: 3, showGridLines: false }],
  });
  const columns = [
    ['Date', 14],
    ['Source', 13],
    ['Reference', 14],
    ['Items', 52],
    ['Status', 12],
    ['Amount', 17],
  ];
  sheet.columns = columns.map(([header, width]) => ({ header, width }));
  addSheetHeading(sheet, 'Tire and Canteen Purchases', 'Purchase ledgers are the source of truth.');
  sheet.getRow(3).values = columns.map(([header]) => header);
  styleHeader(sheet.getRow(3), columns.length);
  purchases.forEach((purchase, index) => {
    const row = sheet.getRow(index + 4);
    row.values = [
      excelDate(purchase.businessDate),
      purchase.source === 'TIRE' ? 'Tires' : 'Canteen',
      `#${purchase.sequence}`,
      purchase.items
        .map(
          (item) => `${item.name} × ${item.quantity} @ ${formatPesoValue(item.unitCostCentavos)}`,
        )
        .join(' · '),
      purchase.status,
      centavosToPesos(purchase.totalCentavos),
    ];
    row.getCell(1).numFmt = 'mmm d, yyyy';
    row.getCell(4).alignment = { vertical: 'top', wrapText: true };
    row.getCell(6).numFmt = PESO_FORMAT;
    if (purchase.status === 'VOIDED') {
      styleRange(row, columns.length, {
        fill: solidFill('FEF2F2'),
        font: { color: { argb: COLORS.red }, italic: true },
      });
    }
  });
  finishDetailSheet(sheet, purchases.length, columns.length);
}

function addExpensesSheet(workbook, expenses) {
  const sheet = workbook.addWorksheet('Expenses', {
    views: [{ state: 'frozen', ySplit: 3, showGridLines: false }],
  });
  const columns = [
    ['Date', 14],
    ['Category', 24],
    ['Source', 18],
    ['Description', 42],
    ['Status', 12],
    ['Amount', 17],
  ];
  sheet.columns = columns.map(([header, width]) => ({ header, width }));
  addSheetHeading(sheet, 'Operating Expenses', 'Manual and system-generated expense records.');
  sheet.getRow(3).values = columns.map(([header]) => header);
  styleHeader(sheet.getRow(3), columns.length);
  expenses.forEach((expense, index) => {
    const row = sheet.getRow(index + 4);
    row.values = [
      excelDate(expense.businessDate),
      expense.categoryName,
      sourceTypeLabel(expense.sourceType),
      expense.description || null,
      expense.status,
      centavosToPesos(expense.amountCentavos),
    ];
    row.getCell(1).numFmt = 'mmm d, yyyy';
    row.getCell(4).alignment = { vertical: 'top', wrapText: true };
    row.getCell(6).numFmt = PESO_FORMAT;
    if (expense.status === 'VOIDED') {
      styleRange(row, columns.length, {
        fill: solidFill('FEF2F2'),
        font: { color: { argb: COLORS.red }, italic: true },
      });
    }
  });
  finishDetailSheet(sheet, expenses.length, columns.length);
}

function finishDetailSheet(sheet, rowCount, columnCount) {
  const lastDataRow = Math.max(3, rowCount + 3);
  sheet.autoFilter = { from: 'A3', to: sheet.getCell(3, columnCount).address };
  styleBody(sheet, 4, lastDataRow, columnCount);
  sheet.pageSetup = { fitToPage: true, fitToWidth: 1, fitToHeight: 0, orientation: 'landscape' };
}

function addSheetHeading(sheet, title, subtitle) {
  const end = sheet.getColumn(sheet.columnCount).letter;
  sheet.mergeCells(`A1:${end}1`);
  sheet.getCell('A1').value = title;
  styleTitle(sheet.getCell('A1'));
  sheet.mergeCells(`A2:${end}2`);
  sheet.getCell('A2').value = subtitle;
  sheet.getCell('A2').font = { italic: true, color: { argb: COLORS.slate } };
  sheet.getRow(1).height = 29;
  sheet.getRow(2).height = 22;
}

function styleTitle(cell) {
  cell.fill = solidFill(COLORS.navy);
  cell.font = { bold: true, size: 16, color: { argb: COLORS.white } };
  cell.alignment = { vertical: 'middle', horizontal: 'left' };
}

function styleHeader(row, columnCount) {
  row.height = 24;
  styleRange(row, columnCount, {
    fill: solidFill(COLORS.blue),
    font: { bold: true, color: { argb: COLORS.white } },
    alignment: { vertical: 'middle' },
  });
}

function styleBody(sheet, startRow, endRow, columnCount) {
  if (endRow < startRow) return;
  for (let row = startRow; row <= endRow; row += 1) {
    const current = sheet.getRow(row);
    current.height = Math.max(current.height || 15, 21);
    for (let column = 1; column <= columnCount; column += 1) {
      const cell = current.getCell(column);
      cell.alignment = { ...cell.alignment, vertical: 'top' };
      cell.border = {
        bottom: { style: 'hair', color: { argb: 'D7E2EC' } },
      };
    }
  }
}

function styleRange(row, columnCount, style) {
  for (let column = 1; column <= columnCount; column += 1) {
    const cell = row.getCell(column);
    if (style.fill) cell.fill = style.fill;
    if (style.font) cell.font = style.font;
    if (style.alignment) cell.alignment = style.alignment;
  }
}

function solidFill(argb) {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

function outlineBorder(argb) {
  const edge = { style: 'thin', color: { argb } };
  return { top: edge, right: edge, bottom: edge, left: edge };
}

function excelDate(value) {
  return new Date(`${value}T00:00:00.000Z`);
}

function centavosToPesos(value) {
  return value / 100;
}

function formatPesoValue(value) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(
    centavosToPesos(value),
  );
}

function sourceTypeLabel(value) {
  return (
    {
      MANUAL: 'Manual',
      PAYROLL: 'Payroll',
      STAFF_MEAL: 'Staff meal',
      EQUIPMENT_PURCHASE: 'Equipment purchase',
      EQUIPMENT_REPAIR: 'Equipment repair',
    }[value] ?? value
  );
}
