import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Tenant from '../models/Tenant.js';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import { runWithSystemTenantAccess, runWithTenant } from '../utils/tenantContext.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const CAFE_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const normalizeName = (value) => String(value || '').trim().toLowerCase();

// Product currently has one popularity flag (`popular`). The existing customer
// cards render that flag as BESTSELLER, so B products set the same field.
const MENU_GROUPS = [
  {
    name: 'Hot Coffee',
    icon: '☕',
    kitchenStation: 'BAR',
    items: [
      {
        name: 'Classic Espresso',
        description: 'Double shot of freshly ground beans, bold and syrupy with a golden crema.',
        price: 120,
        prepTime: 5,
      },
      {
        name: 'Cappuccino',
        description: 'Espresso with steamed milk and thick velvety foam, dusted with cocoa.',
        price: 160,
        prepTime: 8,
        popular: true,
      },
      {
        name: 'Caffè Latte',
        description: 'Smooth espresso with silky steamed milk and a light layer of foam.',
        price: 170,
        prepTime: 8,
      },
      {
        name: 'Hazelnut Latte',
        description: 'Espresso and steamed milk sweetened with roasted hazelnut syrup.',
        price: 200,
        prepTime: 10,
      },
      {
        name: 'Caramel Macchiato',
        description: 'Vanilla milk, espresso and a buttery caramel drizzle.',
        price: 210,
        prepTime: 10,
        popular: true,
        bestseller: true,
      },
      {
        name: 'Mocha',
        description: 'Espresso, rich dark chocolate and steamed milk topped with cream.',
        price: 200,
        prepTime: 10,
      },
    ],
  },
  {
    name: 'Cold Coffee',
    icon: '🥤',
    kitchenStation: 'BAR',
    items: [
      {
        name: 'Iced Americano',
        description: 'Double espresso over ice and cold water, crisp and refreshing.',
        price: 150,
        prepTime: 5,
      },
      {
        name: 'Cold Brew',
        description: 'Steeped for 18 hours for a smooth, low-acid finish.',
        price: 190,
        prepTime: 5,
        popular: true,
        bestseller: true,
      },
      {
        name: 'Iced Caramel Latte',
        description: 'Chilled espresso and milk with caramel over ice.',
        price: 210,
        prepTime: 7,
      },
      {
        name: 'Classic Cold Coffee',
        description: 'Thick blended cold coffee with a scoop of vanilla ice cream.',
        price: 180,
        prepTime: 7,
        popular: true,
      },
    ],
  },
  {
    name: 'Tea and More',
    icon: '🍵',
    kitchenStation: 'BAR',
    items: [
      {
        name: 'Masala Chai',
        description: 'Assam tea simmered with ginger, cardamom and warming spices.',
        price: 80,
        prepTime: 6,
      },
      {
        name: 'Matcha Latte',
        description: 'Ceremonial-grade matcha whisked with steamed milk.',
        price: 220,
        prepTime: 8,
      },
      {
        name: 'Hot Chocolate',
        description: 'Dark chocolate melted into steamed milk, finished with whipped cream.',
        price: 190,
        prepTime: 8,
      },
    ],
  },
  {
    name: 'Snacks',
    icon: '🥪',
    kitchenStation: 'KITCHEN',
    items: [
      {
        name: 'Veg Grilled Sandwich',
        description: 'Crisp toasted bread with vegetables, cheese and green chutney.',
        price: 140,
        prepTime: 12,
        popular: true,
      },
      {
        name: 'Peri Peri Fries',
        description: 'Crispy fries tossed in spicy peri peri seasoning with a creamy dip.',
        price: 130,
        prepTime: 10,
        popular: true,
      },
      {
        name: 'Paneer Tikka Wrap',
        description: 'Smoky paneer tikka, onions and mint mayo in a soft wrap.',
        price: 170,
        prepTime: 12,
      },
    ],
  },
  {
    name: 'Bakery and Desserts',
    icon: '🍰',
    kitchenStation: 'BAKERY',
    items: [
      {
        name: 'Butter Croissant',
        description: 'Flaky, golden and buttery, baked fresh every morning.',
        price: 110,
        prepTime: 5,
        popular: true,
      },
      {
        name: 'Chocolate Brownie with Ice Cream',
        description: 'Warm fudgy brownie topped with vanilla ice cream and chocolate sauce.',
        price: 160,
        prepTime: 7,
        bestseller: true,
        kitchenStation: 'DESSERT',
      },
      {
        name: 'Blueberry Cheesecake Slice',
        description: 'Creamy baked cheesecake on a biscuit base with blueberry compote.',
        price: 190,
        prepTime: 5,
      },
    ],
  },
];

function readArgs(argv) {
  const args = argv.slice(2);
  const valueFor = (name) => {
    const inline = args.find((arg) => arg.startsWith(`${name}=`));
    if (inline) return inline.slice(name.length + 1);
    const index = args.indexOf(name);
    return index >= 0 ? args[index + 1] : undefined;
  };

  return {
    cafe: String(valueFor('--cafe') || '').trim().toLowerCase(),
    yes: args.includes('--yes'),
    dryRun: args.includes('--dry-run'),
  };
}

function flagLabel(item) {
  const flags = [];
  if (item.popular) flags.push('P');
  if (item.bestseller) flags.push('B');
  return flags.length > 0 ? ` [${flags.join('+')}]` : '';
}

