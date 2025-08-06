import { Button } from "@/components/ui/button";
import { Table, TableBody,   TableCell,   TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/settings/layout";
import { Head,} from "@inertiajs/react";
import { useEffect, useState } from "react";
import axios from "axios";
import { Badge } from "@/components/ui/badge";
import { Trash2, Wrench } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {toast} from "sonner"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface BranchProps {
    id?: number;
    store_name: string;
    branch_name: string;
    branch_description: string;
    status: string;
}

interface StoreProps {
    id?: number;
    store_name: string;
    store_description: string;
    status: string;
}

export default function Branch() {
 
    const [branches, setBranches] = useState<BranchProps[]>([]);
    const [open, setOpen] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [selectedBranch, setSelectedBranch] = useState<BranchProps | null>(null);
    const [formData, setFormData] = useState<BranchProps>({
        store_name: '',
        branch_name: '',
        branch_description: '',
        status: 'inactive',
    });
    const [stores, setStores] = useState<StoreProps[]>([]);
    const fetchBranches = async () => {
        const response = await axios.get('/api/branches');
        setBranches(response.data);
    };
    const fetchStores = async () => {
        const response = await axios.get('/api/store');
        setStores(response.data);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleStatusChange = (checked: boolean) => {
        setFormData(prev => ({ ...prev, status: checked ? 'active' : 'inactive' }));
    };

    const handleAddBranchClick = () => {
        setIsEdit(false);
        setSelectedBranch(null);
        setFormData({
            store_name: '',
            branch_name: '',
            branch_description: '',
            status: 'inactive',
        });
        setOpen(true);
    };

    const handleEditClick = (branch: BranchProps) => {
        setIsEdit(true);
        setSelectedBranch(branch);
        setFormData(branch);
        setOpen(true);
    };

    const handleDeleteClick = async (branchCode: string) => {
        try {
            await axios.delete(`/api/branches/${branchCode}`);
            fetchBranches();
            toast("Branch Deleted",{
                description:"The branch has been successfully deleted.",
                duration: 5000,
            });
        } catch (error) {
            console.error("Error deleting branch:", error);
            toast("Error deleting branch",{
                description:"Failed to delete branch.",
                duration: 5000,
            });
        }
    };

    const handleSubmit = async () => {
        console.log('Form data being sent:', formData);
        try {
            if (isEdit) {
                console.log('Updating branch with ID:', selectedBranch?.id, 'Data:', formData);
                await axios.put(`/api/branches/${selectedBranch?.id}`, formData);
                toast("Branch Updated",{
                    description:"The branch has been successfully updated.",
                    
                });
            } else {
                console.log('Creating new branch with data:', formData);
                await axios.post('/api/branches', formData);
                toast("Branch Added",{
                    description:"The branch has been successfully added.",
                    
                });
                
            }
            fetchBranches();
            setOpen(false);
            console.log('Form data sent successfully:', formData);
        } catch (error) {
            console.error("Error saving branch:", error);
            console.log('Failed form data:', formData);
            toast("Error saving branch",{
                description:"Failed to save branch.",
                duration: 5000,
            });
        }
    };  

    useEffect(() => {
        fetchBranches();
        fetchStores();
    }, []);

    return (
        <AppLayout>
            <Head title="Settings - Branch" />
            <SettingsLayout>
                <div className="p-4">
                    <div className="flex flex-row  justify-between items-center">
                        <h1 className="text-xl font-normal">Branch Settings</h1>
                        <Button onClick={handleAddBranchClick}>Add Branch</Button>
                    </div>
                    <div className="mt-4">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Branch Code</TableHead>
                                   
                                    <TableHead>Branch Name</TableHead>
                                    <TableHead>Branch Description</TableHead>
                                    <TableHead>Branch Status</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {branches.map((branch) => (
                                    <TableRow key={branch.id}>
                                        <TableCell>{branch.id?.toString()}</TableCell>
                                      
                                        <TableCell>{branch.branch_name}</TableCell>
                                        <TableCell>{branch.branch_description}</TableCell>
                                        <TableCell><Badge className={branch.status === 'active' ? 'bg-green-500' : 'bg-red-500'}>{branch.status === 'active' ? 'Active' : 'Inactive'}</Badge></TableCell>
                                        <TableCell className="flex gap-2">
                                            <Button variant="ghost" size="icon" className="cursor-pointer" onClick={() => handleEditClick(branch)}>
                                                <Wrench />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="cursor-pointer" onClick={() => handleDeleteClick(branch.id?.toString() || '')}>
                                                <Trash2 className="text-destructive" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{isEdit ? 'Edit Branch' : 'Add Branch'}</DialogTitle>
                            <DialogDescription>
                                {isEdit ? 'Edit the details of the branch.' : 'Add a new branch to your system.'}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">

                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="store_code" className="text-right">Store</Label>
                                <Select
                                    value={formData.store_name || ''}
                                    onValueChange={(value) => setFormData(prev => ({ ...prev, store_name: value }))}
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select a store" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {stores.map((store) => (
                                            <SelectItem key={store.store_name} value={store.store_name}>
                                                {store.store_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="branch_name" className="text-right">Branch Name</Label>
                                <Input id="branch_name" value={formData.branch_name} onChange={handleInputChange} className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="branch_description" className="text-right">Description</Label>
                                <Input id="branch_description" value={formData.branch_description} onChange={handleInputChange} className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="status" className="text-right">Status</Label>
                                <Switch id="status" checked={formData.status === 'active'} onCheckedChange={handleStatusChange} className="col-span-3" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" onClick={handleSubmit}>{isEdit ? 'Save Changes' : 'Add Branch'}</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </SettingsLayout>
        </AppLayout>
    )
}