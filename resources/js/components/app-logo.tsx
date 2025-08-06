import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import AppLogoIcon from './app-logo-icon';

interface AppLogoProps extends HTMLAttributes<HTMLDivElement> {}

export default function AppLogo({ className, ...props }: AppLogoProps) {
    return (
        <div className={cn("flex items-center", className)} {...props}>
            <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-md">
                <AppLogoIcon className="size-5 fill-current text-white dark:text-black" />
            </div>
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="mb-0.5 truncate leading-none font-semibold">Report Management System</span>
            </div>
        </div>
    );
}
