// Scout Reddit Edge Function
// TODO: Implement Reddit monitoring logic

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
    return new Response(JSON.stringify({ message: "Scout Reddit placeholder" }), {
        headers: { "Content-Type": "application/json" },
    })
})
