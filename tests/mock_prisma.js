export const db = {
  users: [],
  products: [],
  collaborations: [],
  orders: [],
  savedAddresses: [],
  wishlists: [],
  siteSettings: [],
  orderBrandTrackings: [],
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
  db.orderBrandTrackings = [];
  db.shouldThrow = false;
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
  product: {
    create: async ({ data }) => {
      const newProduct = { id: data.id || `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, archivedAt: null, ...data };
      db.products.push(newProduct);
      return newProduct;
    },
    findUnique: async ({ where }) => {
      return db.products.find((p) => p.id === where.id) || null;
    },
    findFirst: async ({ where }) => {
      let list = db.products;
      if (where?.id) list = list.filter((p) => p.id === where.id);
      if (where?.brand) list = list.filter((p) => p.brand === where.brand);
      if (where?.archivedAt === null) list = list.filter((p) => p.archivedAt === null);
      if (where?.archivedAt && where.archivedAt.not !== undefined) list = list.filter((p) => p.archivedAt !== null);
      return list[0] || null;
    },
    findMany: async (query = {}) => {
      let list = db.products;
      const where = query?.where;
      if (where) {
        if (where.brand) list = list.filter((p) => p.brand === where.brand);
        if (where.archivedAt === null) list = list.filter((p) => (p.archivedAt ?? null) === null);
        if (where.archivedAt && where.archivedAt.not !== undefined) list = list.filter((p) => p.archivedAt !== null);
      }
      return list;
    },
    update: async ({ where, data }) => {
      const prod = db.products.find((p) => p.id === where.id);
      if (prod) {
        Object.assign(prod, data);
      }
      return prod;
    },
    delete: async ({ where }) => {
      const idx = db.products.findIndex((p) => p.id === where.id);
      if (idx !== -1) {
        return db.products.splice(idx, 1)[0];
      }
      return null;
    },
  },
  collaboration: {
    findMany: async () => {
      return db.collaborations;
    },
  },
  order: {
    findUnique: async ({ where }) => {
      let ord = null;
      if (where?.id) ord = db.orders.find((o) => o.id === where.id) || null;
      else if (where?.orderNumber) ord = db.orders.find((o) => o.orderNumber === where.orderNumber) || null;

      if (ord) {
        return {
          ...ord,
          brandTrackings: db.orderBrandTrackings.filter((bt) => bt.orderId === ord.id),
        };
      }
      return null;
    },
    findMany: async ({ where }) => {
      let list = db.orders;
      if (where?.userId) {
        list = db.orders.filter((o) => o.userId === where.userId);
      }
      return list.map((ord) => ({
        ...ord,
        brandTrackings: db.orderBrandTrackings.filter((bt) => bt.orderId === ord.id),
      }));
    },
    findFirst: async ({ where }) => {
      let ord = null;
      if (where?.OR) {
        ord = db.orders.find((o) => where.OR.some((cond) => (cond.id && o.id === cond.id) || (cond.orderNumber && o.orderNumber === cond.orderNumber))) || null;
      } else if (where?.id && where?.userId) {
        ord = db.orders.find((o) => o.id === where.id && o.userId === where.userId) || null;
      } else if (where?.id) {
        ord = db.orders.find((o) => o.id === where.id) || null;
      }
      if (ord) {
        return {
          ...ord,
          brandTrackings: db.orderBrandTrackings.filter((bt) => bt.orderId === ord.id),
        };
      }
      return null;
    },
    create: async ({ data }) => {
      let itemsArray = [];
      if (data.items?.create) {
        itemsArray = data.items.create.map((it, idx) => ({
          id: `item_${Date.now()}_${idx}`,
          ...it,
          product: db.products.find((p) => p.id === it.productId) || null,
        }));
      }
      const newOrder = {
        id: data.id || `ord_${Date.now()}`,
        ...data,
        items: itemsArray,
      };
      db.orders.push(newOrder);
      return newOrder;
    },
  },
  orderBrandTracking: {
    upsert: async ({ where, update, create }) => {
      const { orderId, brand } = where.orderId_brand;
      let existing = db.orderBrandTrackings.find(
        (bt) => bt.orderId === orderId && bt.brand === brand
      );
      if (existing) {
        Object.assign(existing, update);
        return existing;
      } else {
        const newRecord = {
          id: `obt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          ...create,
        };
        db.orderBrandTrackings.push(newRecord);
        return newRecord;
      }
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
    findUnique: async ({ where }) => {
      if (where?.key) {
        return db.siteSettings.find((s) => s.key === where.key) || null;
      }
      return null;
    },
    findMany: async () => {
      return db.siteSettings || [];
    },
    findFirst: async () => {
      return db.siteSettings[0] || null;
    },
    create: async ({ data }) => {
      const idx = db.siteSettings.findIndex((s) => s.key === data.key);
      if (idx !== -1) {
        db.siteSettings[idx] = { id: `ss_${data.key}`, ...data };
        return db.siteSettings[idx];
      }
      const newSetting = { id: `ss_${data.key}`, ...data };
      db.siteSettings.push(newSetting);
      return newSetting;
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
