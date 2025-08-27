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
import { usePaymentTypeStore } from "@/store/usePaymentType";

interface PaymentTypeProps {
    payment_type: string;
}

export default function PaymentTypeSelect() {
    const [paymentTypes, setPaymentTypes] = useState<PaymentTypeProps[]>([]);
    const [open, setOpen] = useState(false);
    const { selectedPaymentType, setSelectedPaymentType } = usePaymentTypeStore();

    // Initialize selectedPaymentType to 'ALL' on component mount
    useEffect(() => {
        if (selectedPaymentType === null) {
            setSelectedPaymentType('ALL');
        }
    }, []);

    const fetchPaymentTypes = async () => {
        try {
            const response = await fetch('/api/payment-list');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setPaymentTypes(data.data);
        } catch (error) {
            console.error("Failed to fetch payment types:", error);
        }
    };

    useEffect(() => {
        // Fetch payment types on component mount
        fetchPaymentTypes();
    }, []);

    // Function to get payment type display name
    const getPaymentTypeDisplayName = () => {
        if (!selectedPaymentType || selectedPaymentType === 'ALL') return 'All Payment Types';
        
        const paymentType = paymentTypes.find((p) => p.payment_type === selectedPaymentType);
        
        return paymentType ? paymentType.payment_type : 'Select payment type';
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
                    <span className={cn("truncate", !selectedPaymentType && "text-muted-foreground")}>
                        {getPaymentTypeDisplayName()}
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
                    <CommandInput placeholder="Search payment type..." />
                    <CommandList>
                        <CommandEmpty>No payment type found.</CommandEmpty>
                        <CommandGroup>
                            <CommandItem
                                key="all-payment-types"
                                value="ALL"
                                onSelect={() => {
                                    setSelectedPaymentType('ALL');
                                    setOpen(false);
                                }}
                            >
                                All Payment Types
                                {selectedPaymentType === 'ALL' && (
                                    <Check size={16} strokeWidth={2} className="ml-auto" />
                                )}
                            </CommandItem>
                            {paymentTypes.map((paymentType) => (
                                <CommandItem
                                    key={paymentType.payment_type}
                                    value={paymentType.payment_type}
                                    onSelect={(currentValue) => {
                                        setSelectedPaymentType(currentValue);
                                        setOpen(false);
                                    }}
                                >
                                    {paymentType.payment_type}
                                    {selectedPaymentType === paymentType.payment_type && (
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