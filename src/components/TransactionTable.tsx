import { Transaction } from '@/lib/qfxParser';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight, RefreshCw, DollarSign } from 'lucide-react';

interface TransactionTableProps {
  transactions: Transaction[];
}

function getTransactionIcon(type: string) {
  const normalizedType = type.toUpperCase();
  if (normalizedType === 'BUY' || normalizedType === 'BUYMF') {
    return <ArrowDownRight className="w-4 h-4 text-success" />;
  }
  if (normalizedType === 'SELL' || normalizedType === 'SELLMF') {
    return <ArrowUpRight className="w-4 h-4 text-warning" />;
  }
  if (normalizedType === 'REINVEST') {
    return <RefreshCw className="w-4 h-4 text-primary" />;
  }
  return <DollarSign className="w-4 h-4 text-muted-foreground" />;
}

function formatAmount(amount: string | undefined): string {
  if (!amount) return '—';
  const num = parseFloat(amount);
  if (isNaN(num)) return amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(num);
}

function formatUnits(units: string | undefined): string {
  if (!units) return '—';
  const num = parseFloat(units);
  if (isNaN(num)) return units;
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

export function TransactionTable({ transactions }: TransactionTableProps) {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-border glass">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="w-12"></TableHead>
              <TableHead className="font-semibold text-foreground">Date</TableHead>
              <TableHead className="font-semibold text-foreground">Type</TableHead>
              <TableHead className="font-semibold text-foreground">Ticker</TableHead>
              <TableHead className="font-semibold text-foreground">Name</TableHead>
              <TableHead className="font-semibold text-foreground text-right">Units</TableHead>
              <TableHead className="font-semibold text-foreground text-right">Price</TableHead>
              <TableHead className="font-semibold text-foreground text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction, index) => (
              <TableRow
                key={transaction.fitid || index}
                className={cn(
                  'border-border transition-colors',
                  'hover:bg-secondary/50',
                  'animate-fade-in'
                )}
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <TableCell className="pl-4">
                  {getTransactionIcon(transaction.type)}
                </TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground">
                  {transaction.date}
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      'inline-flex px-2 py-0.5 rounded-md text-xs font-medium',
                      transaction.type.toUpperCase() === 'BUY' && 'bg-success/20 text-success',
                      transaction.type.toUpperCase() === 'SELL' && 'bg-warning/20 text-warning',
                      transaction.type.toUpperCase() === 'REINVEST' && 'bg-primary/20 text-primary',
                      transaction.type.toUpperCase() === 'INCOME' && 'bg-primary/20 text-primary',
                      !['BUY', 'SELL', 'REINVEST', 'INCOME'].includes(transaction.type.toUpperCase()) &&
                        'bg-secondary text-secondary-foreground'
                    )}
                  >
                    {transaction.action || transaction.type}
                  </span>
                </TableCell>
                <TableCell className="font-mono text-sm font-medium text-primary">
                  {transaction.ticker || '—'}
                </TableCell>
                <TableCell className="max-w-[200px] truncate" title={transaction.name}>
                  {transaction.name || '—'}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatUnits(transaction.units)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {transaction.unitPrice ? formatAmount(transaction.unitPrice) : '—'}
                </TableCell>
                <TableCell
                  className={cn(
                    'text-right font-mono text-sm font-medium',
                    parseFloat(transaction.amount || '0') >= 0 ? 'text-success' : 'text-warning'
                  )}
                >
                  {formatAmount(transaction.amount || transaction.total)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
