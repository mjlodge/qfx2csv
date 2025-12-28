import { useState, useCallback } from 'react';
import { FileDropZone } from '@/components/FileDropZone';
import { TransactionTable } from '@/components/TransactionTable';
import { parseQFX, transactionsToCSV, type ParseResult } from '@/lib/qfxParser';
import { Button } from '@/components/ui/button';
import { Download, FileText, RefreshCw, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

const Index = () => {
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileSelect = useCallback((content: string, name: string) => {
    setIsProcessing(true);
    setFileName(name);

    // Small delay for UX
    setTimeout(() => {
      try {
        const result = parseQFX(content);
        setParseResult(result);
        
        if (result.transactions.length === 0) {
          toast.warning('No transactions found in file');
        } else {
          toast.success(`Parsed ${result.transactions.length} transactions`);
        }
      } catch (error) {
        toast.error('Failed to parse QFX file');
        console.error(error);
      } finally {
        setIsProcessing(false);
      }
    }, 300);
  }, []);

  const downloadCSV = useCallback((transactions: typeof parseResult.transactions, suffix: string) => {
    const csv = transactionsToCSV(transactions);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName.replace(/\.(qfx|ofx)$/i, '') + suffix + '.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('CSV downloaded successfully');
  }, [fileName]);

  const buyTypes = ['BUY', 'BUYMF', 'SELL', 'SELLMF', 'BUYSTOCK', 'SELLSTOCK', 'BUYOPT', 'SELLOPT'];
  const dividendTypes = ['INCOME', 'REINVEST', 'DIV', 'DIVIDEND'];

  const tradeTransactions = parseResult?.transactions.filter(t => 
    buyTypes.includes(t.type.toUpperCase())
  ) || [];
  const dividendTransactions = parseResult?.transactions.filter(t => 
    dividendTypes.includes(t.type.toUpperCase())
  ) || [];

  const handleReset = useCallback(() => {
    setParseResult(null);
    setFileName('');
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Ambient glow background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[300px] bg-primary/3 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12 max-w-6xl">
        {/* Header */}
        <header className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">QFX to CSV</span>
            <span className="text-foreground"> Converter</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Transform your Quicken brokerage transaction files into clean, 
            spreadsheet-ready CSV format
          </p>
        </header>

        {/* Main Content */}
        <main className="space-y-8">
          {!parseResult ? (
            <div className="animate-fade-in" style={{ animationDelay: '100ms' }}>
              <FileDropZone 
                onFileSelect={handleFileSelect} 
                isProcessing={isProcessing} 
              />
            </div>
          ) : (
            <div className="space-y-6 animate-fade-in">
              {/* File Info & Actions */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl glass">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{fileName}</p>
                    <p className="text-sm text-muted-foreground">
                      {parseResult.transactions.length} transactions
                      {parseResult.brokerName && ` • ${parseResult.brokerName}`}
                    </p>
                  </div>
                </div>

                <Button variant="outline" size="sm" onClick={handleReset}>
                  <RefreshCw className="w-4 h-4" />
                  New File
                </Button>
              </div>

              {/* Download Buttons */}
              {parseResult.transactions.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {tradeTransactions.length > 0 && (
                    <Button size="sm" onClick={() => downloadCSV(tradeTransactions, '-trades')}>
                      <Download className="w-4 h-4" />
                      Download Trades CSV ({tradeTransactions.length})
                    </Button>
                  )}
                  {dividendTransactions.length > 0 && (
                    <Button size="sm" variant="outline" onClick={() => downloadCSV(dividendTransactions, '-dividends')}>
                      <Download className="w-4 h-4" />
                      Download Dividends CSV ({dividendTransactions.length})
                    </Button>
                  )}
                </div>
              )}

              {/* Transaction Tables */}
              {parseResult.transactions.length > 0 ? (
                <div className="space-y-8">
                  {tradeTransactions.length > 0 && (
                    <TransactionTable 
                      transactions={tradeTransactions} 
                      title={`Buy & Sell Transactions (${tradeTransactions.length})`}
                    />
                  )}
                  {dividendTransactions.length > 0 && (
                    <TransactionTable 
                      transactions={dividendTransactions} 
                      title={`Dividends & Reinvestments (${dividendTransactions.length})`}
                    />
                  )}
                </div>
              ) : (
                <div className="text-center py-16 glass rounded-xl">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No transactions found in file</p>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="mt-16 text-center animate-fade-in" style={{ animationDelay: '200ms' }}>
          <p className="text-sm text-muted-foreground">
            Supports QFX and OFX files from major brokerages
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
