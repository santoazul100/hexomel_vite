import Stripe from 'stripe';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const stripeSecret = process.env.STRIPE_SECRET_KEY;

async function testStripe() {
    console.log("🔍 Testing Stripe Connection...");
    console.log("Key starting with:", stripeSecret ? stripeSecret.substring(0, 10) + "..." : "MISSING");

    if (!stripeSecret) {
        console.error("❌ Error: STRIPE_SECRET_KEY is missing in .env");
        return;
    }

    const stripe = new Stripe(stripeSecret);

    try {
        // 1. Try to list something simple to verify the key
        console.log("📡 Verifying API key...");
        const balance = await stripe.balance.retrieve();
        console.log("✅ API Key is valid! Balance currency:", balance.available[0].currency);

        // 2. Try to create a dummy checkout session
        console.log("📦 Creating dummy checkout session...");
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'eur',
                    product_data: { name: 'Teste Hexomel' },
                    unit_amount: 1000,
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: 'http://localhost:3000/success',
            cancel_url: 'http://localhost:3000/cancel',
        });

        console.log("✅ Session created successfully!");
        console.log("🔗 URL:", session.url);
        console.log("\n✨ Stripe integration is 100% functional!");

    } catch (error) {
        console.error("❌ Stripe Test Failed:", error.message);
    }
}

testStripe();
