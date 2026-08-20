declare module 'npm:@supabase/supabase-js@2' {
  export * from '@supabase/supabase-js'
}

declare module 'npm:web-push@3.6.7' {
  interface PushSubscription {
    endpoint: string
    keys: {
      p256dh: string
      auth: string
    }
  }

  interface RequestOptions {
    TTL?: number
    urgency?: 'very-low' | 'low' | 'normal' | 'high'
  }

  interface WebPushError extends Error {
    statusCode?: number
  }

  interface WebPush {
    setVapidDetails(subject: string, publicKey: string, privateKey: string): void
    sendNotification(
      subscription: PushSubscription,
      payload?: string | Uint8Array | null,
      options?: RequestOptions,
    ): Promise<unknown>
  }

  const webpush: WebPush
  export default webpush
}
