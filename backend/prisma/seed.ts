import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const password = await bcrypt.hash('Password123!', 10);

  const users = await Promise.all(
    [
      { name: 'Admin User', email: 'admin@erp.local', role: 'ADMIN' as const },
      { name: 'Sales User', email: 'sales@erp.local', role: 'SALES' as const },
      { name: 'Warehouse User', email: 'warehouse@erp.local', role: 'WAREHOUSE' as const },
      { name: 'Accounts User', email: 'accounts@erp.local', role: 'ACCOUNTS' as const },
    ].map((u) =>
      prisma.user.upsert({
        where: { email: u.email },
        update: {},
        create: { ...u, passwordHash: password },
      })
    )
  );

  console.log(
    'Seeded users (all passwords = Password123!):',
    users.map((u) => `${u.email} [${u.role}]`)
  );

  const customer = await prisma.customer.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Rajesh Traders',
      mobile: '9876543210',
      email: 'rajesh.traders@example.com',
      businessName: 'Rajesh Traders Pvt Ltd',
      gstNumber: '21ABCDE1234F1Z5',
      customerType: 'WHOLESALE',
      address: 'MG Road, Cuttack, Odisha',
      status: 'ACTIVE',
    },
  });

  const product = await prisma.product.upsert({
    where: { sku: 'SKU-0001' },
    update: {},
    create: {
      name: 'Steel Bucket 15L',
      sku: 'SKU-0001',
      category: 'Household',
      unitPrice: 250.0,
      currentStock: 100,
      minStockAlert: 20,
      location: 'Warehouse A - Rack 3',
    },
  });

  console.log('Seeded sample customer:', customer.name);
  console.log('Seeded sample product:', product.name);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
