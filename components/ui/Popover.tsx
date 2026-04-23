// components/UI/Popover.tsx
"use client";

import * as React from "react";
import * as RadixPopover from "@radix-ui/react-popover";

export const Popover = RadixPopover.Root;
export const PopoverTrigger = RadixPopover.Trigger;
export const PopoverContent = React.forwardRef<
  React.ElementRef<typeof RadixPopover.Content>,
  React.ComponentPropsWithoutRef<typeof RadixPopover.Content>
>(({ className, ...props }, ref) => (
  <RadixPopover.Portal>
    <RadixPopover.Content
      ref={ref}
      className={`z-50 rounded-md border bg-white p-4 shadow-md ${className}`}
      sideOffset={4}
      {...props}
    />
  </RadixPopover.Portal>
));
PopoverContent.displayName = RadixPopover.Content.displayName;
