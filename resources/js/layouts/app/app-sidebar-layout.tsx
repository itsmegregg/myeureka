import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { type PropsWithChildren } from 'react';
import { format } from 'date-fns';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Toaster } from	'@/components/ui/sonner';

export default function AppSidebarLayout({ children, breadcrumbs = [] }: PropsWithChildren<{ breadcrumbs?: string[] }>) {

    return (
        <SidebarProvider>
     <AppSidebar variant="inset" />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 border-b justify-between px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm font-medium">
              {format(new Date(), 'MMMM dd, yyyy')}
            </div>
            <ThemeToggle />
          </div>
        </header>
        <div className='p-4'>
        {children}
        </div>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
    );
}
