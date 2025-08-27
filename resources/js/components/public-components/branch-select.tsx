import { Branch } from "@/types";
import { useEffect, useState } from "react";
import { Skeleton } from "../ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBranchStore } from "@/store/useBranch";

export default function BranchSelect() {
    const [branches, setBranches] = useState<Branch[]>([]);
    const { selectedBranch, setSelectedBranch } = useBranchStore();

    const fetchBranches = async () => {
        try {
            const response = await fetch('/api/branches');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data: Branch[] = await response.json();
            setBranches(data);
            
        } catch (error) {
            console.error("Failed to fetch branches:", error);
        }
    };

    useEffect(() => {
        fetchBranches();
    }, []);

    if (branches.length === 0) {
        return (
            <Select>
                <SelectContent>
                    <SelectItem value="ALL">
                        <Skeleton className="h-10 w-full" />
                    </SelectItem>
                </SelectContent>
            </Select>
        );
    }

    return (
        <Select onValueChange={(value) => {
            console.log("Selected value:", value);
            if (value === "ALL") {
                setSelectedBranch(null);
            } else {
                const branch = branches.find(b => b.branch_name === value);
                console.log("Found branch:", branch);
                if (branch) {
                    setSelectedBranch(branch);
                }
            }
        }} value={selectedBranch ? selectedBranch.branch_name : "ALL"}>
            <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Select a branch" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem key="all" value="ALL">
                    All Branches
                </SelectItem>
                {branches.map((branch) => (
                    <SelectItem key={branch.branch_name} value={branch.branch_name}>
                        {branch.branch_description}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}