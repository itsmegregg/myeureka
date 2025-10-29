import { Fragment, useMemo, useState } from "react";
import axios from "axios";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { IconFileTypePdf, IconFileTypeXls } from "@tabler/icons-react";
import BranchSelect from "@/components/public-components/branch-select";
import DateRangePickernew from "@/components/public-components/date-range-picker";
import TerminalSelect from "@/components/public-components/terminal-select";
import TextHeader from "@/components/reusable-components/text-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AppLayout from "@/layouts/app-layout";
import { useBranchStore } from "@/store/useBranch";
import { useDateRange } from "@/store/useDateRange";
import { useStore } from "@/store/useStore";
import { useTerminalStore } from "@/store/useTerminal";
import { Head } from "@inertiajs/react";
import { Loader2, Search } from "lucide-react";

type PromoLine = {
    transaction_date: string;
    branch_name: string;
    store_name: string;
    terminal_number: string;
    si_number: string;
    line_no: number;
    product_code: string;
    description: string | null;
    combo_header: string | null;
    qty: number;
    unit_price: number;
    amount: number;
};

type PromoSummary = {
    si_number: string;
    combo_header: string | null;
    description: string | null;
    total_qty: number;
    total_amount: number;
};

type PromoGroup = {
    siNumber: string;
    transactionDate: string | null;
    branchName: string;
    storeName: string;
    terminalNumber: string;
    lines: PromoLine[];
};

