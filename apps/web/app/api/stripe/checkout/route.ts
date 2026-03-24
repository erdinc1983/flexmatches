import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { billingCycle, userId, email } = await req.json();

    const priceId =
      billingCycle === "yearly"
        ? process.env.STRIPE_YEARLY_PRICE_ID!
        : process.env.STRIPE_MONTHLY_PRICE_ID!;

    // Get or create Stripe customer
    const { data: userData } = await supabaseAdmin
      .from("users")
      .select("stripe_customer_id")
      .eq("id", userId)
      .single();

    let customerId = userData?.stripe_customer_id as string | undefined;

    if (!customerId) {
      const customer = await stripe.customers.create({ email, metadata: { supabase_user_id: userId } });
      customerId = customer.id;
      await supabaseAdmin.from("users").update({ stripe_customer_id: customerId }).eq("id", userId);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: { trial_period_days: 60, metadata: { supabase_user_id: userId } },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/app/pro?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/app/pro?canceled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
