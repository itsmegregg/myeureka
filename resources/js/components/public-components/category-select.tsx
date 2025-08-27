import { useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "../ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "../ui/command";
import { cn } from "@/lib/utils";
import { useCategory } from "@/store/useCategory";

interface CategoryProps {
    category_code: string;
    category_name: string;
    category_description: string;
    status: string;
    created_at: string;
    updated_at: string;
}

export default function CategorySelect() {
    const [categories, setCategories] = useState<CategoryProps[]>([]);
    const [open, setOpen] = useState(false);
    const { selectedCategory, setSelectedCategory } = useCategory();
    const [id, setId] = useState("");

    // Initialize selectedCategory to 'ALL' on component mount
    useEffect(() => {
        // Only set it once on mount, not on every selectedCategory change
        if (selectedCategory === null) {
            setSelectedCategory('ALL');
        }
    }, [setSelectedCategory]); // Remove selectedCategory from deps to prevent loops

    const fetchCategories = async () => {
        try {
            const response = await fetch('/api/categories');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data: CategoryProps[] = await response.json();
            setCategories(data);
        } catch (error) {
            console.error("Failed to fetch categories:", error);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    // Function to get category display name
    const getCategoryDisplayName = () => {
        // Default to 'All Categories' if selectedCategory is null or 'ALL'
        if (!selectedCategory || selectedCategory === 'ALL') return 'All Categories';
        
        // Find the category in our fetched categories array
        const category = categories.find((c) => c.category_code === selectedCategory);
        
        // If we can't find it, return a sensible default
        return category ? category.category_name : 'Select category';
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    id={id}
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-[300px] justify-between bg-background px-3 font-normal outline-offset-0 hover:bg-background focus-visible:border-ring focus-visible:outline-[3px] focus-visible:outline-ring/20"
                >
                    <span className={cn("truncate", !selectedCategory && "text-muted-foreground")}>
                        {getCategoryDisplayName()}
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
                    <CommandInput placeholder="Search category..." />
                    <CommandList>
                        <CommandEmpty>No category found.</CommandEmpty>
                        <CommandGroup>
                            {/* Add "All Categories" option */}
                            <CommandItem
                                key="all-categories"
                                value="ALL"
                                onSelect={() => {
                                    setSelectedCategory('ALL');
                                    setOpen(false);
                                }}
                            >
                                All Categories
                                {selectedCategory === 'ALL' && (
                                    <Check size={16} strokeWidth={2} className="ml-auto" />
                                )}
                            </CommandItem>
                            {categories.map((category) => (
                                <CommandItem
                                    key={category.category_code}
                                    value={category.category_code}
                                    onSelect={(currentValue) => {
                                        setSelectedCategory(currentValue);
                                        setOpen(false);
                                    }}
                                >
                                    {category.category_name}
                                    {selectedCategory === category.category_code && (
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