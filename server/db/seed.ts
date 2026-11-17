import { db, users, posts, reactions, replies } from './index';

export async function seedDatabase() {
  // Clear existing data in reverse dependency order
  await db.delete(replies);
  await db.delete(reactions);
  await db.delete(posts);
  await db.delete(users);

  const now = Date.now();
  const hour = 3600 * 1000;

  // Insert Users
  const seedUsers = [
    {
      id: 'usr_maya',
      username: 'maya_writes',
      displayName: 'Maya Chen',
      createdAt: new Date(now - 48 * hour),
    },
    {
      id: 'usr_alex',
      username: 'alexr',
      displayName: 'Alex Rivera',
      createdAt: new Date(now - 48 * hour),
    },
    {
      id: 'usr_jo',
      username: 'jopark',
      displayName: 'Jo Park',
      createdAt: new Date(now - 48 * hour),
    },
    {
      id: 'usr_dario',
      username: 'dario',
      displayName: 'Dario Castellano',
      createdAt: new Date(now - 48 * hour),
    },
  ];

  for (const u of seedUsers) {
    await db.insert(users).values(u);
  }

  // Insert Moments with staggered expiry
  const seedPosts = [
    {
      id: 'post_1',
      authorId: 'usr_maya',
      content: 'Left the group chat on read for a day. Nothing broke.',
      lifetimeHours: 168,
      createdAt: new Date(now - 8 * hour),
      expiresAt: new Date(now + 160 * hour), // Active, 160h left
    },
    {
      id: 'post_2',
      authorId: 'usr_alex',
      content: 'The best ideas I had this week arrived while I was waiting for the kettle.',
      lifetimeHours: 72,
      createdAt: new Date(now - 36 * hour),
      expiresAt: new Date(now + 36 * hour), // Ending soon (within 48h)
    },
    {
      id: 'post_3',
      authorId: 'usr_jo',
      content: 'A small reminder: you are allowed to outgrow the version of you that made the plan.',
      lifetimeHours: 24,
      createdAt: new Date(now - 12 * hour),
      expiresAt: new Date(now + 12 * hour), // Ending soon (within 48h)
    },
    {
      id: 'post_4',
      authorId: 'usr_dario',
      content: 'What is something you want to make less permanent?',
      lifetimeHours: 168,
      createdAt: new Date(now - 4 * hour),
      expiresAt: new Date(now + 164 * hour), // Active, 164h left
    },
  ];

  for (const p of seedPosts) {
    await db.insert(posts).values(p);
  }

  // Insert Reactions
  const seedReactions = [
    {
      id: 'rxn_1',
      postId: 'post_1',
      userId: 'usr_alex',
      kind: 'glow',
      createdAt: new Date(now - 7 * hour),
    },
    {
      id: 'rxn_2',
      postId: 'post_1',
      userId: 'usr_dario',
      kind: 'warm',
      createdAt: new Date(now - 6 * hour),
    },
    {
      id: 'rxn_3',
      postId: 'post_2',
      userId: 'usr_maya',
      kind: 'thought',
      createdAt: new Date(now - 30 * hour),
    },
    {
      id: 'rxn_4',
      postId: 'post_2',
      userId: 'usr_dario',
      kind: 'glow',
      createdAt: new Date(now - 25 * hour),
    },
    {
      id: 'rxn_5',
      postId: 'post_3',
      userId: 'usr_maya',
      kind: 'glow',
      createdAt: new Date(now - 10 * hour),
    },
    {
      id: 'rxn_6',
      postId: 'post_3',
      userId: 'usr_alex',
      kind: 'warm',
      createdAt: new Date(now - 8 * hour),
    },
    {
      id: 'rxn_7',
      postId: 'post_4',
      userId: 'usr_jo',
      kind: 'thought',
      createdAt: new Date(now - 3 * hour),
    },
    {
      id: 'rxn_8',
      postId: 'post_4',
      userId: 'usr_alex',
      kind: 'glow',
      createdAt: new Date(now - 2 * hour),
    },
  ];

  for (const r of seedReactions) {
    await db.insert(reactions).values(r);
  }

  // Insert Replies
  const seedReplies = [
    {
      id: 'rep_1',
      postId: 'post_1',
      authorId: 'usr_jo',
      content: 'Peace of mind is priceless.',
      createdAt: new Date(now - 5 * hour),
    },
    {
      id: 'rep_2',
      postId: 'post_2',
      authorId: 'usr_maya',
      content: 'Boiling water is the best thinking partner.',
      createdAt: new Date(now - 20 * hour),
    },
    {
      id: 'rep_3',
      postId: 'post_3',
      authorId: 'usr_dario',
      content: 'Needed to hear this today.',
      createdAt: new Date(now - 6 * hour),
    },
    {
      id: 'rep_4',
      postId: 'post_4',
      authorId: 'usr_alex',
      content: 'Group photos that look like corporate brochures.',
      createdAt: new Date(now - 1 * hour),
    },
  ];

  for (const rep of seedReplies) {
    await db.insert(replies).values(rep);
  }

  console.log(
    `Database seeded successfully: ${seedUsers.length} users, ${seedPosts.length} posts, ${seedReactions.length} reactions, ${seedReplies.length} replies.`
  );
}

// Auto-run if executed as script
const isMain = process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js');
if (isMain) {
  seedDatabase()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seed script error:', err);
      process.exit(1);
    });
}
