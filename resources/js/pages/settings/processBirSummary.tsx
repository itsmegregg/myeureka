import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/settings/layout";
import { Head } from "@inertiajs/react";
import BranchSelect from "@/components/public-components/branch-select";
import StoreSelect from "@/components/public-components/store-select";
import TerminalSelect from "@/components/public-components/terminal-select";
import DateRangePickernew from "@/components/public-components/date-range-picker";
import { useBranchStore } from "@/store/useBranch";
import { useStore } from "@/store/useStore";
import { useTerminalStore } from "@/store/useTerminal";
import { useDateRange } from "@/store/useDateRange";
import { useState } from "react";
import axios from "axios";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { TextArea as Textarea } from "@/components/ui/textfield";
import { Loader2, Play } from "lucide-react";
import { toast } from "sonner";

interface CommandResponse {
    success: boolean;
    message: string;
    data?: {
        exit_code: number;
        output: string;
        options: Record<string, unknown>;
    };
}

export default function ProcessBirSummary() {
    const { selectedBranch } = useBranchStore();
    const { selectedStore } = useStore();
    const { selectedTerminal } = useTerminalStore();
    const { dateRange } = useDateRange();

    const [forceRun, setForceRun] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [customFrom, setCustomFrom] = useState<string>("");
    const [customTo, setCustomTo] = useState<string>("");
    const [commandOutput, setCommandOutput] = useState<string>("");

    const resolveDate = (fallback?: Date | null) => {
        if (!fallback) {
            return undefined;
        }

        return format(fallback, "yyyy-MM-dd");
    };

    const handleProcess = async () => {
        if (!dateRange.from && !customFrom) {
            toast("Missing start date", {
                description: "Select a range or provide a from date.",
                duration: 4000,
            });
            return;
        }

        if (!dateRange.to && !customTo) {
            toast("Missing end date", {
                description: "Select a range or provide a to date.",
                duration: 4000,
            });
            return;
        }

        try {
            setIsProcessing(true);
            setCommandOutput("");

            const payload = {
                branch_name: selectedBranch?.branch_name ?? "ALL",
                store_name: selectedStore ?? "ALL",
                terminal_number: selectedTerminal ?? "ALL",
                from_date: customFrom || resolveDate(dateRange.from) || "",
                to_date: customTo || resolveDate(dateRange.to) || "",
                force: forceRun,
            };

            const { data } = await axios.post<CommandResponse>(
                "/api/settings/bir-summary/process",
                payload
            );

            setCommandOutput(data.data?.output ?? "");

            if (data.success) {
                toast("Aggregation completed", {
                    description: data.message,
                });
            } else {
                toast("Aggregation failed", {
                    description: data.message,
                });
            }
        } catch (error) {
            console.error("Failed to process BIR summary:", error);
            toast("Unexpected error", {
                description: "Unable to process BIR summary. Check logs for details.",
                duration: 5000,
            });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <AppLayout>
            <Head title="Settings - Process BIR Summary" />
            <SettingsLayout>
                <div className="flex flex-col gap-6 p-6">
                    <div>
                        <h1 className="text-2xl font-semibold">Process BIR Summary</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Run the `bir:aggregate-daily` command for the selected range and filters.
                        </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Branch</Label>
                            <BranchSelect />
                        </div>
                        <div className="space-y-2">
                            <Label>Store</Label>
                            <StoreSelect />
                        </div>
                        <div className="space-y-2">
                            <Label>Terminal</Label>
                            <TerminalSelect />
                        </div>
                        <div className="space-y-2">
                            <Label>Date Range</Label>
                            <DateRangePickernew />
                        </div>
                    </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="customFrom">Override From Date (YYYY-MM-DD)</Label>
                                <Input
                                    id="customFrom"
                                    value={customFrom}
                                    onChange={(event) => setCustomFrom(event.target.value)}
                                    placeholder={resolveDate(dateRange.from) ?? "YYYY-MM-DD"}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="customTo">Override To Date (YYYY-MM-DD)</Label>
                                <Input
                                    id="customTo"
                                    value={customTo}
                                    onChange={(event) => setCustomTo(event.target.value)}
                                    placeholder={resolveDate(dateRange.to) ?? "YYYY-MM-DD"}
                                />
                            </div>
                        </div>

                    <div className="flex items-center gap-3">
                        <Switch id="forceRun" checked={forceRun} onCheckedChange={setForceRun} />
                        <div className="space-y-1">
                            <Label htmlFor="forceRun">Force re-aggregation</Label>
                            <p className="text-sm text-muted-foreground">
                                Enable to rebuild metrics even when existing records are present within the range.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            onClick={handleProcess}
                            disabled={isProcessing}
                            className="flex items-center gap-2"
                        >
                            {isProcessing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Play className="h-4 w-4" />
                            )}
                            {isProcessing ? "Processing..." : "Run Aggregation"}
                        </Button>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="commandOutput">Command output</Label>
                        <Textarea
                            id="commandOutput"
                            value={commandOutput}
                            readOnly
                            rows={10}
                            className="font-mono text-sm"
                            placeholder="Command logs will appear here after execution."
                        />
                    </div>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}