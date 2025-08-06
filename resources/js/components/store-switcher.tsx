"use client"

import * as React from "react"
import { Check, ChevronsUpDown, GalleryVerticalEnd } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import AppLogo from "./app-logo"
import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';

interface Store {
    store_code: string;
    store_name: string;
    store_description: string;
    status: string;
}

export function StoreSwitcher() {
  const [storeList, setStoreList] = useState<Store[]>([]);
  const { selectedStore, setSelectedStore } = useStore();

  const fetchStoreList = async () => {
      const response = await fetch('/api/store');
      const data = await response.json();
      setStoreList(data);
  };

  useEffect(() => {
      fetchStoreList();
  }, []);

  useEffect(() => {
      if (storeList.length > 0 && selectedStore === undefined) {
          setSelectedStore(storeList[0].store_name);
      }
  }, [storeList, selectedStore]);



  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <AppLogo/>
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-semibold">RMS</span>
                <span className="">{storeList.find(store => store.store_name === selectedStore)?.store_name || selectedStore}</span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width]"
            align="start"
          >
            {storeList.map((store) => (
              <DropdownMenuItem
                key={store.store_name}
                onSelect={() => setSelectedStore(store.store_name)}
              >
                {store.store_name}{" "}
                {store.store_name === selectedStore && <Check className="ml-auto" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
