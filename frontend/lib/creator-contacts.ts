export const creatorContacts = [
  {
    name: "Eng. Otieno Owino",
    role: "Backend developer major",
    phone: "0711776391",
    whatsappNumber: "254711776391",
    focus: "Secure APIs, data flows, integrations, and hospital workflow logic.",
    message:
      "Hello Eng. Otieno, I need assistance with Invinceible Core HMS. Kindly help me with setup, support, or system guidance.",
  },
  {
    name: "Eng. Moikoyo Paul",
    role: "Frontend developer major",
    phone: "0715673393",
    whatsappNumber: "254715673393",
    focus: "Premium interfaces, user experience, dashboards, and workflow design.",
    message:
      "Hello Eng. Moikoyo, I need assistance with Invinceible Core HMS. Kindly help me with setup, support, or system guidance.",
  },
] as const;

export const supportContacts = creatorContacts.filter((creator) =>
  creator.name.includes("Otieno"),
);

export function getWhatsappLink(whatsappNumber: string, message: string) {
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}
