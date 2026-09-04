export const db = {
  users: [],
  orders: [],
  savedAddresses: [],
  wishlists: [],
  siteSettings: [],
};

export function resetDb() {
  db.users = [];
  db.orders = [];
  db.savedAddresses = [];
  db.wishlists = [];
  db.siteSettings = [];
}

const mockPrisma = {
  user: {
    findUnique: async ({ where }) => {
      if (where.id) return db.users.find((u) => u.id === where.id) || null;
      if (where.email) return db.users.find((u) => u.email === where.email) || null;
      return null;
    },
    create: async ({ data }) => {
      const newUser = { id: data.id || `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, ...data };
      db.users.push(newUser);
      return newUser;
    },
  },
  order: {
    findUnique: async ({ where }) => {
      if (where?.id) return db.orders.find((o) => o.id === where.id) || null;
      if (where?.orderNumber) return db.orders.find((o) => o.orderNumber === where.orderNumber) || null;
      return null;
    },
    findMany: async ({ where }) => {
      if (where?.userId) {
        return db.orders.filter((o) => o.userId === where.userId);
      }
      return db.orders;
    },
    findFirst: async ({ where }) => {
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
      const newOrder = { id: data.id || `ord_${Date.now()}`, ...data };
      db.orders.push(newOrder);
      return newOrder;
    },
  },
  savedAddress: {
    findMany: async ({ where }) => {
      if (where?.userId) {
        return db.savedAddresses.filter((a) => a.userId === where.userId);
      }
      return db.savedAddresses;
    },
    findFirst: async ({ where }) => {
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
      if (where?.userId) {
        return db.savedAddresses.filter((a) => a.userId === where.userId).length;
      }
      return db.savedAddresses.length;
    },
    create: async ({ data }) => {
      const newAddr = { id: data.id || `addr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, ...data };
      db.savedAddresses.push(newAddr);
      return newAddr;
    },
    update: async ({ where, data }) => {
      const addr = db.savedAddresses.find((a) => a.id === where.id);
      if (addr) {
        Object.assign(addr, data);
      }
      return addr;
    },
    updateMany: async ({ where, data }) => {
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
      return db.siteSettings || [];
    },
    findFirst: async () => {
      return db.siteSettings[0] || null;
    },
  },
  wishlist: {
    findMany: async ({ where }) => {
      if (where?.userId) {
        return db.wishlists.filter((w) => w.userId === where.userId);
      }
      return db.wishlists;
    },
    findUnique: async ({ where }) => {
      if (where?.userId_productId) {
        return db.wishlists.find((w) => w.userId === where.userId_productId.userId && w.productId === where.userId_productId.productId) || null;
      }
      return null;
    },
    create: async ({ data }) => {
      const newWish = { id: data.id || `wish_${Date.now()}`, ...data };
      db.wishlists.push(newWish);
      return newWish;
    },
    delete: async ({ where }) => {
      const idx = db.wishlists.findIndex((w) => w.id === where.id);
      if (idx !== -1) {
        return db.wishlists.splice(idx, 1)[0];
      }
      return null;
    },
  },
  $transaction: async (arg) => {
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
