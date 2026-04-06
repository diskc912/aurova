import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { amount } = await req.json();

    // Validate amount
    if (!amount || isNaN(amount) || amount < 20) {
      return NextResponse.json(
        { error: "Amount must be at least ₹20" },
        { status: 400 }
      );
    }

    const appId = process.env.CASHFREE_APP_ID;
    const secretKey = process.env.CASHFREE_SECRET_KEY;
    const environment = process.env.CASHFREE_ENVIRONMENT || "sandbox";

    if (!appId || !secretKey) {
      return NextResponse.json(
        { error: "Payment gateway is not configured on the server." },
        { status: 500 }
      );
    }

    // Use Orders API (Standard Checkout) instead of Links API
    const baseUrl =
      environment === "production"
        ? "https://api.cashfree.com/pg/orders"
        : "https://sandbox.cashfree.com/pg/orders";

    // Create a unique order ID
    const orderId = `order_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-client-id": appId,
        "x-client-secret": secretKey,
        "x-api-version": "2023-08-01",
      },
      body: JSON.stringify({
        order_id: orderId,
        order_amount: parseFloat(amount),
        order_currency: "INR",
        customer_details: {
          customer_id: `user_${Date.now()}`,
          customer_phone: "9999999999", 
          customer_name: "AutoCut Supporter",
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Cashfree Order Error Data:", data);
      return NextResponse.json(
        { error: data.message || "Failed to create payment order" },
        { status: 500 }
      );
    }

    // Return the session ID which is used by the frontend SDK
    return NextResponse.json({ 
      payment_session_id: data.payment_session_id,
      environment 
    });
  } catch (error) {
    console.error("Donate Endpoint Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
