"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { UserPen, ImageIcon, FileText, MessageSquareText } from "lucide-react";
import { NewQueryForm } from "./new-query-form";
import { WhatsAppTextForm } from "./whatsapp-text-form";
import { FileUploadForm } from "./file-upload-form";

type View = "select" | "manual" | "image" | "pdf" | "whatsapp";

const CARDS: { view: View; icon: typeof UserPen; title: string; blurb: string }[] = [
  { view: "manual", icon: UserPen, title: "Manual Query", blurb: "Fill in the trip details yourself." },
  { view: "image", icon: ImageIcon, title: "Upload Image", blurb: "A WhatsApp or email screenshot — read locally with OCR." },
  { view: "pdf", icon: FileText, title: "Upload PDF", blurb: "A text-based or scanned PDF itinerary/request." },
  { view: "whatsapp", icon: MessageSquareText, title: "WhatsApp / Text", blurb: "Paste a message — no WhatsApp connection needed." },
];

export function NewQueryHub() {
  const [view, setView] = useState<View>("select");

  if (view === "manual") return <NewQueryForm />;
  if (view === "whatsapp") return <WhatsAppTextForm onBack={() => setView("select")} />;
  if (view === "image") return <FileUploadForm kind="image" onBack={() => setView("select")} />;
  if (view === "pdf") return <FileUploadForm kind="pdf" onBack={() => setView("select")} />;

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {CARDS.map((c, i) => (
        <motion.button
          key={c.view}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          onClick={() => setView(c.view)}
          className="card-surface p-6 text-left flex items-start gap-4 transition-transform hover:scale-[1.01]"
        >
          <div
            className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "var(--color-teal-100)", color: "var(--color-teal-700)" }}
          >
            <c.icon size={20} />
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-1">{c.title}</h3>
            <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{c.blurb}</p>
          </div>
        </motion.button>
      ))}
    </div>
  );
}
