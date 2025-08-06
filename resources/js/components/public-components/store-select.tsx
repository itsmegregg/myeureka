import { Store } from "@/types";
import { useEffect, useState } from "react";
import { Skeleton } from "../ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/store/useStore";

export default function StoreSelect() {
    const [stores, setStores] = useState<Store[]>([]);
    const { selectedStore, setSelectedStore } = useStore();

    const fetchStores = async () => {
        try {
            const response = await fetch('/api/store');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data: Store[] = await response.json();
            setStores(data);
        } catch (error) {
            console.error("Failed to fetch stores:", error);
        }
    };

    useEffect(() => {
        fetchStores();
    }, []);

    if (stores.length === 0) {
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
            if (value === "all") {
                setSelectedStore(undefined);
            } else {
                const store = stores.find(s => s.store_code === value);
                if (store) {
                    setSelectedStore(store.store_code);
                }
            }
        }} value={selectedStore ?? "all"}>
            <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select a store" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem key="all" value="all">
                    All Stores
                </SelectItem>
                {stores.map((store) => (
                    <SelectItem key={store.store_code} value={store.store_code}>
                        {store.store_name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
