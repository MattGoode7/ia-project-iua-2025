'use client';

import { useEffect } from "react";
import { createChat } from "@n8n/chat";
import "@n8n/chat/style.css";

const CHAT_WEBHOOK =
  process.env.NEXT_PUBLIC_N8N_CHAT_WEBHOOK ?? "";

const PROJECT_ID =
  process.env.NEXT_PUBLIC_CHAT_PROJECT ?? "content-studio";

function destroyExistingChat() {
  const containers = document.querySelectorAll("[data-n8n-chat]");
  containers.forEach((node) => node.remove());

  const widget = document.getElementById("n8n-chat-widget");
  if (widget) {
    widget.innerHTML = "";
  }

  const styleTags = document.querySelectorAll(
    "style[data-n8n-chat-styles]"
  );
  styleTags.forEach((node) => node.remove());
}

const initialMessages = [
  "👋 ¡Hola! Soy Content, tu asistente creativo.",
  "Puedo ayudarte a transformar ideas, manuales y briefings en publicaciones listas para redes sociales.",
  "Cuéntame qué objetivo tienes (awareness, engagement, lanzamiento, etc.) y la red social donde quieres publicar.",
];

const i18n = {
  en: {
    title: "Content Studio",
    subtitle: "¿Necesitas ideas para tus redes?",
    footer: "Impulsado por Content Studio",
    getStarted: "Iniciar conversación",
    inputPlaceholder: "Escribe tu consulta...",
    closeButtonTooltip: "Cerrar chatbot",
  },
};

function mountChat() {
  if (!CHAT_WEBHOOK) {
    console.warn(
      "ContentChatWidget: define NEXT_PUBLIC_N8N_CHAT_WEBHOOK para habilitar el widget."
    );
    return;
  }

  createChat({
    webhookUrl: CHAT_WEBHOOK,
    metadata: {
      projectId: PROJECT_ID,
    },
    initialMessages,
    i18n,
  });
}

export default function ContentChatWidget() {
  useEffect(() => {
    mountChat();
    return () => destroyExistingChat();
  }, []);

  if (!CHAT_WEBHOOK) {
    return null;
  }

  return (
    <div
      className="content-chat-widget fixed bottom-6 right-6 z-50"
      data-n8n-chat-container
    >
      <div id="n8n-chat-widget" />
      <style
        data-n8n-chat-styles
        dangerouslySetInnerHTML={{
          __html: `
            #n8n-chat-widget {
              --n8n-chat-button-background: #111827;
              --n8n-chat-button-color: #f3f4f6;
              --n8n-chat-primary: #111827;
              --n8n-chat-primary-contrast: #f3f4f6;
            }

            #n8n-chat-widget button {
              border-radius: 9999px;
              border: 2px solid #f3f4f6;
            }
          `,
        }}
      />
    </div>
  );
}
