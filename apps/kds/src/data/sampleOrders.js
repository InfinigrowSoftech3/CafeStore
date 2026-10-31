export const getSampleOrders = () => {
  const now = Date.now();
  return [
    {
      _id: 'ticket_demo_1011',
      orderNumber: 1011,
      orderType: 'dine_in',
      tableNumber: 3,
      orderStatus: 'preparing',
      createdAt: new Date(now - 24 * 60 * 1000).toISOString(), // 24 mins ago (Delayed!)
      customer: { name: 'Dhruvil Kyada', phone: '9876543210' },
      notes: 'Less sugar, celebrate anniversary',
      items: [
        {
          name: 'Tiramisu Classico',
          quantity: 1,
          description: 'Classic Italian dessert with coffee-soaked savoiardi and rich mascarpone cream.',
          kitchenStation: 'DESSERT',
          variant: null,
          addons: [],
          specialInstructions: 'Dust with extra cocoa powder',
        },
        {
          name: 'Artisan Flat White',
          quantity: 2,
          description: 'Silky micro-foam poured over double ristretto espresso shots.',
          kitchenStation: 'BAR',
          variant: { name: 'Oat Milk Blend (8oz)' },
          addons: [{ name: 'Extra Espresso Shot' }],
          specialInstructions: 'Warm, not boiling',
        },
      ],
    },
    {
      _id: 'ticket_demo_1012',
      orderNumber: 1012,
      orderType: 'dine_in',
      tableNumber: 5,
      orderStatus: 'confirmed',
      createdAt: new Date(now - 8 * 60 * 1000).toISOString(), // 8 mins ago
      customer: { name: 'Aarav Patel', phone: '9822334455' },
      notes: 'No chili flakes on toast',
      items: [
        {
          name: 'Avocado Sourdough Toast',
          quantity: 1,
          description: 'Toasted artisan sourdough topped with crushed Hass avocado and micro-greens.',
          kitchenStation: 'KITCHEN',
          variant: null,
          addons: [{ name: 'Poached Farm Egg' }, { name: 'Greek Feta Cheese' }],
          specialInstructions: 'Poached egg soft runny yolk',
        },
        {
          name: 'Truffle & Mushroom Croissant',
          quantity: 1,
          description: 'Flaky French butter croissant filled with sautéed wild mushrooms and truffle cream.',
          kitchenStation: 'BAKERY',
          variant: null,
          addons: [],
          specialInstructions: 'Warm toasted crisp',
        },
      ],
    },
    {
      _id: 'ticket_demo_1013',
      orderNumber: 1013,
      orderType: 'takeaway',
      tableNumber: null,
      orderStatus: 'confirmed',
      createdAt: new Date(now - 4 * 60 * 1000).toISOString(), // 4 mins ago
      customer: { name: 'Priya Sharma', phone: '9988776655' },
      notes: 'Pack in paper bag with napkins',
      items: [
        {
          name: 'Iced Spanish Latte',
          quantity: 1,
          description: 'Chilled espresso combined with sweetened condensed milk and cold fresh milk.',
          kitchenStation: 'BAR',
          variant: { name: 'Iced (12oz)' },
          addons: [{ name: 'Salted Caramel Drizzle' }],
          specialInstructions: 'Easy ice',
        },
        {
          name: 'Fudgy Belgian Brownie',
          quantity: 2,
          description: 'Rich dark chocolate fudge brownie topped with sea salt flakes.',
          kitchenStation: 'DESSERT',
          variant: null,
          addons: [],
          specialInstructions: 'Warmed with napkin',
        },
      ],
    },
    {
      _id: 'ticket_demo_1014',
      orderNumber: 1014,
      orderType: 'dine_in',
      tableNumber: 7,
      orderStatus: 'ready',
      createdAt: new Date(now - 16 * 60 * 1000).toISOString(), // 16 mins ago (Ready)
      customer: { name: 'Kabir & Meera', phone: '9765432109' },
      notes: '',
      items: [
        {
          name: 'Margherita Sourdough Pizza',
          quantity: 1,
          description: 'Stone-baked pizza with San Marzano tomato sauce, fresh mozzarella & sweet basil.',
          kitchenStation: 'KITCHEN',
          variant: { name: '12-inch Large' },
          addons: [{ name: 'Fresh Buffalo Burrata' }],
          specialInstructions: 'Well done crust',
        },
        {
          name: 'Kyoto Ceremonial Matcha Tonic',
          quantity: 2,
          description: 'Ceremonial grade Japanese Uji matcha whisked over chilled tonic water and citrus.',
          kitchenStation: 'BAR',
          variant: null,
          addons: [],
          specialInstructions: '',
        },
      ],
    },
    {
      _id: 'ticket_demo_1015',
      orderNumber: 1015,
      orderType: 'dine_in',
      tableNumber: 2,
      orderStatus: 'completed',
      createdAt: new Date(now - 45 * 60 * 1000).toISOString(), // 45 mins ago (Completed)
      customer: { name: 'Rohan Verma', phone: '9811223344' },
      notes: '',
      items: [
        {
          name: 'Classic Club Sandwich',
          quantity: 1,
          description: 'Triple-decker sandwich with crisp lettuce, fresh tomatoes, and herb mayo.',
          kitchenStation: 'KITCHEN',
          variant: null,
          addons: [],
          specialInstructions: '',
        },
      ],
    },
  ];
};
