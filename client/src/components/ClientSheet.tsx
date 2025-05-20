import { NewClientForm } from "./NewClientForm";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { queryClient } from "@/lib/queryClient";

interface ClientSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientSheet({ open, onOpenChange }: ClientSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="h-auto max-h-[90%] rounded-t-xl border-t border-border p-0"
      >
        <div className="flex flex-col h-full">
          <SheetHeader className="sticky top-0 z-20 bg-background pb-2 pt-0 px-6 shadow-sm">
            <div className="flex justify-center items-center -mt-1 mb-1">
              <div className="h-1.5 w-16 bg-muted rounded-full" />
            </div>
            <SheetTitle className="text-xl font-semibold">Novo Cliente</SheetTitle>
            <SheetDescription className="text-sm">
              Preencha as informações básicas para adicionar um novo cliente
            </SheetDescription>
          </SheetHeader>
          
          <div className="overflow-y-auto flex-1 pb-6 px-6 py-4">
            <NewClientForm 
              onSuccess={() => {
                onOpenChange(false);
                queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
              }}
              onCancel={() => onOpenChange(false)}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}