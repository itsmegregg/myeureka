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
    const [error, setError] = useState('');
    const {selectedBranch} = useBranchStore();

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

            setReceipts([response.data.data]);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Receipt not found');
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
                                    <div>
                                        <h3 className="font-semibold mb-2">Receipt Found:</h3>
                                        {receipts.map((receipt: Receipt) => (
                                            <Card key={receipt.id} className="mb-2">
                                                <CardContent className="pt-4">
                                                    <p><strong>SI Number:</strong> {receipt.si_number}</p>
                                                    <p><strong>Branch:</strong> {receipt.branch_name}</p>
                                                    <p><strong>Date:</strong> {receipt.date}</p>
                                                    <p><strong>File Path:</strong> {receipt.file_path}</p>
                                                    <div className="flex gap-2 mt-2">
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm"
                                                            onClick={() => window.open(`/storage/${receipt.file_path}`, '_blank')}
                                                        >
                                                            View Receipt
                                                        </Button>
                                                        <Button 
                                                            variant="secondary" 
                                                            size="sm"
                                                            onClick={async () => {
                                                                try {
                                                                    const response = await fetch(`/storage/${receipt.file_path}`);
                                                                    
                                                                    if (response.ok) {
                                                                        const contentType = response.headers.get('content-type');
                                                                        let fileContent;
                                                                        
                                                                        if (contentType && contentType.includes('text')) {
                                                                            fileContent = await response.text();
                                                                        } else {
                                                                            fileContent = `[File: ${receipt.file_path}]\n\nThis file is not text-based. Use "View Receipt" to open it.`;
                                                                        }
                                                                        
                                                                        const blob = new Blob([fileContent], { type: 'text/plain' });
                                                                        const url = URL.createObjectURL(blob);
                                                                        const a = document.createElement('a');
                                                                        a.href = url;
                                                                        a.download = `receipt-${receipt.si_number}-${receipt.branch_name}-${receipt.type || 'general'}.txt`;
                                                                        document.body.appendChild(a);
                                                                        a.click();
                                                                        document.body.removeChild(a);
                                                                        URL.revokeObjectURL(url);
                                                                    } else {
                                                                        alert('Receipt file not found.');
                                                                    }
                                                                } catch (error) {
                                                                    console.error('Error downloading file:', error);
                                                                    alert('Error downloading receipt file.');
                                                                }
                                                            }}
                                                        >
                                                            Download TXT
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
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
                                <div className="flex items-center gap-3">
                                    <DateRangePickernew />
                                    <Button>Search by Date</Button>
                                </div>
                                <p className="text-sm text-gray-500 mt-4">
                                    Date search functionality coming soon...
                                </p>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>


        </AppLayout>
    );
}