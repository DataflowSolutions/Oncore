"use client";

import { Mail, Phone, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Popup } from "@/components/ui/popup";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  saveShowContact,
  getShowContacts,
  ShowContactRow,
} from "@/lib/actions/advancing/show-contacts";
import { toast } from "sonner";
import { ContactDetailPopup } from "@/components/contacts/ContactDetailPopup";
import { PromoterDetailPopup } from "@/components/contacts/PromoterDetailPopup";

interface ContactsPanelProps {
  orgSlug: string;
  showId: string;
  contactsData?: ShowContactRow[];
}

export function ContactsPanel({
  orgSlug,
  showId,
  contactsData = [],
}: ContactsPanelProps) {
  const [contacts, setContacts] = useState<ShowContactRow[]>(contactsData);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ShowContactRow | null>(
    null
  );
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [isPromoter, setIsPromoter] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (contactsData.length === 0 && showId) {
      (async () => {
        try {
          const fresh = await getShowContacts(showId);
          setContacts(fresh);
        } catch (e) {
          toast.error("Failed to load contacts");
        }
      })();
    }
  }, [contactsData.length, showId]);

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Name required");
      return;
    }
    setIsSaving(true);
    const result = await saveShowContact(orgSlug, showId, {
      name: name.trim(),
      role: isPromoter ? undefined : role.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      isPromoter,
    });
    setIsSaving(false);
    if (!result.success || !result.data) {
      toast.error(result.error || "Failed to save contact");
      return;
    }
    setContacts((prev) => [...prev, result.data!]);
    toast.success("Contact added");
    setName("");
    setRole("");
    setPhone("");
    setEmail("");
    setIsPromoter(false);
    setIsOpen(false);
  }

  return (
    <div className="bg-card border border-card-border rounded-[20px] p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-medium text-card-foreground font-header">
          Key Contacts
        </h3>
        <button
          onClick={() => setIsOpen(true)}
          className="text-button-bg hover:text-button-bg-hover cursor-pointer"
          title="Add contact"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
      <div className="flex flex-col gap-3">
        {contacts.map((contact) => (
          <div
            key={contact.id}
            className="bg-card-cell rounded-full px-4 py-3 flex justify-between items-center cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setSelectedContact(contact)}
          >
            <div>
              <div
                className="font-header text-xs truncate max-w-[140px]"
                title={contact.name}
              >
                {contact.name}
              </div>
              <div
                className="text-[10px] text-description-foreground truncate max-w-[140px]"
                title={
                  contact.is_promoter ? "Promoter" : contact.role || undefined
                }
              >
                {contact.is_promoter ? "Promoter" : contact.role || ""}
              </div>
            </div>
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              {contact.email && (
                <Link
                  href={`mailto:${contact.email}`}
                  title={`Email ${contact.name}`}
                  className="bg-button-bg-contact border border-button-border-contact rounded-full flex items-center justify-center size-7 hover:opacity-70"
                >
                  <Mail
                    size={14}
                    className="inline-block text-card-foreground cursor-pointer"
                  />
                </Link>
              )}
              {contact.phone && (
                <Link
                  href={`tel:${contact.phone}`}
                  title={`Call ${contact.name}`}
                  className="bg-button-bg-contact border border-button-border-contact rounded-full flex items-center justify-center size-7 hover:opacity-70"
                >
                  <Phone
                    size={14}
                    className="inline-block text-card-foreground cursor-pointer"
                  />
                </Link>
              )}
            </div>
          </div>
        ))}
        {contacts.length === 0 && (
          <div className="text-xs text-muted-foreground italic">
            No contacts yet
          </div>
        )}
      </div>

      <Popup title="Add Contact" open={isOpen} onOpenChange={setIsOpen}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Input
                placeholder="Name*"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <Input
                placeholder={
                  isPromoter
                    ? "Promoter (auto)"
                    : "Role (e.g. Production Manager)"
                }
                value={isPromoter ? "" : role}
                onChange={(e) => setRole(e.target.value)}
                disabled={isPromoter}
              />
            </div>
            <Input
              placeholder="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Input
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs">Promoter?</span>
            <Switch
              checked={isPromoter}
              onCheckedChange={(checked) => {
                const next = Boolean(checked);
                setIsPromoter(next);
                if (next) setRole("");
              }}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </Popup>

      {/* Detail Popups */}
      {selectedContact && !selectedContact.is_promoter && (
        <ContactDetailPopup
          open={!!selectedContact}
          onOpenChange={(open) => !open && setSelectedContact(null)}
          contact={{
            name: selectedContact.name,
            role: selectedContact.role,
            phone: selectedContact.phone,
            email: selectedContact.email,
            notes: selectedContact.notes,
            created_at: selectedContact.created_at,
          }}
        />
      )}
      {selectedContact && selectedContact.is_promoter && (
        <PromoterDetailPopup
          open={!!selectedContact}
          onOpenChange={(open) => !open && setSelectedContact(null)}
          promoter={{
            name: selectedContact.name,
            role: selectedContact.role,
            phone: selectedContact.phone,
            email: selectedContact.email,
            notes: selectedContact.notes,
            created_at: selectedContact.created_at,
            venues: selectedContact.venues || [],
          }}
        />
      )}
    </div>
  );
}
