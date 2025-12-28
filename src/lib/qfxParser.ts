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
  cusip?: string;
}

export interface SecurityInfo {
  uniqueId: string;
  uniqueIdType: string;
  name: string;
  ticker: string;
}

export interface ParseResult {
  accountId: string;
  accountType: string;
  brokerName: string;
  transactions: Transaction[];
  securities: Map<string, SecurityInfo>;
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

function parseSecurityList(content: string): Map<string, SecurityInfo> {
  const securities = new Map<string, SecurityInfo>();
  
  // Extract SECLIST section
  const secListMatch = content.match(/<SECLIST>([\s\S]*?)(<\/SECLIST>|$)/i);
  if (!secListMatch) return securities;
  
  const secListContent = secListMatch[1];
  
  // Find all security info blocks (STOCKINFO, MFINFO, DEBTINFO, OPTINFO, OTHERINFO)
  const secInfoBlocks = [
    ...extractBlock(secListContent, 'STOCKINFO'),
    ...extractBlock(secListContent, 'MFINFO'),
    ...extractBlock(secListContent, 'DEBTINFO'),
    ...extractBlock(secListContent, 'OPTINFO'),
    ...extractBlock(secListContent, 'OTHERINFO'),
  ];
  
  // Also try to find SECINFO directly (some files structure differently)
  const secInfoDirect = extractBlock(secListContent, 'SECINFO');
  
  const allSecBlocks = [...secInfoBlocks, ...secInfoDirect];
  
  // If no structured blocks found, try parsing the raw content
  if (allSecBlocks.length === 0) {
    // Try to find SECID blocks and their associated SECNAME
    const secIdPattern = /<SECID>([\s\S]*?)(?=<SECID>|<\/SECLIST>|$)/gi;
    let secMatch;
    while ((secMatch = secIdPattern.exec(secListContent)) !== null) {
      const block = secMatch[1];
      const uniqueId = extractTagValue(block, 'UNIQUEID');
      const uniqueIdType = extractTagValue(block, 'UNIQUEIDTYPE') || 'CUSIP';
      const name = extractTagValue(block, 'SECNAME');
      const ticker = extractTagValue(block, 'TICKER');
      
      if (uniqueId) {
        securities.set(uniqueId, {
          uniqueId,
          uniqueIdType,
          name: name || ticker || uniqueId,
          ticker: ticker || '',
        });
      }
    }
  }
  
  for (const block of allSecBlocks) {
    const uniqueId = extractTagValue(block, 'UNIQUEID');
    const uniqueIdType = extractTagValue(block, 'UNIQUEIDTYPE') || 'CUSIP';
    const name = extractTagValue(block, 'SECNAME');
    const ticker = extractTagValue(block, 'TICKER');
    
    if (uniqueId) {
      securities.set(uniqueId, {
        uniqueId,
        uniqueIdType,
        name: name || ticker || uniqueId,
        ticker: ticker || '',
      });
    }
  }
  
  return securities;
}

function getSecurityName(securities: Map<string, SecurityInfo>, uniqueId: string | undefined, fallbackName: string): string {
  if (!uniqueId) return fallbackName;
  const security = securities.get(uniqueId);
  if (security) {
    return security.name || security.ticker || fallbackName;
  }
  return fallbackName || uniqueId;
}

function getSecurityTicker(securities: Map<string, SecurityInfo>, uniqueId: string | undefined, fallbackTicker: string): string {
  if (!uniqueId) return fallbackTicker;
  const security = securities.get(uniqueId);
  if (security && security.ticker) {
    return security.ticker;
  }
  return fallbackTicker;
}

export function parseQFX(content: string): ParseResult {
  // First, parse the security list to build CUSIP -> name mapping
  const securities = parseSecurityList(content);
  
  const result: ParseResult = {
    accountId: '',
    accountType: '',
    brokerName: '',
    transactions: [],
    securities,
  };

  // Extract account info
  result.accountId = extractTagValue(content, 'ACCTID');
  result.brokerName = extractTagValue(content, 'ORG') || extractTagValue(content, 'FI');
  result.accountType = extractTagValue(content, 'ACCTTYPE') || 'INVESTMENT';

  // Parse investment transactions (INVSTMTRS)
  const buyStocks = extractBlock(content, 'BUYSTOCK');
  const sellStocks = extractBlock(content, 'SELLSTOCK');
  const buyMFs = extractBlock(content, 'BUYMF');
  const sellMFs = extractBlock(content, 'SELLMF');
  const income = extractBlock(content, 'INCOME');
  const invBanks = extractBlock(content, 'INVBANKTRAN');
  const reinvests = extractBlock(content, 'REINVEST');

  // Process buy transactions
  [...buyStocks, ...buyMFs].forEach((block) => {
    const cusip = extractTagValue(block, 'UNIQUEID');
    const transaction: Transaction = {
      type: 'BUY',
      date: parseOFXDate(extractTagValue(block, 'DTTRADE') || extractTagValue(block, 'DTPOSTED')),
      amount: extractTagValue(block, 'TOTAL'),
      name: getSecurityName(securities, cusip, extractTagValue(block, 'SECNAME') || extractTagValue(block, 'NAME')),
      memo: extractTagValue(block, 'MEMO'),
      fitid: extractTagValue(block, 'FITID'),
      ticker: getSecurityTicker(securities, cusip, extractTagValue(block, 'TICKER')),
      cusip,
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
    const cusip = extractTagValue(block, 'UNIQUEID');
    const transaction: Transaction = {
      type: 'SELL',
      date: parseOFXDate(extractTagValue(block, 'DTTRADE') || extractTagValue(block, 'DTPOSTED')),
      amount: extractTagValue(block, 'TOTAL'),
      name: getSecurityName(securities, cusip, extractTagValue(block, 'SECNAME') || extractTagValue(block, 'NAME')),
      memo: extractTagValue(block, 'MEMO'),
      fitid: extractTagValue(block, 'FITID'),
      ticker: getSecurityTicker(securities, cusip, extractTagValue(block, 'TICKER')),
      cusip,
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
    const cusip = extractTagValue(block, 'UNIQUEID');
    const transaction: Transaction = {
      type: 'INCOME',
      date: parseOFXDate(extractTagValue(block, 'DTTRADE') || extractTagValue(block, 'DTPOSTED')),
      amount: extractTagValue(block, 'TOTAL'),
      name: getSecurityName(securities, cusip, extractTagValue(block, 'SECNAME') || extractTagValue(block, 'NAME')),
      memo: extractTagValue(block, 'MEMO') || incomeType,
      fitid: extractTagValue(block, 'FITID'),
      ticker: getSecurityTicker(securities, cusip, extractTagValue(block, 'TICKER')),
      cusip,
      action: incomeType || 'INCOME',
    };
    if (transaction.date || transaction.fitid) {
      result.transactions.push(transaction);
    }
  });

  // Process reinvestments
  reinvests.forEach((block) => {
    const cusip = extractTagValue(block, 'UNIQUEID');
    const transaction: Transaction = {
      type: 'REINVEST',
      date: parseOFXDate(extractTagValue(block, 'DTTRADE') || extractTagValue(block, 'DTPOSTED')),
      amount: extractTagValue(block, 'TOTAL'),
      name: getSecurityName(securities, cusip, extractTagValue(block, 'SECNAME') || extractTagValue(block, 'NAME')),
      memo: extractTagValue(block, 'MEMO'),
      fitid: extractTagValue(block, 'FITID'),
      ticker: getSecurityTicker(securities, cusip, extractTagValue(block, 'TICKER')),
      cusip,
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
  const headers = ['Date', 'Type', 'Action', 'CUSIP', 'Ticker', 'Name', 'Units', 'Unit Price', 'Amount', 'Memo', 'Transaction ID'];
  
  const rows = transactions.map((t) => [
    t.date,
    t.type,
    t.action || '',
    t.cusip || '',
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
