export const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: 'forever',
    features: [
      'Unlimited conversations',
      '20 built-in skills',
      'Memory storage (100 items)',
      'Basic model access',
      'Google Sign-In',
    ],
    limits: {
      messagesPerDay: 50,
      memories: 100,
      skills: 20,
    },
  },
  {
    id: 'starter',
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
    id: 'pro',
    name: 'Pro',
    price: 30,
    period: 'quarter',
    tier: 'pro',
    trialDays: 7,
    popular: true,
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
    id: 'ultra',
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
] as const;

export type PlanId = typeof PLANS[number]['id'];
