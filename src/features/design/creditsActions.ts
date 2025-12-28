'use server';

import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';

import { db } from '@/libs/DB';
import { userSchema } from '@/models/Schema';

/**
 * Get user's current art credits (Tasarım hakkı)
 */
export async function getUserArtCredits(): Promise<number> {
  const { userId } = await auth();

  if (!userId) {
    throw new Error('User not authenticated');
  }

  try {
    // Check if user exists
    const existingUser = await db
      .select({ artCredits: userSchema.artCredits })
      .from(userSchema)
      .where(eq(userSchema.id, userId))
      .limit(1);

    if (existingUser.length === 0) {
      // Create user with default credits (1)
      await db.insert(userSchema).values({
        id: userId,
        artCredits: 1,
      });
      return 1;
    }

    return existingUser[0]!.artCredits;
  } catch (error) {
    console.error('Error fetching user credits:', error);
    throw new Error('Failed to fetch user credits');
  }
}

/**
 * Decrement user's art credits by 1
 * Returns the new credit balance
 */
export async function decrementArtCredits(): Promise<number> {
  const { userId } = await auth();

  if (!userId) {
    throw new Error('User not authenticated');
  }

  try {
    // First, get current credits
    const currentCredits = await getUserArtCredits();

    if (currentCredits <= 0) {
      throw new Error('Insufficient credits');
    }

    // Decrement credits
    await db
      .update(userSchema)
      .set({ artCredits: currentCredits - 1 })
      .where(eq(userSchema.id, userId));

    return currentCredits - 1;
  } catch (error) {
    console.error('Error decrementing credits:', error);
    throw error;
  }
}

/**
 * Check if user has enough credits
 */
export async function hasEnoughCredits(): Promise<boolean> {
  try {
    const credits = await getUserArtCredits();
    return credits > 0;
  } catch (error) {
    console.error('Error checking credits:', error);
    return false;
  }
}
