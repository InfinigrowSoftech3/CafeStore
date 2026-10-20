export const getSampleOrders = () => {
  const now = Date.now();
  return [
    {
      _id: 'ticket_demo_101',
      orderNumber: 101,
      orderType: 'dine_in',
      tableNumber: 3,
      orderStatus: 'preparing',
      createdAt: new Date(now - 8 * 60 * 1000).toISOString(), // 8 mins ago
      customer: { name: 'Aarav Patel', phone: '9876543210' },
      notes: 'Less spicy, oat milk in latte',
      items: [
        {
          name: 'Artisan Flat White',
          quantity: 2,
          kitchenStation: 'BAR',
          variant: { name: 'Oat Milk Blend (8oz)' },
          addons: [{ name: 'Extra Espresso Shot' }],
          specialInstructions: 'Warm, not boiling',
        },
        {
          name: 'Avocado Sourdough Toast',
          quantity: 1,
          kitchenStation: 'KITCHEN',
          variant: null,
          addons: [{ name: 'Poached Farm Egg' }, { name: 'Greek Feta Cheese' }],
          specialInstructions: 'Poached egg soft runny yolk',
        },
      ],
    },
    {
      _id: 'ticket_demo_102',
      orderNumber: 102,
      orderType: 'counter',
      tableNumber: null,
      orderStatus: 'confirmed',
      createdAt: new Date(now - 3 * 60 * 1000).toISOString(), // 3 mins ago
      customer: { name: 'Priya Sharma', phone: '9822334455' },
      notes: '',
      items: [
        {
          name: 'Iced Spanish Latte',
          quantity: 1,
          kitchenStation: 'BAR',
          variant: { name: 'Iced (12oz)' },
          addons: [{ name: 'Salted Caramel Drizzle' }],
          specialInstructions: 'Easy ice',
        },
        {
          name: 'Truffle & Mushroom Croissant',
          quantity: 1,
          kitchenStation: 'BAKERY',
          variant: null,
          addons: [],
          specialInstructions: 'Warm toasted crisp',
        },
      ],
    },
    {
      _id: 'ticket_demo_103',
      orderNumber: 103,
      orderType: 'dine_in',
      tableNumber: 7,
      orderStatus: 'confirmed',
      createdAt: new Date(now - 14 * 60 * 1000).toISOString(), // 14 mins ago
      customer: { name: 'Kabir & Meera', phone: '9988776655' },
      notes: 'Celebrating birthday',
      items: [
        {
          name: 'Margherita Sourdough Pizza',
          quantity: 1,
          kitchenStation: 'KITCHEN',
          variant: { name: '12-inch Large' },
          addons: [{ name: 'Fresh Buffalo Burrata' }],
          specialInstructions: 'Well done crust',
        },
        {
          name: 'Cascara Citrus Sparkler',
          quantity: 2,
          kitchenStation: 'BAR',
          variant: null,
          addons: [],
          specialInstructions: '',
        },
        {
          name: 'Classic Espresso Tiramisu',
          quantity: 1,
          kitchenStation: 'DESSERT',
          variant: null,
          addons: [],
          specialInstructions: 'Keep chilled until pizza is finished',
        },
      ],
    },
    {
      _id: 'ticket_demo_104',
      orderNumber: 104,
      orderType: 'takeaway',
      tableNumber: null,
      orderStatus: 'ready',
      createdAt: new Date(now - 22 * 60 * 1000).toISOString(), // 22 mins ago (ready to pick up)
      customer: { name: 'Rohan Verma', phone: '9765432109' },
      notes: 'Pack in paper bag',
      items: [
        {
          name: 'Kyoto Ceremonial Matcha Tonic',
          quantity: 1,
          kitchenStation: 'BAR',
          variant: null,
          addons: [],
          specialInstructions: '',
        },
        {
          name: 'Fudgy Belgian Brownie',
          quantity: 2,
          kitchenStation: 'DESSERT',
          variant: null,
          addons: [],
          specialInstructions: 'Warmed with napkin',
        },
      ],
    },
  ];
};