export default function Promo() {
    const { selectedBranch } = useBranchStore();
    const { dateRange } = useDateRange();
    const { selectedStore } = useStore();
    const { selectedTerminal } = useTerminalStore();

    const [promoLines, setPromoLines] = useState<PromoLine[]>([]);
    const [promoSummaries, setPromoSummaries] = useState<PromoSummary[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isExportingPdf, setIsExportingPdf] = useState(false);
    const [isExportingExcel, setIsExportingExcel] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const currencyFormatter = useMemo(
        () =>
            new Intl.NumberFormat("en-PH", {
                style: "currency",
                currency: "PHP",
                minimumFractionDigits: 2,
            }),
        []
    );

    const formatDateParam = (value: Date | string | null | undefined): string | undefined => {
        if (!value) {
            return undefined;
        }

        if (value instanceof Date) {
            return format(value, "yyyy-MM-dd");
        }

        return value;
    };

    const handleSearch = async () => {
        if (!dateRange.from || !dateRange.to) {
            setError("Please select a valid date range.");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const params = {
                branch_name: selectedBranch?.branch_name ?? "ALL",
                store_name: selectedStore ?? "ALL",
                terminal_number: selectedTerminal ?? "ALL",
                from_date: formatDateParam(dateRange.from),
                to_date: formatDateParam(dateRange.to),
            };

            const { data } = await axios.get("/api/item-sales/promos", { params });

            const lines: PromoLine[] = data?.data?.lines ?? [];
            const summaries: PromoSummary[] = data?.data?.summaries ?? [];

            setPromoLines(lines);
            setPromoSummaries(summaries);
        } catch (fetchError) {
            console.error("Failed to fetch promo details", fetchError);
            setPromoLines([]);
            setPromoSummaries([]);
            setError("Unable to fetch promo details. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const summaryMap = useMemo(() => {
        return promoSummaries.reduce<Record<string, PromoSummary>>((acc, summary) => {
            const key = `${summary.si_number}|${summary.combo_header ?? ""}`;
            acc[key] = summary;
            return acc;
        }, {});
    }, [promoSummaries]);

    const groupedPromos = useMemo<PromoGroup[]>(() => {
        const groups = new Map<string, PromoGroup>();

        promoLines.forEach((line) => {
            const existing = groups.get(line.si_number);
            if (existing) {
                existing.lines.push(line);
                return;
            }

            groups.set(line.si_number, {
                siNumber: line.si_number,
                transactionDate: line.transaction_date ?? null,
                branchName: line.branch_name,
                storeName: line.store_name,
                terminalNumber: line.terminal_number,
                lines: [line],
            });
        });

        return Array.from(groups.values()).map((group) => ({
            ...group,
            lines: [...group.lines].sort((a, b) => a.line_no - b.line_no),
        }));
    }, [promoLines]);

    const summariesBySi = useMemo(() => {
        return promoSummaries.reduce<Record<string, Record<string, PromoSummary>>>((acc, summary) => {
            const siKey = summary.si_number;
            const comboKey = summary.combo_header ?? "";
            if (!acc[siKey]) {
                acc[siKey] = {};
            }
            acc[siKey][comboKey] = summary;
            return acc;
        }, {});
    }, [promoSummaries]);

    const formatDisplayDate = (value: string | null): string => {
        if (!value) {
            return "—";
        }

        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            return value;
        }

        return format(parsed, "MMM dd, yyyy");
    };

    const reportDateRangeLabel = useMemo(() => {
        if (!dateRange.from || !dateRange.to) {
            return "";
        }

        return `${format(dateRange.from, "yyyy-MM-dd")} - ${format(dateRange.to, "yyyy-MM-dd")}`;
    }, [dateRange.from, dateRange.to]);

    const resolveSummaryTotals = (group: PromoGroup, summary: PromoSummary) => {
        let summaryQty = summary.total_qty ?? 0;
        let summaryAmount = summary.total_amount ?? 0;

        const relatedLines = group.lines.filter((candidate) => {
            const comboHeader = candidate.combo_header ?? "";

            if (candidate.si_number !== summary.si_number) {
                return false;
            }

            if (comboHeader === summary.combo_header) {
                return true;
            }

            if (!comboHeader && candidate.product_code === summary.combo_header) {
                return true;
            }

            return false;
        });

        if (relatedLines.length > 0) {
            const aggregate = relatedLines.reduce(
                (acc, candidate) => {
                    return {
                        qty: acc.qty + candidate.qty,
                        amount: acc.amount + candidate.amount,
                    };
                },
                { qty: 0, amount: 0 }
            );

            if (aggregate.qty > 0) {
                summaryQty = aggregate.qty;
            }

            if (aggregate.amount > 0) {
                summaryAmount = aggregate.amount;
            }
        }

        return { qty: summaryQty, amount: summaryAmount };
    };

    const buildExportRows = () => {
        return groupedPromos.flatMap((group) => {
            const lineRows = group.lines.map((line) => ({
                si_number: group.siNumber,
                product_code: line.product_code,
                description: line.description ?? "",
                qty: line.qty,
                unit_price: line.unit_price,
                amount: line.amount,
                type: "Line",
            }));

            const summaryRows = Object.values(summariesBySi[group.siNumber] ?? {}).map((summary) => {
                const totals = resolveSummaryTotals(group, summary);

                return {
                    si_number: summary.si_number,
                    product_code: summary.combo_header ?? "",
                    description: `${totals.qty} ${summary.description ?? "Promo"}`,
                    qty: totals.qty,
                    unit_price: 0,
                    amount: totals.amount,
                    type: "Summary",
                };
            });

            return [...lineRows, ...summaryRows];
        });
    };

    const handleExportToExcel = () => {
        if (groupedPromos.length === 0) {
            return;
        }

        try {
            setIsExportingExcel(true);

            const rows = buildExportRows();
            if (rows.length === 0) {
                return;
            }

            const worksheetData = rows.map((row) => ({
                "SI #": row.si_number,
                Product: row.product_code,
                Description: row.type === "Summary" ? `${row.description} (Summary)` : row.description,
                Qty: row.qty,
                "Unit Price": row.unit_price,
                Amount: row.amount,
                Type: row.type,
            }));

            const worksheet = XLSX.utils.json_to_sheet(worksheetData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Promo Report");

            const fileSuffix = reportDateRangeLabel ? ` ${reportDateRangeLabel}` : ` ${format(new Date(), "yyyy-MM-dd")}`;
            XLSX.writeFile(workbook, `Promo Report${fileSuffix}.xlsx`);
        } finally {
            setIsExportingExcel(false);
        }
    };

    const handleExportToPdf = () => {
        if (groupedPromos.length === 0) {
            return;
        }

        try {
            setIsExportingPdf(true);

            const rows = buildExportRows();
            if (rows.length === 0) {
                return;
            }

            const doc = new jsPDF();
            const title = "Promo Report";
            doc.setFontSize(14);
            doc.text(title, 14, 15);

            if (reportDateRangeLabel) {
                doc.setFontSize(11);
                doc.text(`Date Range: ${reportDateRangeLabel}`, 14, 22);
            }

            doc.setFontSize(10);
            doc.text(`Generated: ${format(new Date(), "yyyy-MM-dd HH:mm")}`, 14, reportDateRangeLabel ? 29 : 22);

            const tableData = rows.map((row) => [
                row.si_number,
                row.product_code,
                row.type === "Summary" ? `${row.description} (Summary)` : row.description,
                row.qty,
                currencyFormatter.format(row.unit_price || 0),
                currencyFormatter.format(row.amount || 0),
            ]);

            autoTable(doc, {
                startY: reportDateRangeLabel ? 33 : 26,
                head: [["SI#", "Product", "Description", "Qty", "Unit Price", "Amount"]],
                body: tableData,
                styles: {
                    fontSize: 8,
                },
            });

            const fileSuffix = reportDateRangeLabel ? ` ${reportDateRangeLabel}` : ` ${format(new Date(), "yyyy-MM-dd")}`;
            doc.save(`Promo Report${fileSuffix}.pdf`);
        } finally {
            setIsExportingPdf(false);
        }
    };

    return (
        <AppLayout>
            <Head title="Promo" />
            <div className="flex flex-col">
                <div className="@container/main flex flex-1 flex-col gap-2">
                    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                        <div className="px-4 lg:px-6">
                            <div className="flex flex-col gap-4 max-w-full overflow-hidden">
                                <TextHeader title="Promo" />
                               
                                        <div className="flex flex-col gap-4">
                                            <div className="flex flex-wrap items-end gap-2">
                                                <BranchSelect />
                                             
                                                <TerminalSelect />
                                                <DateRangePickernew />
                                                <Button onClick={handleSearch} disabled={isLoading}>
                                                    {isLoading ? (
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Search className="mr-2 h-4 w-4" />
                                                    )}
                                                    Search
                                                </Button>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="outline"
                                                        onClick={handleExportToExcel}
                                                        disabled={isLoading || isExportingExcel || groupedPromos.length === 0}
                                                        className="flex items-center gap-2"
                                                    >
                                                        {isExportingExcel ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <IconFileTypeXls className="h-4 w-4" />
                                                        )}
                                                        {isExportingExcel ? "Exporting..." : "Excel"}
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        onClick={handleExportToPdf}
                                                        disabled={isLoading || isExportingPdf || groupedPromos.length === 0}
                                                        className="flex items-center gap-2"
                                                    >
                                                        {isExportingPdf ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <IconFileTypePdf className="h-4 w-4" />
                                                        )}
                                                        {isExportingPdf ? "Exporting..." : "PDF"}
                                                    </Button>
                                                </div>
                                            </div>
                                            {error && (
                                                <p className="text-sm text-destructive">{error}</p>
                                            )}
                                        </div>
                         

                                <div className="flex flex-col gap-4">
                                    {groupedPromos.length === 0 ? (
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="text-base font-semibold">Promo Details</CardTitle>
                                            </CardHeader>
                                            <CardContent className="py-10 text-center text-sm text-muted-foreground">
                                                {isLoading ? "Loading promo details..." : "No promo data. Run a search to view results."}
                                            </CardContent>
                                        </Card>
                                    ) : (
                                        groupedPromos.map((group) => {
                                            const summaryLookup = summariesBySi[group.siNumber] ?? {};

                                            return (
                                                <Card key={group.siNumber}>
                                                    <CardHeader className="gap-1">
                                                        <CardTitle className="text-base font-semibold">SI# {group.siNumber}</CardTitle>
                                                        <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                                                            <span>Date: {formatDisplayDate(group.transactionDate)}</span>
                                                            <span>Terminal: {group.terminalNumber}</span>
                                                            <span>Branch: {group.branchName}</span>
                                                            <span>Store: {group.storeName}</span>
                                                        </div>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <ScrollArea className="max-h-[320px]">
                                                            <Table>
                                                                <TableHeader>
                                                                    <TableRow>
                                                                        <TableHead className="w-[140px]">PRODUCT</TableHead>
                                                                        <TableHead>DESCRIPTION</TableHead>
                                                                        <TableHead className="w-[80px] text-right">QTY</TableHead>
                                                                        <TableHead className="w-[140px] text-right">UNIT PRICE</TableHead>
                                                                        <TableHead className="w-[140px] text-right">AMOUNT</TableHead>
                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {group.lines.map((line, index) => {
                                                                        const summaryKey = line.combo_header ?? "";
                                                                        const summary = summaryMap[`${line.si_number}|${summaryKey}`] ?? summaryLookup[summaryKey];
                                                                        const isLastOfCombo =
                                                                            summary &&
                                                                            (index === group.lines.length - 1 || group.lines[index + 1].combo_header !== line.combo_header);

                                                                        let summaryQty = summary?.total_qty ?? 0;
                                                                        let summaryAmount = summary?.total_amount ?? 0;

                                                                        if (summary) {
                                                                            const relatedLines = group.lines.filter((candidate) => {
                                                                                if (candidate.line_no === line.line_no && candidate.si_number === line.si_number) {
                                                                                    return false;
                                                                                }

                                                                                const comboHeader = candidate.combo_header ?? "";

                                                                                if (comboHeader === summary.combo_header) {
                                                                                    return true;
                                                                                }

                                                                                if (!comboHeader && candidate.product_code === summary.combo_header) {
                                                                                    return true;
                                                                                }

                                                                                return false;
                                                                            });

                                                                            const aggregate = relatedLines.reduce(
                                                                                (acc, candidate) => {
                                                                                    return {
                                                                                        qty: acc.qty + candidate.qty,
                                                                                        amount: acc.amount + candidate.amount,
                                                                                    };
                                                                                },
                                                                                { qty: 0, amount: 0 }
                                                                            );

                                                                            if (aggregate.qty > 0) {
                                                                                summaryQty = aggregate.qty;
                                                                            }

                                                                            if (aggregate.amount > 0) {
                                                                                summaryAmount = aggregate.amount;
                                                                            }
                                                                        }

                                                                        return (
                                                                            <Fragment key={`${line.si_number}-${line.line_no}`}>
                                                                                <TableRow>
                                                                                    <TableCell className="font-mono">{line.product_code}</TableCell>
                                                                                    <TableCell>{line.description ?? ""}</TableCell>
                                                                                    <TableCell className="text-right">{line.qty}</TableCell>
                                                                                    <TableCell className="text-right">{currencyFormatter.format(line.unit_price || 0)}</TableCell>
                                                                                    <TableCell className="text-right">{currencyFormatter.format(line.amount || 0)}</TableCell>
                                                                                </TableRow>
                                                                                {summary && isLastOfCombo && (
                                                                                    <TableRow className="bg-muted/30">
                                                                                        <TableCell colSpan={2} className="pl-12 text-sm italic text-muted-foreground">
                                                                                            {summaryQty} {summary.description ?? "Promo"}
                                                                                        </TableCell>
                                                                                        <TableCell className="text-right font-medium">{summaryQty}</TableCell>
                                                                                        <TableCell></TableCell>
                                                                                        <TableCell className="text-right font-semibold">{currencyFormatter.format(summaryAmount || 0)}</TableCell>
                                                                                    </TableRow>
                                                                                )}
                                                                            </Fragment>
                                                                        );
                                                                    })}
                                                                </TableBody>
                                                            </Table>
                                                        </ScrollArea>
                                                    </CardContent>
                                                </Card>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
