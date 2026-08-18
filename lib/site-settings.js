import prisma from "./prisma";

export async function getSiteSettings() {
  try {
    const rows = await prisma.siteSetting.findMany();
    const settings = {};
    rows.forEach(row => { settings[row.key] = row.value; });
    return settings;
  } catch {
    return {};
  }
}