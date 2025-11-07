import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno'
import { getSupabaseClient } from '../_shared/supabase.ts'
import { createErrorResponse, createSuccessResponse, corsHeaders } from '../_shared/responses.ts'
import { logger } from '../_shared/logger.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const signature = req.headers.get('stripe-signature')
    if (!signature) {
      return createErrorResponse('Missing stripe-signature header')
    }

    const body = await req.text()
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)

    const supabase = getSupabaseClient()

    logger.info('Processing Stripe event', { type: event.type })

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        // Create subscription record
        await supabase.from('subscriptions').insert({
          user_id: session.metadata?.user_id,
          org_id: session.metadata?.org_id,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          plan: session.metadata?.plan || 'pro',
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })

        logger.info('Created subscription', { plan: session.metadata?.plan })
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        
        await supabase
          .from('subscriptions')
          .update({
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id)

        logger.info('Updated subscription', { status: subscription.status })
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        
        await supabase
          .from('subscriptions')
          .update({ status: 'cancelled' })
          .eq('stripe_subscription_id', subscription.id)

        logger.info('Cancelled subscription')
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        
        // Log payment
        await supabase.from('payments').insert({
          stripe_invoice_id: invoice.id,
          stripe_customer_id: invoice.customer as string,
          amount: invoice.amount_paid,
          currency: invoice.currency,
          status: 'succeeded',
          paid_at: new Date(invoice.status_transitions.paid_at! * 1000).toISOString(),
        })

        logger.info('Logged payment', { amount: invoice.amount_paid, currency: invoice.currency })
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        
        await supabase.from('payments').insert({
          stripe_invoice_id: invoice.id,
          stripe_customer_id: invoice.customer as string,
          amount: invoice.amount_due,
          currency: invoice.currency,
          status: 'failed',
        })

        // TODO: Send notification email to user about failed payment
        logger.warn('Payment failed', { amount: invoice.amount_due })
        break
      }

      default:
        logger.debug('Unhandled event type', { type: event.type })
    }

    return createSuccessResponse({ received: true })
  } catch (err) {
    logger.error('Webhook error', err)
    return createErrorResponse(
      'Webhook handler failed',
      err instanceof Error ? err.message : 'Unknown error'
    )
  }
})
