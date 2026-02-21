import { useState } from "react"
import { Menu } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Sidebar } from "./Sidebar"

export function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors">
            <Menu className="w-5 h-5" />
          </button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="w-64 p-0 bg-sidebar text-sidebar-foreground border-sidebar-border"
        >
          <Sidebar onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <h1
        className="text-lg font-bold text-secondary"
        style={{ fontFamily: "Georgia, serif" }}
      >
        TIGRE
      </h1>
    </header>
  )
}
