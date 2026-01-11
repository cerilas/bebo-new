import type { WebhookEvent } from '@clerk/nextjs/server';
import { headers } from 'next/headers';
import { Webhook } from 'svix';

import { db } from '@/libs/DB';
import { SmsService } from '@/libs/SmsService';
import { userSchema } from '@/models/Schema';

export async function POST(req: Request) {
  // You can find this in the Clerk Dashboard -> Webhooks -> choose the endpoint
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local');
  }

  // Get the headers
  const headerPayload = headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error occured', {
      status: 400,
    });
  }

  const { id } = evt.data;
  const eventType = evt.type;

  console.log(`Webhook with an ID of ${id} and type of ${eventType}`);

  if (eventType === 'user.created' || eventType === 'user.updated') {
    const { id, first_name, last_name, email_addresses, phone_numbers, image_url } = evt.data;
    const email = email_addresses?.[0]?.email_address;
    const phone = phone_numbers?.[0]?.phone_number;

    try {
      // Create or update user in database
      await db.insert(userSchema)
        .values({
          id,
          email,
          firstName: first_name,
          lastName: last_name,
          phone,
          imageUrl: image_url,
          artCredits: 1, // Default starting credits
        })
        .onConflictDoUpdate({
          target: [userSchema.id],
          set: {
            email,
            firstName: first_name,
            lastName: last_name,
            phone,
            imageUrl: image_url,
            updatedAt: new Date(),
          },
        });

      console.log(`User ${id} synced with DB`);
    } catch (error) {
      console.error('Error syncing user with DB:', error);
      return new Response('Error updating database', { status: 500 });
    }
  }

  if (eventType === 'sms.created') {
    const { to_phone_number, message } = evt.data;

    console.log('📨 Clerk SMS Webhook received:', {
      to: to_phone_number,
      message,
    });

    // Check if it's a verification code
    // Supports both formats:
    // 1. "Your verification code is 123456"
    // 2. "123456 is your verification code"
    const codeMatch = message.match(/Your verification code is (\d+)/)
      || message.match(/(\d+)\s+is your verification code/);

    if (codeMatch && codeMatch[1]) {
      console.log('✅ Verification code matched:', codeMatch[1]);

      const smsMessage = `Dogrulama kodunuz: ${codeMatch[1]}`;
      const result = await SmsService.sendSms(to_phone_number, smsMessage);

      console.log('🚀 SMS Service Result:', result);
    } else {
      console.warn('⚠️ No verification code found in message with regex /Your verification code is (\\d+)/');
      console.warn('Message was:', message);
    }
  }

  return new Response('', { status: 200 });
}
