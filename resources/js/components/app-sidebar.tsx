import * as React from "react"
import {
  Bot,
  Clipboard,
  Clock,
  CreditCard,
  File,

  PanelLeftDashedIcon,
  Percent,

  Settings,

  SquareTerminal,
  Truck,
  User,
  X,
} from "lucide-react"

import { usePage } from "@inertiajs/react"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { StoreSwitcher } from "./store-switcher"
import { NavSecondary } from "./nav-secondary"
// This is sample data.


interface User {
  name: string;
  email: string;
  avatar: string;
}
const data = {

  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: SquareTerminal,
      isActive: false,
    },
    {
      title: "Item Sales",
      url: "#",
      icon: File,
 
      items: [
        {
          title: "Per Item",
          url: "/item-sales/per-item",
        },
        {
          title: "Per Category",
          url: "/item-sales/per-category",
        },
      ],
    },
    {
      title: "Daily Sales",
      url: "/daily-sales",
      icon: Bot,
   
    },
    {
      title: "Discount",
      url: "/discount",
      icon: Percent,
      isActive: false,
    
     
    },
    {
      title: "Payment",
      url: "/payment",
      icon: CreditCard,
      isActive: false,
    },
    {
        title: "Hourly Sales",
        url: "/hourly",
        icon: Clock,
        isActive: false,
    },
    {
        title: "BIR Report",
        url: "",   
        icon: PanelLeftDashedIcon,  

      items: [
        {
          title: "BIR Detailed",
          url: "/bir/detailed",
        },
        {
          title: "BIR Summary",
          url: "/bir/summary",
        },
      ],
    },
    {
        title: "Government Discount",
        url: "/government-discount",
        icon: Clipboard,
        isActive: false,
    } ,
    {
        title: "Void TX",
        url: "/void-tx",
        icon: X,
        isActive: false,
    },
    {
        title: "Cashier",
        url: "/cashier",
        icon: User,
          isActive: false,
    },
    {
        title: "Fast-Moving Items",
        url: "/fast-moving",
        icon: Truck,
        isActive: false,
    },
    {
      title: "Receipt",
      url: "/receipt",
      icon: File,
      isActive: false,
    }
   
  ],

  navSecondary: [
    {
      title: "Settings",
      url: "/settings",
      icon: Settings,
      isActive: false,
    }
  ],
 
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  // Two-step type assertion to safely handle the unknown type
  const pageProps = usePage().props as unknown as { auth: { user: User } };
  const user = pageProps.auth.user
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <StoreSwitcher/>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} currentUrl={usePage().url} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
