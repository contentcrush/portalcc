import * as React from "react"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { ButtonProps, buttonVariants } from "@/components/ui/button"

const Pagination = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ className, ...props }, ref) => (
  <nav
    ref={ref}
    className={cn("flex w-full items-center justify-center gap-1", className)}
    {...props}
  />
))
Pagination.displayName = "Pagination"

const PaginationFirst = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    aria-label="Go to first page"
    className={cn(buttonVariants({ variant: "outline", size: "icon" }), className)}
    {...props}
  >
    <ChevronsLeft className="h-4 w-4" />
  </button>
))
PaginationFirst.displayName = "PaginationFirst"

const PaginationLast = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    aria-label="Go to last page"
    className={cn(buttonVariants({ variant: "outline", size: "icon" }), className)}
    {...props}
  >
    <ChevronsRight className="h-4 w-4" />
  </button>
))
PaginationLast.displayName = "PaginationLast"

const PaginationNext = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    aria-label="Go to next page"
    className={cn(buttonVariants({ variant: "outline", size: "icon" }), className)}
    {...props}
  >
    <ChevronRight className="h-4 w-4" />
  </button>
))
PaginationNext.displayName = "PaginationNext"

const PaginationPrev = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    aria-label="Go to previous page"
    className={cn(buttonVariants({ variant: "outline", size: "icon" }), className)}
    {...props}
  >
    <ChevronLeft className="h-4 w-4" />
  </button>
))
PaginationPrev.displayName = "PaginationPrev"

// Estendendo o tipo para incluir as propriedades compostas
interface PaginationComponent
  extends React.ForwardRefExoticComponent<
    React.HTMLAttributes<HTMLElement> & React.RefAttributes<HTMLElement>
  > {
  First: typeof PaginationFirst;
  Last: typeof PaginationLast;
  Next: typeof PaginationNext;
  Prev: typeof PaginationPrev;
}

// Compondo os componentes
(Pagination as PaginationComponent).First = PaginationFirst;
(Pagination as PaginationComponent).Last = PaginationLast;
(Pagination as PaginationComponent).Next = PaginationNext;
(Pagination as PaginationComponent).Prev = PaginationPrev;

export { Pagination }