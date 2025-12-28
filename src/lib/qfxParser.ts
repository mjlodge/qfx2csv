export interface Transaction {
  type: string;
  date: string;
  amount: string;
  name: string;
  memo: string;
  fitid: string;
  ticker?: string;
  units?: string;
  unitPrice?: string;
  total?: string;
  action?: string;
}

export interface ParseResult {
  accountId: string;
  accountType: string;
  brokerName: string;
  transactions: Transaction[];
}

function parseOFXDate(dateStr: string): string {
  if (!dateStr || dateStr.length < 8) return dateStr;
  
  // OFX dates are YYYYMMDDHHMMSS format
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  
  return `${year}-${month}-${day}`;
}

function extractTagValue(content: string, tag: string): string {
  // Handle both <TAG>value and <TAG>value</TAG> formats
  const regex = new RegExp(`<${tag}>([^<\\n]+)`, 'i');
  const match = content.match(regex);
  return match ? match[1].trim() : '';
}

function extractBlock(content: string, tag: string): string[] {
  const blocks: string[] = [];
  const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'gi');
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    blocks.push(match[1]);
  }
  
  // Also handle non-closed blocks (common in OFX)
  if (blocks.length === 0) {
    const openRegex = new RegExp(`<${tag}>([\\s\\S]*?)(?=<${tag}>|<\\/${tag}|$)`, 'gi');
    while ((match = openRegex.exec(content)) !== null) {
      blocks.push(match[1]);
    }
  }
  
  return blocks;
}

