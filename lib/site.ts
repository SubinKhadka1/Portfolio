export const WHATSAPP_NUMBER = "9779841413038";
export const WHATSAPP_DISPLAY = "+977 9841413038";

export const SOCIAL_LINKS = {
  linkedin: "https://www.linkedin.com/in/subin-khadka-233a53292/",
  instagram: "https://www.instagram.com/subineyy_",
  facebook: "https://www.facebook.com/share/18GPmVgLhB/?mibextid=wwXIfr",
} as const;

export function getWhatsAppUrl(message?: string) {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`;
  if (!message?.trim()) return base;
  return `${base}?text=${encodeURIComponent(message)}`;
}

export const WHATSAPP_GREETING =
  "Hi Subin! I found your portfolio and would like to discuss a project.";

export function buildContactWhatsAppMessage(data: {
  name: string;
  email: string;
  project: string;
  message: string;
}) {
  return [
    "Hi Subin, I'd like to work with you.",
    "",
    `Name: ${data.name}`,
    `Email: ${data.email}`,
    `Project: ${data.project}`,
    "",
    data.message,
  ].join("\n");
}