function buildPlan(existingCategories, existingProducts) {
  const categoryByName = new Map();
  for (const category of existingCategories) {
    const key = normalizeName(category.name);
    if (!categoryByName.has(key)) categoryByName.set(key, category);
  }

  const existingProductNames = new Set(existingProducts.map((product) => normalizeName(product.name)));
  const maxSortOrder = existingCategories.reduce(
    (max, category) => Math.max(max, Number(category.sortOrder) || 0),
    0
  );

  const missingGroups = MENU_GROUPS
    .filter((group) => !categoryByName.has(normalizeName(group.name)))
    .map((group, index) => ({ ...group, sortOrder: maxSortOrder + index + 1 }));

  const allItems = MENU_GROUPS.flatMap((group) =>
    group.items.map((item) => ({ ...item, group }))
  );

  return {
    missingGroups,
    toCreate: allItems.filter((item) => !existingProductNames.has(normalizeName(item.name))),
  };
}

async function main() {
  const { cafe, yes, dryRun } = readArgs(process.argv);

  if (!cafe) {
    console.error('Refusing to run: --cafe=<CAFE_SLUG> is required.');
    console.error('Example: npm run seed:products -- --cafe=brewhaus');
    return 1;
  }

  if (!CAFE_SLUG_PATTERN.test(cafe)) {
    console.error(`Refusing to run: "${cafe}" is not a valid café slug.`);
    return 1;
  }

  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is not configured. Add it to server/.env.');
  }

  await mongoose.connect(process.env.MONGO_URI, {
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 10000,
  });

  const databaseName = mongoose.connection.db.databaseName;
  const tenant = await runWithSystemTenantAccess(() =>
    Tenant.findOne({ slug: cafe })
      .select('name slug status settings.cafeName')
      .lean()
  );

  if (!tenant) {
    throw new Error(`Café "${cafe}" was not found in the tenants collection.`);
  }

  const cafeName = tenant.settings?.cafeName || tenant.name;

  console.log(`Database: ${databaseName}`);
  console.log(`Café: ${cafeName} (${tenant.slug})`);
  console.log(`Tenant ID: ${tenant._id}`);
  console.log(`Status: ${tenant.status}`);
  console.log('');

  await runWithTenant(tenant._id, async () => {
    const [existingCategories, existingProducts] = await Promise.all([
      Category.find().select('_id name sortOrder').lean(),
      Product.find().select('_id name category').lean(),
    ]);

    const plan = buildPlan(existingCategories, existingProducts);

    console.log(`Existing categories: ${existingCategories.length}`);
    console.log(`Existing products: ${existingProducts.length}`);
    console.log('');

    console.log(`Categories to create (${plan.missingGroups.length}):`);
    for (const group of plan.missingGroups) {
      console.log(`  + ${group.name} (icon: ${group.icon}, sortOrder: ${group.sortOrder})`);
    }
    if (plan.missingGroups.length === 0) console.log('  (none)');

    console.log('');
    console.log(`Products to create (${plan.toCreate.length}):`);
    for (const item of plan.toCreate) {
      console.log(
        `  + [${item.group.name}] ${item.name} — ₹${item.price} — ${item.prepTime} mins${flagLabel(item)}`
      );
    }
    if (plan.toCreate.length === 0) console.log('  (none)');

    console.log('');
    console.log(`Existing products left untouched (${existingProducts.length}):`);
    for (const product of existingProducts) {
      console.log(`  = ${product.name}`);
    }
    if (existingProducts.length === 0) console.log('  (none)');

    console.log('');

    if (!yes || dryRun) {
      console.log('DRY RUN — no writes performed.');
      console.log(`Re-run with --yes to create the items above:`);
      console.log(`  npm run seed:products -- --cafe=${tenant.slug} --yes`);
      return;
    }

    console.log('Writing missing categories and products...');

    const categoryIds = new Map();
    for (const category of existingCategories) {
      const key = normalizeName(category.name);
      if (!categoryIds.has(key)) categoryIds.set(key, category._id);
    }

    for (const group of plan.missingGroups) {
      const created = await Category.create({
        name: group.name,
        icon: group.icon,
        active: true,
        sortOrder: group.sortOrder,
      });
      categoryIds.set(normalizeName(group.name), created._id);
      console.log(`  ✅ Category created: ${group.name}`);
    }

    let createdProducts = 0;
    // The menu API sorts products by createdAt desc. Create in reverse so the
    // catalog order below is the order customers see inside each category.
    for (const item of [...plan.toCreate].reverse()) {
      const categoryId = categoryIds.get(normalizeName(item.group.name));
      if (!categoryId) {
        throw new Error(`Missing category "${item.group.name}" for product "${item.name}".`);
      }

      await Product.create({
        name: item.name,
        description: item.description,
        price: item.price,
        image: '',
        category: categoryId,
        available: true,
        popular: Boolean(item.popular || item.bestseller),
        prepTime: item.prepTime,
        isVeg: true,
        kitchenStation: item.kitchenStation || item.group.kitchenStation || 'KITCHEN',
      });
      createdProducts += 1;
      console.log(`  ✅ Product created: ${item.name}`);
    }

    console.log('');
    console.log(`Done. Categories created: ${plan.missingGroups.length}`);
    console.log(`Done. Products created: ${createdProducts}`);
    console.log(`Unchanged existing products: ${existingProducts.length}`);
  });

  return 0;
}

let exitCode;
try {
  exitCode = await main();
} catch (error) {
  console.error(`❌ Seed failed: ${error.message}`);
  exitCode = 1;
} finally {
  await mongoose.disconnect().catch(() => {});
}

process.exit(exitCode);
