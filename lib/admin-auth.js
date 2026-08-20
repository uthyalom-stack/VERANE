import { cookies } from "next/headers";

const BRAND_ROLES = {
  UTHY: "UTHY_LUXURY",
  ALOMZIEE: "ALOMZIEE_FOOTIES",
};

export async function getAdminSession() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get("adminAuth")?.value;

  if (!authCookie) {
    return null;
  }

  try {
    const admin = JSON.parse(authCookie);

    if (!admin?.role || !admin?.brand || !admin?.name) {
      return null;
    }

    if (
      admin.role !== "UTHY" &&
      admin.role !== "ALOMZIEE" &&
      admin.role !== "SUPERADMIN"
    ) {
      return null;
    }

    if (
      admin.role === "UTHY" &&
      admin.brand !== BRAND_ROLES.UTHY
    ) {
      return null;
    }

    if (
      admin.role === "ALOMZIEE" &&
      admin.brand !== BRAND_ROLES.ALOMZIEE
    ) {
      return null;
    }

    if (
      admin.role === "SUPERADMIN" &&
      admin.brand !== "ALL"
    ) {
      return null;
    }

    return {
      role: admin.role,
      brand: admin.brand,
      name: admin.name,
      isSuperAdmin: admin.role === "SUPERADMIN",
    };
  } catch {
    return null;
  }
}

export async function requireAdmin() {
  const admin = await getAdminSession();

  if (!admin) {
    return {
      ok: false,
      admin: null,
    };
  }

  return {
    ok: true,
    admin,
  };
}

export async function requireBrandAdmin(brand) {
  const admin = await getAdminSession();

  if (!admin) {
    return {
      ok: false,
      admin: null,
    };
  }

  if (admin.role === "SUPERADMIN") {
    return {
      ok: false,
      admin,
    };
  }

  if (admin.brand !== brand) {
    return {
      ok: false,
      admin,
    };
  }

  return {
    ok: true,
    admin,
  };
}