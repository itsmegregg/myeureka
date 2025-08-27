import { useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger  } from "../ui/popover";
import { Check } from "lucide-react";
import { ChevronDown } from "lucide-react";
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
import { useProduct } from "@/store/useProduct";

interface Product {
    product_code: string;
    category_code: string;
    product_name: string;
    product_description: string;
    status: string;
    price:  number;
    branch_code: string;
}

export default function ProductSelect() {
    const [products, setProducts] = useState<Product[]>([]);
    const [open, setOpen] = useState(false);
    const { selectedProduct, setSelectedProduct } = useProduct();
    const [id, setId] = useState("");

    // Initialize selectedProduct to 'ALL' on component mount
    useEffect(() => {
        // Only set it once on mount, not on every selectedProduct change
        if (selectedProduct === null) {
            setSelectedProduct('ALL');
        }
    }, [setSelectedProduct]); // Remove selectedProduct from deps to prevent loops

    const fetchProducts = async () => {
        try {
            const response = await fetch('/api/products');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data: Product[] = await response.json();
            setProducts(data);
        } catch (error) {
            console.error("Failed to fetch products:", error);
        }
    };
    
    useEffect(() => {
        fetchProducts();
    }, []);
    
    // Function to get product display name
    const getProductDisplayName = () => {
        // Default to 'All Products' if selectedProduct is null or 'ALL'
        if (!selectedProduct || selectedProduct === 'ALL') return 'All Products';
        
        // Find the product in our fetched products array
        const product = products.find((p) => p.product_code === selectedProduct);
        
        // Prefer product_name, fallback to product_description
        return product ? (product.product_name || product.product_description) : 'Select product';
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
            <span className={cn("truncate", !selectedProduct && "text-muted-foreground")}>
              {getProductDisplayName()}
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
            <CommandInput placeholder="Search product..." />
            <CommandList>
              <CommandEmpty>No product found.</CommandEmpty>
              <CommandGroup>
                {/* Add "All Products" option */}
                <CommandItem
                  key="all-products"
                  value="ALL"
                  onSelect={() => {
                    setSelectedProduct('ALL');
                    setOpen(false);
                  }}
                >
                  All Products
                  {selectedProduct === 'ALL' && (
                    <Check size={16} strokeWidth={2} className="ml-auto" />
                  )}
                </CommandItem>
                {products.map((product) => (
                  <CommandItem
                    key={product.product_code}
                    // Make the value searchable by code + name + description
                    value={`${product.product_code} ${product.product_name ?? ''} ${product.product_description ?? ''}`.trim()}
                    onSelect={() => {
                      // Persist only the product_code in state
                      setSelectedProduct(product.product_code);
                      setOpen(false);
                    }}
                  >
                    {product.product_name || product.product_description}
                    {selectedProduct === product.product_code && (
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