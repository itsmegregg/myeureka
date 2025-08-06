import AppLayoutTemplate from '@/layouts/app/app-sidebar-layout';
import { type ReactNode } from 'react';
import { Toaster } from "@/components/ui/toaster";

interface AppLayoutProps {
    children: ReactNode;
    breadcrumbs?: string[];
}

export default ({ children, breadcrumbs, ...props }: AppLayoutProps) => (
    <AppLayoutTemplate  {...props}>
        {children}
        <Toaster />
    </AppLayoutTemplate>
);
