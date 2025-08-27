import { LucideIcon } from 'lucide-react';
import type { Config } from 'ziggy-js';

export interface Auth {
    user: User;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface subItem {
    title: string;
    href: string;
}
export interface NavItem {
    title: string;
    href: string;
    icon?: LucideIcon | null;
    isActive?: boolean;
    subItems?: subItem[];
}

export interface SharedData {
    name: string;
    quote: { message: string; author: string };
    auth: Auth;
    ziggy: Config & { location: string };
    sidebarOpen: boolean;
    [key: string]: unknown;
}

export interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
    [key: string]: unknown; // This allows for additional properties...
}

export interface PageProps {
    auth: {
        user: User;
    };
    [key: string]: unknown;
}


export interface Branch {
    branch_code: string;
    store_code: string;
    branch_name: string;
    branch_description: string;
    status: string;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
}

export interface Store {
    store_code: string;
    store_name: string;
    [key: string]: unknown;
}