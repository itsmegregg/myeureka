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
import { Eye, FileText, File as FileIcon, Search } from "lucide-react";
import { format as formatDate } from "date-fns";
import { useStore } from "@/store/useStore";

interface ZreadItem {
  id: number;
  date: string; // YYYY-MM-DD
  branch_name: string;
  file_path: string;
  created_at: string;
  updated_at: string;
}

async function downloadPdf(path: string, filename: string) {
  try {
    const response = await fetch(viewUrl(path));
    if (!response.ok) {
      alert("Zread file not found.");
      return;
    }
    const contentType = response.headers.get("content-type") || "";
    let text = "";
    if (contentType.includes("text")) {
      text = await response.text();
    } else {
      text = `[File: ${path}]\n\nThis file is not text-based. Content preview is unavailable.`;
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
  return formatDate(d, "yyyy-MM-dd");
}

function viewUrl(path: string) {
  return `/${path}`; // served from public/
}

async function downloadTxt(path: string, filename: string) {
  try {
    const response = await fetch(viewUrl(path));
    if (!response.ok) {
      alert("Zread file not found.");
      return;
    }
    const contentType = response.headers.get("content-type");
    let fileContent: string;
    if (contentType && contentType.includes("text")) fileContent = await response.text();
    else fileContent = `[File: ${path}]\n\nThis file is not text-based.`;

    const blob = new Blob([fileContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error downloading file:", error);
    alert("Error downloading zread file.");
  }
}

export default function ZreadIndex() {
  const [zreads, setZreads] = useState<ZreadItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { dateRange: selectedDateRange } = useDateRange();
  const { dateRange } = useDateRange();


      const { selectedBranch } = useBranchStore();
 
      const { selectedStore } = useStore();

  const searchByDateRange = async () => {


    setLoading(true);
    setError("");
    setZreads([]);
    try {

      const response = await axios.get("/api/zreadDateRange", {
        params: {
          branch_name: selectedBranch?.branch_name ?? 'ALL',
          from_date: selectedDateRange.from,
          to_date: selectedDateRange.to,
          store_name: selectedStore ?? 'ALL',
          
      },
      });



      const items: ZreadItem[] = response.data?.data || [];
      setZreads(items);
      if (!items.length) setError("No zreads found for the selected range.");
    } catch (err: any) {
      console.error("Zread search error", err);
      setError(err.response?.data?.message || "Unable to fetch zreads by date");
      setZreads([]);
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
                    {/* export buttons placeholder */}
                  </div>
                </div>

                {error && <div className="text-red-500 text-sm">{error}</div>}

                <div className="rounded-md overflow-hidden">
                  {zreads.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {zreads.map((z) => {
                        const href = viewUrl(z.file_path);
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
                                <div className="text-xs text-muted-foreground break-all">{z.file_path}</div>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => window.open(href, "_blank")}>
                                  <Eye className="size-4 mr-2" /> View
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => downloadTxt(z.file_path, baseName)}>
                                  TXT <FileText className="size-4 ml-2" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => downloadPdf(z.file_path, baseName)}>
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
    </AppLayout>
  );
}
