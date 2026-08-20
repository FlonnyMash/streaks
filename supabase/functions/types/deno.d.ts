/** Minimal Deno globals used by Edge Functions (runtime is Deno, not Node). */
declare namespace Deno {
  namespace env {
    function get(key: string): string | undefined
  }

  function serve(
    handler: (request: Request) => Response | Promise<Response>,
  ): void
}
