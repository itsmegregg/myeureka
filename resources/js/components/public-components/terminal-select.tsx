import { useTerminalStore } from "@/store/useTerminal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

export default function TerminalSelect() {

    const { selectedTerminal, setSelectedTerminal } = useTerminalStore();

    return(
        <Select onValueChange={(value) => setSelectedTerminal(value)} value={selectedTerminal || "ALL"}>
            <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Terminal" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="ALL">All Terminal</SelectItem>
                <SelectItem value="001">Terminal 1</SelectItem>
                <SelectItem value="002">Terminal 2</SelectItem>
                <SelectItem value="003">Terminal 3</SelectItem>
            </SelectContent>
        </Select>
    )
}