import { useWhatsApp } from "@/hooks/useWhatsApp"
import { ConversacionesList } from "@/components/whatsapp/ConversacionesList"
import { ChatThread } from "@/components/whatsapp/ChatThread"
import { WahaStatus } from "@/components/whatsapp/WahaStatus"
import { Card } from "@/components/ui/card"

export function WhatsApp() {
  const {
    conversaciones,
    mensajes,
    selectedChatId,
    setSelectedChatId,
    loading,
    chatMode,
    toggleChatMode,
    sendManualMessage,
    sendingMessage,
  } = useWhatsApp()

  // Encontrar nombre del contacto seleccionado
  const selectedConv = conversaciones.find(
    (c) => c.chat_id === selectedChatId
  )
  const contactName = selectedConv?.cliente_nombre ?? null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">WhatsApp</h1>
        <WahaStatus />
      </div>

      <div className="grid lg:grid-cols-[380px_1fr] gap-4 h-[calc(100vh-180px)]">
        {/* Lista de conversaciones - oculta en mobile cuando hay chat seleccionado */}
        <Card
          className={`overflow-hidden ${
            selectedChatId ? "hidden lg:block" : ""
          }`}
        >
          <ConversacionesList
            conversaciones={conversaciones}
            selectedChatId={selectedChatId}
            onSelectChat={setSelectedChatId}
            loading={loading}
          />
        </Card>

        {/* Chat thread - oculto en mobile cuando no hay chat seleccionado */}
        <Card
          className={`overflow-hidden ${
            !selectedChatId ? "hidden lg:flex" : ""
          }`}
        >
          <ChatThread
            mensajes={mensajes}
            selectedChatId={selectedChatId}
            contactName={contactName}
            chatMode={chatMode}
            sendingMessage={sendingMessage}
            onBack={() => setSelectedChatId(null)}
            onToggleMode={toggleChatMode}
            onSendMessage={sendManualMessage}
          />
        </Card>
      </div>
    </div>
  )
}
