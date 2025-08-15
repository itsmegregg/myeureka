import TextHeader from "@/components/reusable-components/text-header";
import AppLayout from "@/layouts/app-layout";
import { Head } from "@inertiajs/react";
import BranchSelect from "@/components/public-components/branch-select";
import PickerMonth from "@/components/public-components/month-picker";
import { Input } from "@/components/ui/input";
import DateRangePickernew from "@/components/public-components/date-range-picker";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useBranchStore } from "@/store/useBranch";
import axios from 'axios';
import { Eye } from 'lucide-react';
import { FileText } from "lucide-react";
import { useDateRange } from "@/store/useDateRange";
import { format as formatDate } from "date-fns";


interface Receipt {
    id: number;
    si_number: string;
    branch_name: string;
    date: string;
    file_path: string;
    type: string;
    created_at: string;
    updated_at: string;
}

export default function ReceiptsIndex() {
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [siNumber, setSiNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [error, setError] = useState('');
    const {selectedBranch} = useBranchStore();
    const { dateRange } = useDateRange();

    function dedupe(items: Receipt[]): Receipt[] {
        const seen = new Set<string>();
        const out: Receipt[] = [];
        for (const r of items) {
            const key = `${r.id}-${r.file_path}`;
            if (!seen.has(key)) {
                seen.add(key);
                out.push(r);
            }
        }
        return out;
    }

    function viewUrl(path: string) {
        return `/${path}`;
    }

    async function downloadTxt(path: string, filename: string) {
        try {
            const response = await fetch(viewUrl(path));
            if (!response.ok) {
                alert('Receipt file not found.');
                return;
            }
            const contentType = response.headers.get('content-type');
            let fileContent: string;
            if (contentType && contentType.includes('text')) fileContent = await response.text();
            else fileContent = `[File: ${path}]\n\nThis file is not text-based. Use "View Receipt" to open it.`;

            const blob = new Blob([fileContent], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filename}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading file:', error);
            alert('Error downloading receipt file.');
        }
    }

    const searchBySiNumber = async () => {
        if (!siNumber || !selectedBranch?.branch_name) {
            setError('Please enter SI Number and select a Branch');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await axios.post('/api/receipts/search-via-si-number', {
                si_number: siNumber,
                branch_name: selectedBranch.branch_name,
            });

            setReceipts(dedupe(response.data.data));
        } catch (err: any) {
            setError(err.response?.data?.message || 'Receipt not found');
            setReceipts([]);
        } finally {
            setLoading(false);
        }
    };

    async function downloadConsolidated() {
        if (!selectedBranch?.branch_name || !dateRange.from || !dateRange.to) {
            setError('Please select a Branch and a Date Range');
            return;
        }
        setError('');
        setDownloading(true);
        try {
            const from = toYyyyMmDdString(dateRange.from);
            const to = toYyyyMmDdString(dateRange.to);
            const response = await axios.post('/api/receipts/download-consolidated', {
                branch_name: selectedBranch.branch_name,
                from,
                to,
            }, { responseType: 'blob' });

            const contentDisposition = response.headers['content-disposition'] as string | undefined;
            let suggested = `receipts-${selectedBranch.branch_name}-${from}-${to}.txt`;
            if (contentDisposition) {
                const match = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(contentDisposition);
                const filename = decodeURIComponent(match?.[1] || match?.[2] || '');
                if (filename) suggested = filename;
            }

            const url = URL.createObjectURL(new Blob([response.data], { type: 'text/plain' }));
            const a = document.createElement('a');
            a.href = url;
            a.download = suggested;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err: any) {
            console.error('Consolidated download failed', err);
            setError(err.response?.data?.message || 'Unable to download consolidated file');
        } finally {
            setDownloading(false);
        }
    }

    function toYyyyMmDdString(d: Date) {
        return formatDate(d, 'yyyyMMdd');
    }

    const searchByDateRange = async () => {
        if (!selectedBranch?.branch_name || !dateRange.from || !dateRange.to) {
            setError('Please select a Branch and a Date Range');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const from = toYyyyMmDdString(dateRange.from);
            const to = toYyyyMmDdString(dateRange.to);
            const response = await axios.post('/api/receipts/search-by-date-range', {
                branch_name: selectedBranch.branch_name,
                from,
                to,
            });
            setReceipts(dedupe(response.data.data || []));
            if (!response.data.data || response.data.data.length === 0) {
                setError('No receipts found for the selected range.');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Unable to fetch receipts by date');
            setReceipts([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AppLayout>
            <Head title="Receipts" />
            <TextHeader title="Receipts" /> 

            <div>
                <Tabs defaultValue="account">
                    <TabsList>
                        <TabsTrigger value="account">via Sales Invoice Number</TabsTrigger>
                        <TabsTrigger value="date">via Date</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="account">
                        <Card>
                            <CardHeader>
                                <CardTitle>via Sales Invoice Number</CardTitle>
                                <CardDescription>
                                    Search receipt by Sales Invoice Number and Branch.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-6">
                                <div className="flex items-center gap-3">
                                    <div className="flex gap-2 items-center">
                                        <Label htmlFor="si-number">Sales Invoice Number</Label>
                                        <Input 
                                            id="si-number" 
                                            placeholder="Sales Invoice Number"
                                            value={siNumber}
                                            onChange={(e) => setSiNumber(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        <Label htmlFor="branch">Branch</Label>
                                      

                                        <BranchSelect />
                                    </div>
                                    <Button 
                                        onClick={searchBySiNumber}
                                        disabled={loading}
                                    >
                                        {loading ? 'Searching...' : 'Search'}
                                    </Button>
                                </div>

                                {error && (
                                    <div className="text-red-500 text-sm">{error}</div>
                                )}

                                {receipts.length > 0 && (
  <div className="space-y-3">
    <h3 className="font-semibold text-sm text-muted-foreground">Receipt Found</h3>
    {receipts.map((receipt: Receipt) => {
      const baseName = `receipt-${receipt.si_number}-${receipt.branch_name}-${receipt.type || 'general'}`;
      const href = viewUrl(receipt.file_path);
      return (
        <Card key={receipt.id} className="border-muted/50">
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">SI Number</span>
                  <span className="font-medium">{receipt.si_number}</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <span className="text-muted-foreground">Branch</span>
                  <span className="font-medium">{receipt.branch_name}</span>
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium">{receipt.date}</span>
                </div>
                <div className="text-xs text-muted-foreground break-all">{receipt.file_path}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(href, '_blank')}
                >
                  <Eye className="size-4 mr-2" /> View
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => downloadTxt(receipt.file_path, baseName)}
                >
                  TXT <FileText className="size-4 ml-2" />
                </Button>
                {/* PDF download removed as requested */}
               
              </div>
            </div>
          </CardContent>
        </Card>
      );
    })}
  </div>
)}
                            </CardContent>
                        </Card>
                    </TabsContent>
                    
                    <TabsContent value="date">
                        <Card>
                            <CardHeader>
                                <CardTitle>via Date</CardTitle>
                                <CardDescription>
                                    Search receipt by date range.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                    <div className="flex items-center gap-3">
                                        <DateRangePickernew />
                                        <BranchSelect />
                                    </div>
                                    <Button onClick={searchByDateRange} disabled={loading}>
                                        {loading ? 'Searching...' : 'Search by Date'}
                                    </Button>
                                    <Button variant="secondary" onClick={downloadConsolidated} disabled={downloading || !selectedBranch?.branch_name || !dateRange.from || !dateRange.to}>
                                        {downloading ? 'Downloading...' : 'Download Consolidated TXT'}
                                    </Button>
                                </div>
                                {error && (
                                    <div className="text-red-500 text-sm mt-3">{error}</div>
                                )}
                                {receipts.length > 0 && (
                                    <div className="grid grid-cols-4 gap-4 mt-5">
                                        {receipts.map((receipt: Receipt) => {
                                            const baseName = `receipt-${receipt.si_number}-${receipt.branch_name}-${(receipt.type || 'general')}`;
                                            const href = viewUrl(receipt.file_path);
                                            return (
                                                <Card key={receipt.id} className="border-muted/50">
                                                    <CardContent className="pt-4">
                                                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                                            <div className="space-y-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm text-muted-foreground">SI Number</span>
                                                                    <span className="font-medium">{receipt.si_number}</span>
                                                                </div>
                                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                                                                    <span className="text-muted-foreground">Branch</span>
                                                                    <span className="font-medium">{receipt.branch_name}</span>
                                                                    <span className="text-muted-foreground">Date</span>
                                                                    <span className="font-medium">{receipt.date}</span>
                                                                </div>
                                                                <div className="text-xs text-muted-foreground break-all">{receipt.file_path}</div>
                                                            </div>
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <Button variant="outline" size="sm" onClick={() => window.open(href, '_blank')}>
                                                                    <Eye className="size-4 mr-2" /> View
                                                                </Button>
                                                                <Button variant="ghost" size="sm" onClick={() => downloadTxt(receipt.file_path, baseName)}>
                                                                    TXT <FileText className="size-4 ml-2" />
                                                                </Button>
                                                                {/* PDF download removed as requested */}
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>


        </AppLayout>
    );
}