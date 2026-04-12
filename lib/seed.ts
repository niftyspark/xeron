import { db } from './db';
import { subscriptions } from './schema';

async function seedSubscriptions() {
  const plans = [
    {
      planId: 'free',
      name: 'Free',
      price: 0,
      period: 'forever',
      tier: 'free',
      trialDays: null,
      features: [
        'Unlimited conversations',
        '20 built-in skills',
        'Memory storage (100 items)',
        'Basic model access',
        'Web3 wallet auth',
      ],
      limits: {
        messagesPerDay: 50,
        memories: 100,
        skills: 20,
      },
    },
    {
      planId: 'starter',
      name: 'Starter',
      price: 10,
      period: 'quarter',
      tier: 'starter',
      trialDays: 7,
      features: [
        'Everything in Free',
        '1000+ app integrations',
        'Memory storage (1,000)',
        'Priority models',
        'Basic support',
      ],
      limits: {
        messagesPerDay: 200,
        memories: 1000,
        skills: 50,
      },
    },
    {
      planId: 'pro',
      name: 'Pro',
      price: 30,
      period: 'quarter',
      tier: 'pro',
      trialDays: 7,
      features: [
        'Everything in Starter',
        'Unlimited memory',
        'All models access',
        'Custom skills',
        'Scheduled tasks',
        'Priority support',
      ],
      limits: {
        messagesPerDay: 1000,
        memories: -1,
        skills: 100,
      },
    },
    {
      planId: 'ultra',
      name: 'Ultra',
      price: 50,
      period: 'quarter',
      tier: 'ultra',
      trialDays: 7,
      features: [
        'Everything in Pro',
        'Unlimited everything',
        'Early access features',
        'Dedicated support',
        'API access',
      ],
      limits: {
        messagesPerDay: -1,
        memories: -1,
        skills: -1,
      },
    },
  ];

  console.log('Seeding subscription plans...');

  for (const plan of plans) {
    const existing = await db.query.subscriptions.findFirst({
      where: (subs, { eq }) => eq(subs.planId, plan.planId),
    });

    if (!existing) {
      await db.insert(subscriptions).values(plan).onConflictDoNothing();
      console.log(`Inserted plan: ${plan.name}`);
    } else {
      console.log(`Plan already exists: ${plan.name}`);
    }
  }

  console.log('Done seeding subscriptions!');
}

seedSubscriptions()
  .catch(console.error)
  .finally(() => process.exit(0));