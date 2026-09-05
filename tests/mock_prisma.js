export const db = {
  users: [],
  orders: [],
  savedAddresses: [],
  wishlists: [],
  siteSettings: [],
  deliveryStates: [],
  deliveryLocations: [],
  products: [],
  productVariants: [],
  collaborationProducts: [],
  collaborationVariants: [],
  shouldThrow: false,
};

/**
 * Reset the in-memory database to its initial empty state.
 */
export function resetDb() {
  db.users = [];
  db.orders = [];
  db.savedAddresses = [];
  db.wishlists = [];
  db.siteSettings = [];
  db.deliveryStates = [];
  db.deliveryLocations = [];
  db.products = [];
  db.productVariants = [];
  db.collaborationProducts = [];
  db.collaborationVariants = [];
  db.shouldThrow = false;
}

function checkThrow() {
  if (db.shouldThrow) {
    throw new Error("Simulated Database Error: Connection lost.");
  }
}

const mockPrisma = {
  user: {
    findUnique: async ({ where }) => {
      checkThrow();
      if (where.id) return db.users.find((u) => u.id === where.id) || null;
      if (where.email) return db.users.find((u) => u.email === where.email) || null;
      return null;
    },
    create: async ({ data }) => {
      checkThrow();
      const newUser = { id: data.id || `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, ...data };
      db.users.push(newUser);
      return newUser;
    },
  },
  product: {
    findUnique: async ({ where }) => {
      checkThrow();
      if (where.id) return db.products.find((p) => p.id === where.id) || null;
      return null;
    },
  },
  productVariant: {
    findUnique: async ({ where }) => {
      checkThrow();
      if (where.id) return db.productVariants.find((v) => v.id === where.id) || null;
      return null;
    },
  },
  collaborationProduct: {
    findUnique: async ({ where }) => {
      checkThrow();
      if (where.id) return db.collaborationProducts.find((cp) => cp.id === where.id) || null;
      return null;
    },
  },
  collaborationVariant: {
    findUnique: async ({ where }) => {
      checkThrow();
      if (where.id) return db.collaborationVariants.find((cv) => cv.id === where.id) || null;
      return null;
    },
  },
  order: {
    findUnique: async ({ where }) => {
      checkThrow();
      if (where?.id) return db.orders.find((o) => o.id === where.id) || null;
      if (where?.orderNumber) return db.orders.find((o) => o.orderNumber === where.orderNumber) || null;
      return null;
    },
    findMany: async ({ where }) => {
      checkThrow();
      if (where?.userId) {
        return db.orders.filter((o) => o.userId === where.userId);
      }
      return db.orders;
    },
    findFirst: async ({ where }) => {
      checkThrow();
      if (where?.OR) {
        return db.orders.find((o) => where.OR.some((cond) => (cond.id && o.id === cond.id) || (cond.orderNumber && o.orderNumber === cond.orderNumber))) || null;
      }
      if (where?.id && where?.userId) {
        return db.orders.find((o) => o.id === where.id && o.userId === where.userId) || null;
      }
      if (where?.id) {
        return db.orders.find((o) => o.id === where.id) || null;
      }
      return null;
    },
    create: async ({ data }) => {
      checkThrow();
      const orderId = data.id || `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const createdItems = (data.items?.create || []).map((it, idx) => ({
        id: `item_${Date.now()}_${idx}`,
        orderId,
        ...it,
      }));

      const newOrder = {
        ...data,
        id: orderId,
        items: createdItems,
      };
      db.orders.push(newOrder);
      return newOrder;
    },
  },
  savedAddress: {
    findMany: async ({ where }) => {
      checkThrow();
      if (where?.userId) {
        return db.savedAddresses.filter((a) => a.userId === where.userId);
      }
      return db.savedAddresses;
    },
    findFirst: async ({ where }) => {
      checkThrow();
      if (where?.id && where?.userId) {
        return db.savedAddresses.find((a) => a.id === where.id && a.userId === where.userId) || null;
      }
      if (where?.id) {
        return db.savedAddresses.find((a) => a.id === where.id) || null;
      }
      if (where?.userId) {
        return db.savedAddresses.find((a) => a.userId === where.userId) || null;
      }
      return null;
    },
    count: async ({ where }) => {
      checkThrow();
      if (where?.userId) {
        return db.savedAddresses.filter((a) => a.userId === where.userId).length;
      }
      return db.savedAddresses.length;
    },
    create: async ({ data }) => {
      checkThrow();
      const newAddr = { id: data.id || `addr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, ...data };
      db.savedAddresses.push(newAddr);
      return newAddr;
    },
    update: async ({ where, data }) => {
      checkThrow();
      const addr = db.savedAddresses.find((a) => a.id === where.id);
      if (addr) {
        Object.assign(addr, data);
      }
      return addr;
    },
    updateMany: async ({ where, data }) => {
      checkThrow();
      let count = 0;
      for (const addr of db.savedAddresses) {
        if (!where?.userId || addr.userId === where.userId) {
          Object.assign(addr, data);
          count++;
        }
      }
      return { count };
    },
    delete: async ({ where }) => {
      checkThrow();
      const idx = db.savedAddresses.findIndex((a) => a.id === where.id);
      if (idx !== -1) {
        const deleted = db.savedAddresses.splice(idx, 1)[0];
        return deleted;
      }
      return null;
    },
  },
  siteSetting: {
    findMany: async () => {
      checkThrow();
      return db.siteSettings || [];
    },
    findFirst: async () => {
      checkThrow();
      return db.siteSettings[0] || null;
    },
  },
  deliveryState: {
    findUnique: async ({ where }) => {
      checkThrow();
      if (where?.state) {
        return db.deliveryStates.find((ds) => ds.state.toLowerCase() === where.state.toLowerCase()) || null;
      }
      return null;
    },
    findMany: async () => {
      checkThrow();
      return db.deliveryStates;
    },
  },
  deliveryLocation: {
    findMany: async () => {
      checkThrow();
      return db.deliveryLocations;
    },
    findFirst: async ({ where }) => {
      checkThrow();
      if (where?.country?.equals) {
        return db.deliveryLocations.find((dl) => dl.country.toLowerCase() === where.country.equals.toLowerCase()) || null;
      }
      return null;
    },
  },
  wishlist: {
    findMany: async ({ where }) => {
      checkThrow();
      if (where?.userId) {
        return db.wishlists.filter((w) => w.userId === where.userId);
      }
      return db.wishlists;
    },
    findUnique: async ({ where }) => {
      checkThrow();
      if (where?.userId_productId) {
        return db.wishlists.find((w) => w.userId === where.userId_productId.userId && w.productId === where.userId_productId.productId) || null;
      }
      return null;
    },
    create: async ({ data }) => {
      checkThrow();
      const newWish = { id: data.id || `wish_${Date.now()}`, ...data };
      db.wishlists.push(newWish);
      return newWish;
    },
    delete: async ({ where }) => {
      checkThrow();
      const idx = db.wishlists.findIndex((w) => w.id === where.id);
      if (idx !== -1) {
        return db.wishlists.splice(idx, 1)[0];
      }
      return null;
    },
  },
  $transaction: async (arg) => {
    checkThrow();
    if (typeof arg === "function") {
      return arg(mockPrisma);
    }
    if (Array.isArray(arg)) {
      return Promise.all(arg);
    }
    return null;
  },
};

export default mockPrisma;
