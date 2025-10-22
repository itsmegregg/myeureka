import TextHeader from "@/components/reusable-components/text-header";
import AppLayout from "@/layouts/app-layout";
import { Head } from "@inertiajs/react";
import BranchSelect from "@/components/public-components/branch-select";
import DateRangePickernew from "@/components/public-components/date-range-picker";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useBranchStore } from "@/store/useBranch";
import { useDateRange } from "@/store/useDateRange";
import axios from "axios";
import { Eye, FileText, File as FileIcon, Search, Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format as formatDateFns } from "date-fns";
import { useStore } from "@/store/useStore";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface ZreadItem {
  id: number;
  date: string; // YYYY-MM-DD
  branch_name: string;
  file_path: string;
  file_content: string;
  file_name: string;
  mime_type: string;
  created_at: string;
  updated_at: string;
}

interface ZReadSummary {
  branch_count: number;
  branch_count_that_have_a_date_result_of_zread: number;
  branches_without_data: string[];
}

async function downloadPdf(item: ZreadItem, filename: string) {
  try {
    const text = item.file_content;
    if (!text) {
      alert("File content not available.");
      return;
    }

    // Dynamically import jsPDF to avoid bundling if unused
    let jsPDF: any;
    try {
      ({ jsPDF } = await import("jspdf"));
    } catch (e) {
      console.error("jsPDF not installed", e);
      alert("PDF generation requires 'jspdf'. Please install: npm i jspdf");
      return;
    }

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40;
    const maxWidth = pageWidth - margin * 2;
    const lineHeight = 14;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    const lines = doc.splitTextToSize(text.replace(/\r\n/g, "\n"), maxWidth);
    let y = margin;
    for (const line of lines) {
      if (y + lineHeight > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += lineHeight;
    }

    doc.save(`${filename}.pdf`);
  } catch (error) {
    console.error("Error generating PDF:", error);
    alert("Error generating PDF.");
  }
}

function toYyyyDashMmDashDd(d: Date) {
  return formatDateFns(d, "yyyy-MM-dd");
}

// No longer needed as we store content in the database
// function viewUrl(path: string) {
//   return `/${path}`; // served from public/
// }

async function downloadTxt(item: ZreadItem) {
  try {
    const blob = new Blob([item.file_content], { type: item.mime_type || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = item.file_name || `zread-${item.branch_name}-${item.date}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading file:', error);
    alert('Error downloading zread file.');
  }
}

export default function ZreadIndex() {
  const [zreads, setZreads] = useState<ZreadItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<ZReadSummary | null>(null);
  const { dateRange: selectedDateRange } = useDateRange();
  const { dateRange } = useDateRange();


      const { selectedBranch } = useBranchStore();
 
      const { selectedStore } = useStore();

  // Viewer Dialog state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerIsText, setViewerIsText] = useState(true);
  const [viewerText, setViewerText] = useState("");
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerTitle, setViewerTitle] = useState<string | null>(null);

  async function openViewer(item: ZreadItem) {
    setViewerTitle(`Z-Read: ${item.branch_name} — ${item.date}`);
    setViewerOpen(true);
    setViewerLoading(false);
    setViewerText(item.file_content || "No content available");
    setViewerUrl(null);
  }

  const searchByDateRange = async () => {
    setLoading(true);
    setError("");
    setSummary(null); // Reset summary on new search
    setZreads([]);
    try {
      // Format dates to YYYY-MM-DD with proper type safety
      const formatDateParam = (value: Date | string | null | undefined): string => {
        if (!value) {
          return formatDateFns(new Date(), "yyyy-MM-dd");
        }

        if (typeof value === "string") {
          return value;
        }

        return formatDateFns(value, "yyyy-MM-dd");
      };
      
      const params = {
        branch_name: selectedBranch?.branch_name ?? 'ALL',
        from_date: formatDateParam(selectedDateRange.from),
        to_date: formatDateParam(selectedDateRange.to ?? new Date()),
        store_name: selectedStore ?? 'ALL',
      };

      console.log('[ZREAD] Request params:', params);
      const response = await axios.get("/api/zreadDateRange", { params });

      const items: ZreadItem[] = response.data?.data || [];
      setZreads(items);
      if (response.data.branches_without_data) {
        setSummary({
          branch_count: response.data.branch_count,
          branch_count_that_have_a_date_result_of_zread: response.data.branch_count_that_have_a_date_result_of_zread,
          branches_without_data: response.data.branches_without_data,
        });
      } else {
        setSummary(null);
      }
      setError("");
      if (!items.length) setError("No zreads found for the selected range.");
    } catch (err: any) {
      console.error("Zread search error", err);
      setError(err.response?.data?.message || "Unable to fetch zreads by date");
      setZreads([]);
      setSummary(null); // Also reset summary on error
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <Head title="Z-Reads" />
      <div className="flex flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6">
              <div className="flex flex-col gap-4 max-w-full overflow-hidden">
                <TextHeader title="Z-Read" />
                <div className="flex flex-col md:flex-col lg:flex-row md:justify-between lg:justify-between gap-4">
                  <div className="flex flex-wrap items-end gap-2">
                    <BranchSelect />
                    <DateRangePickernew />
                    <Button onClick={searchByDateRange} disabled={loading}>
                      <Search className="mr-2 h-4 w-4" />
                      {loading ? "Searching..." : "Search"}
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                   {summary && summary.branches_without_data.length > 0 && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="icon" className="relative mx-2">
                          <Info />
                          <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 shrink-0 items-center justify-center rounded-full p-1 text-xs">
                            {summary.branches_without_data.length}
                          </Badge>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                        <div className="grid gap-4">
                          <div className="space-y-2">
                            <h4 className="font-medium leading-none">Missing Z-Reads</h4>
                            <p className="text-sm text-muted-foreground">
                              {summary.branches_without_data.length} branch(es) have not submitted a Z-read for the selected date.
                            </p>
                          </div>
                          <div className="grid gap-2 max-h-48 overflow-y-auto">
                            {summary.branches_without_data.map((branch, index) => (
                              <div key={index} className="text-sm font-mono p-2 bg-muted rounded-md">
                                {branch}
                              </div>
                            ))}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                  </div>
                </div>

                {error && <div className="text-red-500 text-sm">{error}</div>}

                <div className="rounded-md overflow-hidden">
                  {zreads.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {zreads.map((z) => {
                        const baseName = `zread-${z.branch_name}-${z.date}`;
                        return (
                          <div key={z.id} className="border rounded-md p-4 bg-background">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                                  <span className="text-muted-foreground">Branch</span>
                                  <span className="font-medium">{z.branch_name}</span>
                                  <span className="text-muted-foreground">Date</span>
                                  <span className="font-medium">{z.date}</span>
                                </div>
                                <div className="text-xs text-muted-foreground break-all">{z.file_name || 'No file name available'}</div>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => openViewer(z)}>
                                  <Eye className="size-4 mr-2" /> View
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => downloadTxt(z)}>
                                  TXT <FileText className="size-4 ml-2" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => downloadPdf(z, baseName)}>
                                  PDF <FileIcon className="size-4 ml-2" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground py-6">No results yet. Choose a branch and date range, then search.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Viewer Dialog */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{viewerTitle || "Z-Read Viewer"}</DialogTitle>
            <DialogDescription>Preview of the z-read file.</DialogDescription>
          </DialogHeader>
          <div className="min-h-40 max-h-[70vh] overflow-auto border rounded-md bg-muted/10">
            {viewerLoading && (
              <div className="p-4 text-sm text-muted-foreground">Loading...</div>
            )}
            {!viewerLoading && viewerIsText && (
              <pre className="p-4 text-xs whitespace-pre-wrap break-words">{viewerText}</pre>
            )}
            {!viewerLoading && !viewerIsText && viewerUrl && (
              <iframe src={viewerUrl ?? undefined} title="Z-Read Preview" className="w-full h-[70vh]" />
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setViewerOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