export function parseQFX(content: string): ParseResult {
  const result: ParseResult = {
    accountId: '',
    accountType: '',
    brokerName: '',
    transactions: [],
  };

  // Extract account info
  result.accountId = extractTagValue(content, 'ACCTID');
  result.brokerName = extractTagValue(content, 'ORG') || extractTagValue(content, 'FI');
  result.accountType = extractTagValue(content, 'ACCTTYPE') || 'INVESTMENT';

  // Parse investment transactions (INVSTMTRS)
  const invTransactions = extractBlock(content, 'INVTRAN');
  const buyStocks = extractBlock(content, 'BUYSTOCK');
  const sellStocks = extractBlock(content, 'SELLSTOCK');
  const buyMFs = extractBlock(content, 'BUYMF');
  const sellMFs = extractBlock(content, 'SELLMF');
  const income = extractBlock(content, 'INCOME');
  const invBanks = extractBlock(content, 'INVBANKTRAN');
  const reinvests = extractBlock(content, 'REINVEST');

  // Process buy transactions
  [...buyStocks, ...buyMFs].forEach((block) => {
    const transaction: Transaction = {
      type: 'BUY',
      date: parseOFXDate(extractTagValue(block, 'DTTRADE') || extractTagValue(block, 'DTPOSTED')),
      amount: extractTagValue(block, 'TOTAL'),
      name: extractTagValue(block, 'SECNAME') || extractTagValue(block, 'NAME'),
      memo: extractTagValue(block, 'MEMO'),
      fitid: extractTagValue(block, 'FITID'),
      ticker: extractTagValue(block, 'TICKER') || extractTagValue(block, 'UNIQUEID'),
      units: extractTagValue(block, 'UNITS'),
      unitPrice: extractTagValue(block, 'UNITPRICE'),
      total: extractTagValue(block, 'TOTAL'),
      action: 'BUY',
    };
    if (transaction.date || transaction.fitid) {
      result.transactions.push(transaction);
    }
  });

  // Process sell transactions
  [...sellStocks, ...sellMFs].forEach((block) => {
    const transaction: Transaction = {
      type: 'SELL',
      date: parseOFXDate(extractTagValue(block, 'DTTRADE') || extractTagValue(block, 'DTPOSTED')),
      amount: extractTagValue(block, 'TOTAL'),
      name: extractTagValue(block, 'SECNAME') || extractTagValue(block, 'NAME'),
      memo: extractTagValue(block, 'MEMO'),
      fitid: extractTagValue(block, 'FITID'),
      ticker: extractTagValue(block, 'TICKER') || extractTagValue(block, 'UNIQUEID'),
      units: extractTagValue(block, 'UNITS'),
      unitPrice: extractTagValue(block, 'UNITPRICE'),
      total: extractTagValue(block, 'TOTAL'),
      action: 'SELL',
    };
    if (transaction.date || transaction.fitid) {
      result.transactions.push(transaction);
    }
  });

  // Process income (dividends, interest)
  income.forEach((block) => {
    const incomeType = extractTagValue(block, 'INCOMETYPE');
    const transaction: Transaction = {
      type: 'INCOME',
      date: parseOFXDate(extractTagValue(block, 'DTTRADE') || extractTagValue(block, 'DTPOSTED')),
      amount: extractTagValue(block, 'TOTAL'),
      name: extractTagValue(block, 'SECNAME') || extractTagValue(block, 'NAME'),
      memo: extractTagValue(block, 'MEMO') || incomeType,
      fitid: extractTagValue(block, 'FITID'),
      ticker: extractTagValue(block, 'TICKER') || extractTagValue(block, 'UNIQUEID'),
      action: incomeType || 'INCOME',
    };
    if (transaction.date || transaction.fitid) {
      result.transactions.push(transaction);
    }
  });

  // Process reinvestments
  reinvests.forEach((block) => {
    const transaction: Transaction = {
      type: 'REINVEST',
      date: parseOFXDate(extractTagValue(block, 'DTTRADE') || extractTagValue(block, 'DTPOSTED')),
      amount: extractTagValue(block, 'TOTAL'),
      name: extractTagValue(block, 'SECNAME') || extractTagValue(block, 'NAME'),
      memo: extractTagValue(block, 'MEMO'),
      fitid: extractTagValue(block, 'FITID'),
      ticker: extractTagValue(block, 'TICKER') || extractTagValue(block, 'UNIQUEID'),
      units: extractTagValue(block, 'UNITS'),
      unitPrice: extractTagValue(block, 'UNITPRICE'),
      total: extractTagValue(block, 'TOTAL'),
      action: 'REINVEST',
    };
    if (transaction.date || transaction.fitid) {
      result.transactions.push(transaction);
    }
  });

  // Process bank transactions within investment account
  invBanks.forEach((block) => {
    const trnType = extractTagValue(block, 'TRNTYPE');
    const transaction: Transaction = {
      type: trnType || 'TRANSFER',
      date: parseOFXDate(extractTagValue(block, 'DTPOSTED')),
      amount: extractTagValue(block, 'TRNAMT'),
      name: extractTagValue(block, 'NAME'),
      memo: extractTagValue(block, 'MEMO'),
      fitid: extractTagValue(block, 'FITID'),
      action: trnType,
    };
    if (transaction.date || transaction.fitid) {
      result.transactions.push(transaction);
    }
  });

  // Parse regular bank transactions (STMTRS) if no investment transactions found
  if (result.transactions.length === 0) {
    const bankTransactions = extractBlock(content, 'STMTTRN');
    bankTransactions.forEach((block) => {
      const transaction: Transaction = {
        type: extractTagValue(block, 'TRNTYPE'),
        date: parseOFXDate(extractTagValue(block, 'DTPOSTED')),
        amount: extractTagValue(block, 'TRNAMT'),
        name: extractTagValue(block, 'NAME'),
        memo: extractTagValue(block, 'MEMO'),
        fitid: extractTagValue(block, 'FITID'),
      };
      if (transaction.date || transaction.fitid) {
        result.transactions.push(transaction);
      }
    });
  }

  // Sort by date
  result.transactions.sort((a, b) => a.date.localeCompare(b.date));

  return result;
}

export function transactionsToCSV(transactions: Transaction[]): string {
  const headers = ['Date', 'Type', 'Action', 'Ticker', 'Name', 'Units', 'Unit Price', 'Amount', 'Memo', 'Transaction ID'];
  
  const rows = transactions.map((t) => [
    t.date,
    t.type,
    t.action || '',
    t.ticker || '',
    `"${(t.name || '').replace(/"/g, '""')}"`,
    t.units || '',
    t.unitPrice || '',
    t.amount || t.total || '',
    `"${(t.memo || '').replace(/"/g, '""')}"`,
    t.fitid,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
