import { useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "../ui/button";
import {
    Command,
    CommandEmpty,
    CommandInput,
    CommandGroup,
    CommandItem,
    CommandList,
} from "../ui/command";
import { cn } from "@/lib/utils";
import { useCashierStore } from "@/store/useCashier";
import { useBranchStore } from "@/store/useBranch";
import { Branch } from '@/types';

interface CashierProps {
    cashier_name: string;
    branch_name: string;
}

export default function CashierSelect() {
    const [cashiers, setCashiers] = useState<CashierProps[]>([]);
    const [open, setOpen] = useState(false);
    const { selectedCashier, setSelectedCashier } = useCashierStore();
    const { selectedBranch } = useBranchStore();

    // Initialize selectedCashier to 'ALL' on component mount
    useEffect(() => {
        if (selectedCashier === null) {
            setSelectedCashier('ALL');
        }
    }, [selectedCashier]);

    const fetchCashiers = async (branchName: string | null) => {
        try {
            const response = await fetch('/api/cashiers');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data: { data: CashierProps[] } = await response.json();
            
            if (branchName && branchName !== 'ALL') {
                const filteredCashiers = data.data.filter(cashier => cashier.branch_name === branchName);
                setCashiers(filteredCashiers);
            } else {
                setCashiers(data.data);
            }
        } catch (error) {
            console.error("Failed to fetch cashiers:", error);
        }
    };

    useEffect(() => {
        // Fetch cashiers whenever selectedBranch changes
        fetchCashiers(selectedBranch?.branch_name || null);
        // Reset selectedCashier when branch changes to avoid showing a cashier not in the new branch
        setSelectedCashier('ALL');
    }, [selectedBranch]);

    // Function to get cashier display name
    const getCashierDisplayName = () => {
        if (!selectedCashier || selectedCashier === 'ALL') return 'All Cashiers';
        
        const cashier = cashiers.find((c) => c.cashier_name === selectedCashier);
        
        return cashier ? cashier.cashier_name : 'Select cashier';
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-[300px] justify-between bg-background px-3 font-normal outline-offset-0 hover:bg-background focus-visible:border-ring focus-visible:outline-[3px] focus-visible:outline-ring/20"
                >
                    <span className={cn("truncate", !selectedCashier && "text-muted-foreground")}>
                        {getCashierDisplayName()}
                    </span>
                    <ChevronDown
                        size={16}
                        strokeWidth={2}
                        className="shrink-0 text-muted-foreground/80"
                        aria-hidden="true"
                    />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-full min-w-[var(--radix-popper-anchor-width)] border-input p-0"
                align="start"
            >
                <Command>
                    <CommandInput placeholder="Search cashier..." />
                    <CommandList>
                        <CommandEmpty>No cashier found.</CommandEmpty>
                        <CommandGroup>
                            <CommandItem
                                key="all-cashiers"
                                value="ALL"
                                onSelect={() => {
                                    setSelectedCashier('ALL');
                                    setOpen(false);
                                }}
                            >
                                All Cashiers
                                {selectedCashier === 'ALL' && (
                                    <Check size={16} strokeWidth={2} className="ml-auto" />
                                )}
                            </CommandItem>
                            {cashiers.map((cashier) => (
                                <CommandItem
                                    key={cashier.cashier_name}
                                    value={cashier.cashier_name}
                                    onSelect={(currentValue) => {
                                        setSelectedCashier(currentValue);
                                        setOpen(false);
                                    }}
                                >
                                    {cashier.cashier_name}
                                    {selectedCashier === cashier.cashier_name && (
                                        <Check size={16} strokeWidth={2} className="ml-auto" />
                                    )}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}