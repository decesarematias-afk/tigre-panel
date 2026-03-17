import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ServiciosConfig } from "@/components/configuracion/ServiciosConfig"
import { HorariosConfig } from "@/components/configuracion/HorariosConfig"
import { NegocioConfig } from "@/components/configuracion/NegocioConfig"
import { WahaConfig } from "@/components/configuracion/WahaConfig"
import { OwnerAccessConfig } from "@/components/configuracion/OwnerAccessConfig"
import { Scissors, Clock, Store, MessageSquare, Shield } from "lucide-react"

export function Configuracion() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Configuración</h1>

      <Tabs defaultValue="servicios">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="servicios" className="flex-1 sm:flex-none">
            <Scissors className="w-4 h-4 mr-2" />
            Servicios
          </TabsTrigger>
          <TabsTrigger value="horarios" className="flex-1 sm:flex-none">
            <Clock className="w-4 h-4 mr-2" />
            Horarios
          </TabsTrigger>
          <TabsTrigger value="negocio" className="flex-1 sm:flex-none">
            <Store className="w-4 h-4 mr-2" />
            Negocio
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="flex-1 sm:flex-none">
            <MessageSquare className="w-4 h-4 mr-2" />
            WAHA
          </TabsTrigger>
          <TabsTrigger value="bot-dueno" className="flex-1 sm:flex-none">
            <Shield className="w-4 h-4 mr-2" />
            Bot Dueño
          </TabsTrigger>
        </TabsList>
        <TabsContent value="servicios" className="mt-4">
          <ServiciosConfig />
        </TabsContent>
        <TabsContent value="horarios" className="mt-4">
          <HorariosConfig />
        </TabsContent>
        <TabsContent value="negocio" className="mt-4">
          <NegocioConfig />
        </TabsContent>
        <TabsContent value="whatsapp" className="mt-4">
          <WahaConfig />
        </TabsContent>
        <TabsContent value="bot-dueno" className="mt-4">
          <OwnerAccessConfig />
        </TabsContent>
      </Tabs>
    </div>
  )
}
