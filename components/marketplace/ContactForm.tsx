"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export function ContactForm() {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/marketplace/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Could not send message");
      toast({ title: "Message sent", description: "We will get back to you soon." });
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : "Could not send message",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="mt-6 space-y-3" onSubmit={handleSubmit}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          className="rounded-xl border-white/70 bg-white/65"
          placeholder="Your Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
        />
        <Input
          className="rounded-xl border-white/70 bg-white/65"
          type="email"
          placeholder="Your Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <Input
        className="rounded-xl border-white/70 bg-white/65"
        placeholder="Subject"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        required
        minLength={2}
      />
      <textarea
        className="min-h-32 w-full rounded-xl border border-white/70 bg-white/65 px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-[#6ea43f]/30"
        placeholder="Your Message"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        required
        minLength={10}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-gradient-to-r from-[#6ea43f] to-[#477d34] text-white"
        >
          {submitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          Send Message
        </Button>
        <p className="text-xs text-[#2A4C6A]/65">Your information is safe with us.</p>
      </div>
    </form>
  );
}
